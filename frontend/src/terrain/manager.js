/**
 * TerrainManager - Núcleo del sistema de terreno
 * 
 * Gestiona la carga, renderizado y actualización dinámica de partículas del terreno.
 * Similar en estructura a ECSManager pero enfocado en partículas modificables.
 */
import { ViewportSystem } from './systems/viewport-system.js';
import { StyleSystem } from './systems/style-system.js';
import { UpdateSystem } from './systems/update-system.js';
import { ParticleRenderer } from './renderers/particle-renderer.js';
// LODManager y ParticleLimiter se usan directamente en ParticleRenderer, no aquí
import { BloquesClient } from './api/bloques-client.js';
import { ParticlesClient } from './api/particles-client.js';
import { debugLogger } from '../debug/logger.js';
import {
    DYNAMIC_LOAD_RADIUS_CELLS,
    MOVEMENT_THRESHOLDS,
    OPERATION_INTERVALS,
    LOAD_LIMITS,
    LOG_INTERVALS,
    PROACTIVE_LOAD_DISTANCE
} from '../config/particle-optimization-config.js';

/**
 * @typedef {import('../types.js').Particle} Particle
 * @typedef {import('../types.js').ParticleStyle} ParticleStyle
 * @typedef {import('../types.js').TipoEstilosBD} TipoEstilosBD
 */

export class TerrainManager {
    /**
     * @param {THREE.Scene} scene - Escena Three.js
     * @param {Object} particlesApi - Cliente API para partículas
     * @param {Object} bloquesApi - Cliente API para bloques
     * @param {GeometryRegistry} geometryRegistry - Registry de geometrías
     * @param {PerformanceManager} performanceManager - Performance Manager (opcional)
     */
    constructor(scene, particlesApi, bloquesApi, geometryRegistry, performanceManager = null) {
        this.scene = scene;
        this.geometryRegistry = geometryRegistry;
        this.camera = null; // Cámara se establecerá después de la inicialización
        this.playerPositionGetter = null; // Función para obtener posición del jugador
        
        // Inicializar clientes API
        this.bloquesClient = new BloquesClient(bloquesApi);
        this.particlesClient = new ParticlesClient(particlesApi);
        
        // Inicializar sistemas
        this.viewportSystem = new ViewportSystem();
        this.styleSystem = new StyleSystem();
        
        // Las optimizaciones (LOD, ParticleLimiter) se usan directamente en ParticleRenderer
        
        // Sistema de actualización
        this.updateSystem = new UpdateSystem(this.particlesClient);
        
        // Renderer - Pasar PerformanceManager para adaptación dinámica
        this.renderer = new ParticleRenderer(geometryRegistry, performanceManager);
        
        // Cache de estado actual
        this.currentMeshes = new Map();
        this.currentParticles = new Map();
        this.currentTiposEstilos = new Map(); // Cachear tiposEstilos para re-renderizado
        this.currentDimension = null;
        
        // Control de re-renderizado
        this.lastPlayerPosition = null; // Última posición del jugador (en metros)
        this.rerenderThreshold = MOVEMENT_THRESHOLDS.rerender;
        this.lastRerenderTime = 0;
        this.rerenderInterval = OPERATION_INTERVALS.rerender;
        // Throttling ahora se maneja directamente en debugLogger
        // Configuración de carga dinámica (carga proactiva basada en distancia al borde)
        this.isLoadingParticles = false;
        this.lastLoadTime = 0;
        this.loadInterval = OPERATION_INTERVALS.load;
        
        // Rastreo del área cargada actual (para carga proactiva)
        this.loadedAreaCenter = null; // Posición central del área cargada {x, y, z}
        this.loadedAreaRadius = null; // Radio del área cargada (en metros)
    }
    
    /**
     * Cargar dimensión completa
     * @param {Object} dimension - Dimensión con propiedades
     * @returns {Promise<Object>} - Resultado con dimension, particles, meshes
     */
    async loadDimension(dimension) {
        // 1. Calcular viewport
        const viewport = this.viewportSystem.calculateViewport(dimension);
        
        // 2. Cargar partículas y estilos en paralelo
        const [particlesData, typesData] = await Promise.all([
            this.particlesClient.getParticles(dimension.id, viewport),
            this.particlesClient.getParticleTypes(dimension.id, viewport)
        ]);
        
        // 3. Cachear estilos y partículas
        this.styleSystem.cacheStyles(typesData.types);
        this.currentParticles = new Map(particlesData.particles.map(p => [p.id || `${p.celda_x}_${p.celda_y}_${p.celda_z}`, p]));
        
        // 4. Preparar tiposEstilos para renderizado (compatibilidad con estructura antigua)
        const tiposEstilos = new Map();
        typesData.types.forEach(tipo => {
            // Convertir nueva estructura (color, geometria, opacidad) a estructura antigua (estilos) para compatibilidad
            if (tipo.color || tipo.geometria || tipo.opacidad !== undefined) {
                const estilosCompat = {};
                if (tipo.color) {
                    // El color puede venir como nombre de color (ej: "brown", "blue") o como hex
                    // THREE.Color acepta ambos formatos, pero para compatibilidad guardamos como color_hex
                    // Si no empieza con #, asumimos que es un nombre de color y lo pasamos tal cual
                    // El parser de estilos manejará la conversión
                    estilosCompat.color = tipo.color;
                    estilosCompat.color_hex = tipo.color; // Simplificado: siempre usar el mismo valor
                }
                if (tipo.geometria) {
                    // Guardar geometria tanto en nueva estructura como en antigua para compatibilidad
                    estilosCompat.geometria = tipo.geometria;
                    estilosCompat.visual = {
                        geometria: tipo.geometria
                    };
                }
                // Agregar opacidad si está disponible
                if (tipo.opacidad !== undefined && tipo.opacidad !== null) {
                    if (!estilosCompat.visual) {
                        estilosCompat.visual = {};
                    }
                    estilosCompat.visual.opacity = tipo.opacidad;
                }
                tiposEstilos.set(tipo.nombre, estilosCompat);
            }
        });
        
        // 4.5. Guardar tiposEstilos para re-renderizado futuro
        this.currentTiposEstilos = tiposEstilos;
        
        // 5. Limpiar partículas anteriores
        if (this.currentMeshes.size > 0) {
            this.renderer.clearParticles(this.currentMeshes, this.scene);
        }
        
        // 6. Renderizar partículas
        // NOTA: Para el renderizado inicial, no tenemos cámara disponible todavía
        // Las optimizaciones (limitación con densidad) se aplicarán si hay cámara
        // Si no hay cámara, se renderizan todas las partículas (puede ser lento)
        const originalFrustumCulling = this.renderer.enableFrustumCulling;
        this.renderer.enableFrustumCulling = false; // Deshabilitar frustum culling en renderizado inicial
        
        // Usar cámara establecida o intentar obtener de la escena si está disponible
        const camera = this.camera || this.scene?.camera?.camera || null;
        
        // Obtener posición del jugador si está disponible (para renderizado inicial)
        let playerPositionInMeters = null;
        if (this.playerPositionGetter) {
            try {
                const playerPos = this.playerPositionGetter();
                if (playerPos) {
                    playerPositionInMeters = playerPos;
                }
            } catch (error) {
                // Ignorar error en carga inicial, aún no hay jugador
            }
        }
        
        const meshes = this.renderer.renderParticles(
            particlesData.particles,
            tiposEstilos,
            null, // agrupacionesGeometria (opcional)
            dimension.tamano_celda,
            this.scene,
            camera, // Cámara para frustum culling
            playerPositionInMeters // Posición del jugador para limitación por densidad
        );
        
        this.renderer.enableFrustumCulling = originalFrustumCulling;
        this.currentMeshes = meshes;
        
        // 7. Guardar dimensión actual
        this.currentDimension = dimension;
        
        // 8. Inicializar área cargada (centro del viewport inicial)
        const centerX = (viewport.x_max + viewport.x_min) / 2 * dimension.tamano_celda;
        const centerY = (viewport.y_max + viewport.y_min) / 2 * dimension.tamano_celda;
        const centerZ = (viewport.z_max + viewport.z_min) / 2 * dimension.tamano_celda;
        const radiusInMeters = Math.max(
            (viewport.x_max - viewport.x_min) / 2 * dimension.tamano_celda,
            (viewport.y_max - viewport.y_min) / 2 * dimension.tamano_celda,
            (viewport.z_max - viewport.z_min) / 2 * dimension.tamano_celda
        );
        this.loadedAreaCenter = { x: centerX, y: centerY, z: centerZ };
        this.loadedAreaRadius = radiusInMeters;
        
        return {
            dimension,
            particles: particlesData.particles,
            viewport,
            meshes
        };
    }
    
    /**
     * Establecer cámara para optimizaciones de renderizado
     * @param {THREE.Camera} camera - Cámara Three.js
     * @param {boolean} rerender - Si true, re-renderiza las partículas actuales con optimizaciones
     */
    setCamera(camera, rerender = true) {
        this.camera = camera;
        // Actualizar cámara en LOD manager si está disponible
        if (this.renderer && this.renderer.lodManager) {
            this.renderer.lodManager.camera = camera;
        }
        debugLogger.info('TerrainManager', 'Cámara establecida para optimizaciones', {
            cameraAvailable: !!camera,
            rerender: rerender
        });
        
        // Re-renderizar partículas actuales con optimizaciones si hay partículas cargadas
        if (rerender && camera && this.currentDimension && this.currentParticles.size > 0) {
            this.rerenderParticlesWithOptimizations();
        }
    }
    
    /**
     * Establecer función para obtener posición del jugador
     * @param {Function} getter - Función que retorna posición del jugador en metros: () => {x, y, z}
     */
    setPlayerPositionGetter(getter) {
        this.playerPositionGetter = getter;
        debugLogger.info('TerrainManager', 'PlayerPositionGetter configurado', {
            hasGetter: !!getter,
            type: typeof getter
        });
    }
    
    /**
     * Actualizar partículas según posición del jugador (para ser llamado desde el loop de animación)
     * Re-renderiza solo si el jugador se movió significativamente
     */
    async updateForPlayerMovement() {
        // Throttling ahora manejado directamente en debugLogger
        const now = performance.now();
        debugLogger.info('TerrainManager', 'updateForPlayerMovement llamado', {
            hasPlayerPositionGetter: !!this.playerPositionGetter,
            hasDimension: !!this.currentDimension,
            particlesCount: this.currentParticles.size
        }, { throttleMs: LOG_INTERVALS.debug });
        
        if (!this.playerPositionGetter) {
            return;
        }
        
        if (!this.currentDimension || this.currentParticles.size === 0) {
            return;
        }
        
        try {
            const currentPlayerPos = this.playerPositionGetter();
            if (!currentPlayerPos) {
                // Throttling ahora manejado directamente en debugLogger
                debugLogger.warn('TerrainManager', 'updateForPlayerMovement: PlayerPositionGetter retornó null/undefined', {}, { throttleMs: LOG_INTERVALS.debug });
                return;
            }
            
            const timeSinceLastRerender = now - this.lastRerenderTime;
            
            // Verificar si el jugador se movió significativamente
            let shouldRerender = false;
            if (!this.lastPlayerPosition) {
                // Primera vez, inicializar posición
                debugLogger.info('TerrainManager', 'Inicializando posición del jugador para seguimiento', {
                    position: currentPlayerPos
                });
                this.lastPlayerPosition = currentPlayerPos;
                return;
            }
            
            // Calcular distancia movida
            const dx = currentPlayerPos.x - this.lastPlayerPosition.x;
            const dy = currentPlayerPos.y - this.lastPlayerPosition.y;
            const dz = currentPlayerPos.z - this.lastPlayerPosition.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            // Re-renderizar si se movió más del threshold Y ha pasado suficiente tiempo
            if (distance >= this.rerenderThreshold && timeSinceLastRerender >= this.rerenderInterval) {
                shouldRerender = true;
            }
            
            // Log cuando hay movimiento (solo si se movió más de 0.5 metro o va a re-renderizar)
            // Throttling ahora manejado directamente en debugLogger
            const logMovementThreshold = 0.5; // Log solo si se movió más de 0.5 metro
            if (distance >= logMovementThreshold || shouldRerender) {
                debugLogger.info('TerrainManager', 'Jugador detectado en movimiento', {
                    distance: distance.toFixed(2),
                    currentPosition: {
                        x: currentPlayerPos.x.toFixed(2),
                        y: currentPlayerPos.y.toFixed(2),
                        z: currentPlayerPos.z.toFixed(2)
                    },
                    lastPosition: {
                        x: this.lastPlayerPosition.x.toFixed(2),
                        y: this.lastPlayerPosition.y.toFixed(2),
                        z: this.lastPlayerPosition.z.toFixed(2)
                    },
                    threshold: this.rerenderThreshold,
                    timeSinceLastRerender: timeSinceLastRerender.toFixed(0) + 'ms',
                    willRerender: shouldRerender
                }, { throttleMs: LOG_INTERVALS.movement });
            }
            
            // SIEMPRE actualizar lastPlayerPosition para que la comparación sea correcta en el siguiente frame
            // Esto evita que se acumule movimiento y se detecte falso movimiento
            this.lastPlayerPosition = currentPlayerPos;
            
            // Verificar si necesitamos cargar nuevas partículas del backend
            // NUEVA LÓGICA: Carga proactiva basada en distancia al borde del área cargada
            let shouldLoadNewParticles = false;
            let distanceToEdge = Infinity;
            
            if (!this.loadedAreaCenter || !this.loadedAreaRadius) {
                // Primera vez, inicializar área cargada
                this.loadedAreaCenter = {
                    x: currentPlayerPos.x,
                    y: currentPlayerPos.y,
                    z: currentPlayerPos.z
                };
                const cellSize = this.currentDimension?.tamano_celda || 0.25;
                this.loadedAreaRadius = DYNAMIC_LOAD_RADIUS_CELLS * cellSize; // Radio en metros
                shouldLoadNewParticles = true;
                debugLogger.info('TerrainManager', 'Inicializando área cargada', {
                    center: this.loadedAreaCenter,
                    radius: this.loadedAreaRadius.toFixed(2) + 'm'
                });
            } else {
                // Calcular distancia del jugador al borde del área cargada
                const dx = currentPlayerPos.x - this.loadedAreaCenter.x;
                const dy = currentPlayerPos.y - this.loadedAreaCenter.y;
                const dz = currentPlayerPos.z - this.loadedAreaCenter.z;
                const distanceFromCenter = Math.sqrt(dx * dx + dy * dy + dz * dz);
                distanceToEdge = this.loadedAreaRadius - distanceFromCenter;
                
                // Cargar si el jugador está cerca del borde (dentro de PROACTIVE_LOAD_DISTANCE)
                if (distanceToEdge <= PROACTIVE_LOAD_DISTANCE) {
                    shouldLoadNewParticles = true;
                    // Throttling integrado en debugLogger: solo loggear cada 2 segundos
                    debugLogger.info('TerrainManager', 'Jugador cerca del borde del área cargada, cargando nueva zona', {
                        distanceToEdge: distanceToEdge.toFixed(2) + 'm',
                        playerPosition: {
                            x: currentPlayerPos.x.toFixed(2),
                            y: currentPlayerPos.y.toFixed(2),
                            z: currentPlayerPos.z.toFixed(2)
                        },
                        loadedAreaCenter: {
                            x: this.loadedAreaCenter.x.toFixed(2),
                            y: this.loadedAreaCenter.y.toFixed(2),
                            z: this.loadedAreaCenter.z.toFixed(2)
                        },
                        loadedAreaRadius: this.loadedAreaRadius.toFixed(2) + 'm',
                        proactiveLoadDistance: PROACTIVE_LOAD_DISTANCE.toFixed(2) + 'm'
                    }, { throttleMs: 2000 });
                }
            }
            
            // Cargar nuevas partículas si es necesario
            if (shouldLoadNewParticles && this.currentDimension) {
                try {
                    await this.loadParticlesAroundPlayer(currentPlayerPos);
                } catch (error) {
                    debugLogger.error('TerrainManager', 'Error cargando partículas alrededor del jugador', {
                        error: error.message,
                        stack: error.stack
                    });
                }
            }
            
            // Re-renderizar si es necesario (solo para optimizaciones de densidad)
            if (shouldRerender) {
                debugLogger.info('TerrainManager', 'Jugador se movió, re-renderizando partículas con optimizaciones', {
                    distance: distance.toFixed(2),
                    from: {
                        x: (currentPlayerPos.x - dx).toFixed(2),
                        y: (currentPlayerPos.y - dy).toFixed(2),
                        z: (currentPlayerPos.z - dz).toFixed(2)
                    },
                    to: {
                        x: currentPlayerPos.x.toFixed(2),
                        y: currentPlayerPos.y.toFixed(2),
                        z: currentPlayerPos.z.toFixed(2)
                    },
                    timeSinceLastRerender: timeSinceLastRerender.toFixed(0) + 'ms'
                });
                
                this.lastRerenderTime = now;
                this.rerenderParticlesWithOptimizations();
            }
        } catch (error) {
            debugLogger.error('TerrainManager', 'Error en updateForPlayerMovement', {
                error: error.message,
                stack: error.stack
            });
        }
    }
    
    /**
     * Cargar partículas alrededor del jugador
     * @param {Object} playerPositionInMeters - Posición del jugador en metros {x, y, z}
     */
    async loadParticlesAroundPlayer(playerPositionInMeters) {
        if (!this.currentDimension) {
            debugLogger.warn('TerrainManager', 'No se pueden cargar partículas: sin dimensión');
            return;
        }
        
        // Evitar cargas simultáneas
            if (this.isLoadingParticles) {
                debugLogger.info('TerrainManager', 'Carga de partículas ya en progreso, saltando', {}, { throttleMs: LOG_INTERVALS.debug });
                return;
            }
        
        // Throttling: evitar cargar demasiado frecuentemente
        const now = performance.now();
        if (this.lastLoadTime && (now - this.lastLoadTime) < this.loadInterval) {
            const remainingTime = this.loadInterval - (now - this.lastLoadTime);
            debugLogger.info('TerrainManager', 'Carga de partículas en cooldown', {
                remainingMs: remainingTime.toFixed(0)
            });
            return;
        }
        
        this.isLoadingParticles = true;
        this.lastLoadTime = now;
        
        const cellSize = this.currentDimension.tamano_celda;
        
        // Calcular viewport alrededor del jugador
        // Ajustado para coincidir con las distancias de densidad (near: 50m = 200 celdas, far: 100m = 400 celdas)
        // Usar 250 celdas (62.5m) para cubrir bien el área de renderizado
        const radiusInCells = DYNAMIC_LOAD_RADIUS_CELLS;
        const cellX = Math.floor(playerPositionInMeters.x / cellSize);
        const cellY = Math.floor(playerPositionInMeters.y / cellSize);
        const cellZ = Math.floor(playerPositionInMeters.z / cellSize);
        
        // Calcular dimensiones en celdas desde las propiedades de la dimensión
        // La dimensión usa: ancho_metros, alto_metros, profundidad_maxima, altura_maxima
        // Convertir metros a celdas (asegurarse de que son números válidos)
        const anchoMetros = typeof this.currentDimension.ancho_metros === 'number' 
            ? this.currentDimension.ancho_metros 
            : 40;
        const altoMetros = typeof this.currentDimension.alto_metros === 'number' 
            ? this.currentDimension.alto_metros 
            : 40;
        
        const maxCellsX = Math.floor(anchoMetros / cellSize);
        const maxCellsY = Math.floor(altoMetros / cellSize);
        
        // Para Z: profundidad_maxima es negativo (ej: -100) y altura_maxima es positivo (ej: 100)
        // Estos límites ya están en celdas (no metros)
        const zMinLimit = typeof this.currentDimension.profundidad_maxima === 'number' 
            ? this.currentDimension.profundidad_maxima 
            : -100;
        const zMaxLimit = typeof this.currentDimension.altura_maxima === 'number' 
            ? this.currentDimension.altura_maxima 
            : 100;
        
        // Validar que los valores calculados sean válidos
        if (isNaN(maxCellsX) || maxCellsX <= 0) {
            debugLogger.error('TerrainManager', 'maxCellsX inválido', {
                anchoMetros: anchoMetros,
                cellSize: cellSize,
                maxCellsX: maxCellsX
            });
            return; // No continuar si los valores son inválidos
        }
        if (isNaN(maxCellsY) || maxCellsY <= 0) {
            debugLogger.error('TerrainManager', 'maxCellsY inválido', {
                altoMetros: altoMetros,
                cellSize: cellSize,
                maxCellsY: maxCellsY
            });
            return;
        }
        
        // Calcular viewport centrado en el jugador
        // Asegurarse de que los valores sean números válidos
        const xMin = Math.max(0, Math.floor(cellX - radiusInCells));
        let xMax = Math.min(maxCellsX - 1, Math.floor(cellX + radiusInCells));
        const yMin = Math.max(0, Math.floor(cellY - radiusInCells));
        let yMax = Math.min(maxCellsY - 1, Math.floor(cellY + radiusInCells));
        const zMin = Math.max(zMinLimit, Math.floor(cellZ - radiusInCells));
        let zMax = Math.min(zMaxLimit, Math.floor(cellZ + radiusInCells));
        
        // Validar que el viewport sea válido (x_max >= x_min, etc.)
        if (xMax < xMin || isNaN(xMax)) {
            xMax = Math.min(maxCellsX - 1, xMin + radiusInCells * 2);
        }
        if (yMax < yMin || isNaN(yMax)) {
            yMax = Math.min(maxCellsY - 1, yMin + radiusInCells * 2);
        }
        if (zMax < zMin || isNaN(zMax)) {
            zMax = Math.min(zMaxLimit, zMin + radiusInCells * 2);
        }
        
        // Asegurarse de que todos los valores finales sean números enteros válidos
        const viewport = {
            x_min: Math.floor(xMin),
            x_max: Math.floor(xMax),
            y_min: Math.floor(yMin),
            y_max: Math.floor(yMax),
            z_min: Math.floor(zMin),
            z_max: Math.floor(zMax)
        };
        
        // Validación final
        if (isNaN(viewport.x_max) || isNaN(viewport.y_max) || isNaN(viewport.z_max) ||
            viewport.x_max === null || viewport.y_max === null || viewport.z_max === null) {
            debugLogger.error('TerrainManager', 'Viewport inválido después de cálculos', {
                viewport: viewport,
                dimension: {
                    ancho_metros: this.currentDimension.ancho_metros,
                    alto_metros: this.currentDimension.alto_metros,
                    profundidad_maxima: this.currentDimension.profundidad_maxima,
                    altura_maxima: this.currentDimension.altura_maxima,
                    tamano_celda: cellSize
                },
                playerCell: { x: cellX, y: cellY, z: cellZ },
                maxCells: { x: maxCellsX, y: maxCellsY }
            });
            return; // No continuar si el viewport es inválido
        }
        
        // Validar viewport usando ViewportSystem para asegurar que no exceda límites
        const viewportCells = (viewport.x_max - viewport.x_min + 1) * 
                             (viewport.y_max - viewport.y_min + 1) * 
                             (viewport.z_max - viewport.z_min + 1);
        
        if (!this.viewportSystem.validateViewport(viewport)) {
            debugLogger.warn('TerrainManager', 'Viewport excede límite de celdas, reduciendo tamaño', {
                viewportCells: viewportCells,
                maxCells: this.viewportSystem.maxCells,
                viewport: viewport
            });
            // Ajustar viewport reduciendo principalmente Z (altura es menos crítica para movimiento horizontal)
            // Mantener X e Y pero reducir Z para optimizar carga
            const zRange = viewport.z_max - viewport.z_min + 1;
            const newZRange = Math.floor(zRange * 0.5); // Reducir Z a la mitad
            const zCenter = Math.floor((viewport.z_min + viewport.z_max) / 2);
            viewport.z_min = Math.max(zMinLimit, zCenter - Math.floor(newZRange / 2));
            viewport.z_max = Math.min(zMaxLimit, zCenter + Math.floor(newZRange / 2));
            
            // Si aún excede, reducir también X e Y
            const newViewportCells = (viewport.x_max - viewport.x_min + 1) * 
                                   (viewport.y_max - viewport.y_min + 1) * 
                                   (viewport.z_max - viewport.z_min + 1);
            if (newViewportCells > this.viewportSystem.maxCells) {
                const adjustedRadius = Math.floor(radiusInCells * 0.75); // Reducir 25%
                const newXMin = Math.max(0, cellX - adjustedRadius);
                const newXMax = Math.min(maxCellsX - 1, cellX + adjustedRadius);
                const newYMin = Math.max(0, cellY - adjustedRadius);
                const newYMax = Math.min(maxCellsY - 1, cellY + adjustedRadius);
                viewport.x_min = newXMin;
                viewport.x_max = newXMax;
                viewport.y_min = newYMin;
                viewport.y_max = newYMax;
            }
        }
        
        debugLogger.info('TerrainManager', 'Cargando partículas alrededor del jugador', {
            playerCell: { x: cellX, y: cellY, z: cellZ },
            viewport: viewport,
            radiusInCells: radiusInCells,
            estimatedCells: viewportCells
        });
        
        try {
            // Cargar partículas y tipos del área alrededor del jugador
            const loadStartTime = performance.now();
            const [particlesData, typesData] = await Promise.all([
                this.particlesClient.getParticles(this.currentDimension.id, viewport),
                this.particlesClient.getParticleTypes(this.currentDimension.id, viewport)
            ]);
            const loadDuration = performance.now() - loadStartTime;
            
            debugLogger.info('TerrainManager', 'Partículas cargadas del backend', {
                count: particlesData.particles.length,
                duration: loadDuration.toFixed(0) + 'ms',
                viewport: viewport
            });
            
            // Actualizar cache de estilos
            this.styleSystem.cacheStyles(typesData.types);
            
            // Actualizar cache de partículas (fusionar con las existentes, evitar duplicados)
            // Limitar número máximo de partículas nuevas para evitar sobrecarga
            const MAX_NEW_PARTICLES_PER_LOAD = 50000; // Máximo de partículas nuevas por carga
            const previousCount = this.currentParticles.size;
            let newParticlesCount = 0;
            let skippedCount = 0;
            
            // Procesar partículas en batch para mejor rendimiento
            const particlesToAdd = [];
            for (const p of particlesData.particles) {
                if (newParticlesCount >= MAX_NEW_PARTICLES_PER_LOAD) {
                    skippedCount++;
                    continue; // Limitar nuevas partículas
                }
                
                const particleId = p.id || `${p.celda_x}_${p.celda_y}_${p.celda_z}`;
                if (!this.currentParticles.has(particleId)) {
                    particlesToAdd.push({ id: particleId, particle: p });
                    newParticlesCount++;
                }
            }
            
            // Agregar todas las partículas nuevas de una vez (más eficiente)
            particlesToAdd.forEach(({ id, particle }) => {
                this.currentParticles.set(id, particle);
            });
            
            // Limpiar partículas muy lejanas si el caché crece demasiado
            const MAX_TOTAL_PARTICLES = LOAD_LIMITS.maxTotal;
            if (this.currentParticles.size > MAX_TOTAL_PARTICLES) {
                this.cleanupDistantParticles(playerPositionInMeters, cellSize);
            }
            
            // Preparar tiposEstilos
            const tiposEstilos = new Map();
            typesData.types.forEach(tipo => {
                if (tipo.color || tipo.geometria || tipo.opacidad !== undefined) {
                    const estilosCompat = {};
                    if (tipo.color) {
                        estilosCompat.color = tipo.color;
                        estilosCompat.color_hex = tipo.color;
                    }
                    if (tipo.geometria) {
                        estilosCompat.geometria = tipo.geometria;
                        estilosCompat.visual = { geometria: tipo.geometria };
                    }
                    if (tipo.opacidad !== undefined && tipo.opacidad !== null) {
                        if (!estilosCompat.visual) estilosCompat.visual = {};
                        estilosCompat.visual.opacity = tipo.opacidad;
                    }
                    tiposEstilos.set(tipo.nombre, estilosCompat);
                }
            });
            
            this.currentTiposEstilos = tiposEstilos;
            
            // Actualizar área cargada (centro y radio)
            // NOTA: cellSize ya está declarado al inicio del método (línea 439)
            const radiusInMeters = DYNAMIC_LOAD_RADIUS_CELLS * cellSize;
            this.loadedAreaCenter = {
                x: playerPositionInMeters.x,
                y: playerPositionInMeters.y,
                z: playerPositionInMeters.z
            };
            this.loadedAreaRadius = radiusInMeters;
            
            debugLogger.info('TerrainManager', 'Partículas cargadas alrededor del jugador', {
                nuevasParticulas: particlesData.particles.length,
                nuevasAgregadas: newParticlesCount,
                duplicadas: particlesData.particles.length - newParticlesCount - skippedCount,
                limitadas: skippedCount,
                totalParticulasAntes: previousCount,
                totalParticulasDespues: this.currentParticles.size,
                cargaDuration: loadDuration.toFixed(0) + 'ms',
                nuevaAreaCargada: {
                    center: this.loadedAreaCenter,
                    radius: this.loadedAreaRadius.toFixed(2) + 'm'
                }
            });
            
            // Re-renderizar de forma asíncrona para no bloquear el hilo principal
            // Usar múltiples frames si hay muchas partículas nuevas para distribuir el trabajo
            if (newParticlesCount > 0) {
                if (newParticlesCount > LOAD_LIMITS.incrementalThreshold) {
                    // Si hay muchas partículas nuevas, usar múltiples frames
                    this.rerenderIncremental(newParticlesCount);
                } else {
                    // Para pocas partículas, renderizar en el siguiente frame
                    requestAnimationFrame(() => {
                        this.rerenderParticlesWithOptimizations();
                    });
                }
            } else {
                debugLogger.info('TerrainManager', 'No hay nuevas partículas para renderizar (todas eran duplicados o limitadas)');
            }
            
        } catch (error) {
            debugLogger.error('TerrainManager', 'Error cargando partículas alrededor del jugador', {
                error: error.message,
                stack: error.stack
            });
        } finally {
            this.isLoadingParticles = false;
        }
    }
    
    /**
     * Re-renderizar partículas actuales con optimizaciones habilitadas
     * Útil después de establecer la cámara para aplicar limitación por densidad
     */
    rerenderParticlesWithOptimizations() {
        if (!this.currentDimension || this.currentParticles.size === 0) {
            debugLogger.warn('TerrainManager', 'No se puede re-renderizar: sin dimensión o partículas', {
                hasDimension: !!this.currentDimension,
                particlesCount: this.currentParticles.size
            });
            return;
        }
        
        debugLogger.info('TerrainManager', 'Iniciando re-renderizado con optimizaciones', {
            particlesCount: this.currentParticles.size,
            cameraAvailable: !!this.camera,
            timestamp: new Date().toISOString()
        });
        
        // Convertir Map a Array para renderParticles
        const particles = Array.from(this.currentParticles.values());
        
        // Usar tiposEstilos cacheados (si están disponibles)
        const tiposEstilos = this.currentTiposEstilos || new Map();
        
        // Limpiar meshes anteriores
        if (this.currentMeshes.size > 0) {
            debugLogger.info('TerrainManager', 'Limpiando meshes anteriores', {
                meshesCount: this.currentMeshes.size
            });
            this.renderer.clearParticles(this.currentMeshes, this.scene);
        }
        
        // Obtener posición del jugador si está disponible
        let playerPositionInMeters = null;
        if (this.playerPositionGetter) {
            try {
                const playerPos = this.playerPositionGetter();
                if (playerPos) {
                    playerPositionInMeters = playerPos;
                    debugLogger.info('TerrainManager', 'Posición del jugador obtenida', {
                        position: playerPositionInMeters,
                        positionInCells: {
                            x: Math.floor(playerPositionInMeters.x / this.currentDimension.tamano_celda),
                            y: Math.floor(playerPositionInMeters.y / this.currentDimension.tamano_celda),
                            z: Math.floor(playerPositionInMeters.z / this.currentDimension.tamano_celda)
                        }
                    });
                } else {
                    debugLogger.warn('TerrainManager', 'PlayerPositionGetter retornó null/undefined');
                }
            } catch (error) {
                debugLogger.error('TerrainManager', 'Error obteniendo posición del jugador', {
                    error: error.message,
                    stack: error.stack
                });
            }
        } else {
            debugLogger.warn('TerrainManager', 'PlayerPositionGetter no está configurado');
        }
        
        // Re-renderizar con cámara y posición del jugador (optimizaciones habilitadas)
        debugLogger.info('TerrainManager', 'Llamando a renderParticles', {
            particlesInput: particles.length,
            hasPlayerPosition: !!playerPositionInMeters,
            hasCamera: !!this.camera,
            cellSize: this.currentDimension.tamano_celda
        });
        
        const meshes = this.renderer.renderParticles(
            particles,
            tiposEstilos,
            null, // agrupacionesGeometria (opcional)
            this.currentDimension.tamano_celda,
            this.scene,
            this.camera, // Cámara para frustum culling
            playerPositionInMeters // Posición del jugador para limitación por densidad (prioriza alrededor del jugador)
        );
        
        this.currentMeshes = meshes;
        
        debugLogger.info('TerrainManager', 'Re-renderizado completado', {
            meshesCreated: meshes.size,
            particlesInput: particles.length
        });
    }
    
    /**
     * Actualizar partícula individual (romper/colocar)
     * @param {string} particleId - ID de la partícula
     * @param {Particle|null} newData - Nuevos datos (null = eliminar)
     */
    async updateParticle(particleId, newData) {
        // 1. Actualizar en backend (si aplica)
        if (this.currentDimension) {
            await this.updateSystem.updateParticleInBackend(particleId, newData);
        }
        
        // 2. Actualizar cache local
        if (newData === null) {
            // Partícula eliminada (rota)
            this.currentParticles.delete(particleId);
        } else {
            // Partícula modificada/colocada
            this.currentParticles.set(particleId, newData);
        }
        
        // 3. Actualización incremental (en lugar de recargar toda la dimensión)
        if (this.currentDimension && this.currentMeshes.size > 0) {
            this.updateSystem.updateParticleRender(
                particleId,
                newData,
                this.currentMeshes,
                this.renderer,
                this.currentDimension.tamano_celda
            );
        }
    }
    
    /**
     * Actualizar múltiples partículas (batch)
     * @param {string[]} particleIds - IDs de partículas
     * @param {Array<Particle|null>} newDataArray - Array de nuevos datos
     */
    async updateParticles(particleIds, newDataArray) {
        // Similar a updateParticle pero en batch para eficiencia
        if (this.currentDimension) {
            await this.updateSystem.updateParticlesBatch(particleIds, newDataArray);
            
            // Actualizar cache local
            particleIds.forEach((id, index) => {
                if (newDataArray[index] === null) {
                    this.currentParticles.delete(id);
                } else {
                    this.currentParticles.set(id, newDataArray[index]);
                }
            });
            
            // Actualización incremental en batch
            if (this.currentMeshes.size > 0) {
                this.updateSystem.updateParticlesRender(
                    particleIds,
                    newDataArray,
                    this.currentMeshes,
                    this.renderer,
                    this.currentDimension.tamano_celda
                );
            }
        }
    }
    
    /**
     * Obtener meshes actuales (para limpieza externa)
     * @returns {Map} - Map de meshes actuales
     */
    getCurrentMeshes() {
        return this.currentMeshes;
    }
    
    /**
     * Limpiar todo el terreno
     */
    clear() {
        if (this.currentMeshes.size > 0) {
            this.renderer.clearParticles(this.currentMeshes, this.scene);
        }
        this.currentMeshes.clear();
        this.currentParticles.clear();
        this.currentDimension = null;
    }
    
    /**
     * Limpiar partículas muy lejanas del jugador para liberar memoria
     * @param {Object} playerPositionInMeters - Posición del jugador en metros
     * @param {number} cellSize - Tamaño de celda
     */
    cleanupDistantParticles(playerPositionInMeters, cellSize) {
        const CLEANUP_DISTANCE_METERS = 50; // Limpiar partículas a más de 50 metros
        const CLEANUP_DISTANCE_CELLS = Math.ceil(CLEANUP_DISTANCE_METERS / cellSize);
        
        const playerCellX = Math.floor(playerPositionInMeters.x / cellSize);
        const playerCellY = Math.floor(playerPositionInMeters.y / cellSize);
        const playerCellZ = Math.floor(playerPositionInMeters.z / cellSize);
        
        let removedCount = 0;
        const particlesToRemove = [];
        
        // Identificar partículas lejanas
        for (const [id, particle] of this.currentParticles.entries()) {
            const dx = Math.abs(particle.celda_x - playerCellX);
            const dy = Math.abs(particle.celda_y - playerCellY);
            const dz = Math.abs(particle.celda_z - playerCellZ);
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (distance > CLEANUP_DISTANCE_CELLS) {
                particlesToRemove.push(id);
            }
        }
        
        // Remover partículas lejanas
        particlesToRemove.forEach(id => {
            this.currentParticles.delete(id);
            removedCount++;
        });
        
        if (removedCount > 0) {
            debugLogger.info('TerrainManager', 'Partículas lejanas limpiadas', {
                removidas: removedCount,
                distanciaLimite: CLEANUP_DISTANCE_METERS + 'm',
                totalDespues: this.currentParticles.size
            });
        }
    }
    
    /**
     * Renderizar de forma incremental distribuyendo el trabajo en múltiples frames
     * @param {number} newParticlesCount - Número de partículas nuevas
     */
    rerenderIncremental(newParticlesCount) {
        // Para muchas partículas nuevas, renderizar de inmediato pero en el siguiente frame
        // El ParticleRenderer ya tiene optimizaciones internas que distribuyen el trabajo
        requestAnimationFrame(() => {
            this.rerenderParticlesWithOptimizations();
        });
    }
}
