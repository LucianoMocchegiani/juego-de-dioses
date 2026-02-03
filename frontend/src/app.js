/**
 * Aplicación principal - Orquestación de todos los módulos.
 * Recibe ports y store inyectados (bootstrap) o los crea si no se pasan.
 */
import { Store } from './state/store.js';
import { actions } from './state/actions.js';
import { selectors } from './state/selectors.js';
import { loadWorld } from './application/load-world.js';
import { spawnPlayer } from './application/spawn-player.js';
import { PerformanceManager } from './rendering/performance/performance-manager.js';
import { Scene3D } from './rendering/scene/index.js';
import { GeometryRegistry } from './rendering/geometries/registry.js';
import { TerrainManager } from './rendering/terrain/manager.js';
import { DEMO_DIMENSION_NAME } from './config/constants.js';
import { ECSManager } from './rendering/ecs/index.js';
import { InputSystem, PhysicsSystem, RenderSystem, CollisionSystem, AnimationStateSystem, AnimationMixerSystem, ComboSystem, CombatSystem, WeaponEquipSystem } from './rendering/ecs/systems/index.js';
import { PlayerFactory } from './rendering/ecs/factories/player-factory.js';
import { InputManager } from './driving/input/input-manager.js';
import { CollisionDetector } from './rendering/world/collision-detector.js';
import { CameraController } from './rendering/world/camera-controller.js';
import { CelestialSystem, CelestialRenderer } from './rendering/world/__init__.js';
import { exposeDevelopmentTools, initDevelopmentTools } from './dev-exposure.js';
import { debugLogger } from './debug/logger.js';
import { ObjectPool } from './rendering/optimizations/object-pool.js';
import { FrustumCuller } from './rendering/optimizations/frustum-culling.js';
import { LODManager } from './rendering/optimizations/lod-manager.js';
import { FrameScheduler } from './rendering/optimizations/frame-scheduler.js';
import { SpatialGrid } from './rendering/optimizations/spatial-partition.js';
import { InstancingManager } from './rendering/optimizations/instancing-manager.js';
import * as THREE from 'three';

/**
 * @typedef {import('./types.js').Particle} Particle
 */

export class App {
    /**
     * @param {HTMLElement} container - Contenedor HTML para el canvas
     * @param {Object} [options] - Opciones: { ports, store }. Si no se pasan, se crean con createPortsAndStore().
     */
    constructor(container, options = {}) {
        this.container = container;
        const { ports, store } = options;
        if (!ports || !store) {
            throw new Error('App requiere (container, { ports, store }). Usar createApp(container) desde driving/game/game-bootstrap.js.');
        }
        this.ports = ports;
        this.store = store;
        this.particlesApi = ports.particlesApi;
        this.bloquesApi = ports.bloquesApi;
        this.charactersApi = ports.charactersApi;
        this.celestialApi = ports.celestialApi;

        // Inicializar Performance Manager
        this.performanceManager = new PerformanceManager();
        this.performanceManager.subscribe((metrics) => {});

        // Inicializar Registry de Geometrías
        this.geometryRegistry = new GeometryRegistry();

        // Inicializar Object Pools para optimización de rendimiento
        this.objectPool = {
            vector3: new ObjectPool(
                () => new THREE.Vector3(),
                (v) => v.set(0, 0, 0),
                50
            ),
            quaternion: new ObjectPool(
                () => new THREE.Quaternion(),
                (q) => q.set(0, 0, 0, 1),
                25
            ),
            euler: new ObjectPool(
                () => new THREE.Euler(),
                (e) => e.set(0, 0, 0),
                25
            ),
            matrix4: new ObjectPool(
                () => new THREE.Matrix4(),
                (m) => m.identity(),
                10
            )
        };

        if (typeof window !== 'undefined') {
            window.app = this;
        }

        // Inicializar escena 3D
        this.scene = new Scene3D(container);

        // Inicializar TerrainManager (ports inyectados)
        this.terrain = new TerrainManager(
            this.scene.scene,
            this.particlesApi,
            this.bloquesApi,
            this.geometryRegistry,
            this.performanceManager
        );
        
        // Instanced meshes actuales (para compatibilidad temporal)
        this.currentInstancedMeshes = new Map();
        
        // Inicializar ECS
        this.ecs = new ECSManager();
        
        // Integrar Frame Scheduler en ECS Manager
        this.ecs.setFrameScheduler(this.frameScheduler);
        
        // Inicializar InputManager
        this.inputManager = new InputManager();
        
        // Inicializar sistemas ECS
        this.inputSystem = new InputSystem(this.inputManager);
        this.physicsSystem = new PhysicsSystem({ gravity: -9.8 });
        this.combatSystem = new CombatSystem(this.inputManager);
        this.comboSystem = new ComboSystem(this.inputManager);
        this.animationStateSystem = new AnimationStateSystem();
        // AnimationMixerSystem se inicializará después de cargar la escena (necesita LOD manager)
        this.animationMixerSystem = null;
        // RenderSystem, CollisionSystem y WeaponEquipSystem se inicializarán después de cargar la dimensión
        this.renderSystem = null;
        this.collisionSystem = null;
        this.weaponEquipSystem = null;
        this.collisionDetector = null;
        
        // Registrar sistemas con prioridades correctas (orden de ejecución)
        this.ecs.registerSystem(this.inputSystem);         // Priority 0
        this.ecs.registerSystem(this.physicsSystem);       // Priority 1
        this.ecs.registerSystem(this.combatSystem);        // Priority 1.4
        this.ecs.registerSystem(this.comboSystem);         // Priority 1.5
        this.ecs.registerSystem(this.animationStateSystem); // Priority 2
        // AnimationMixerSystem se registrará después de cargar la escena
        
        // Jugador se creará después de cargar la dimensión
        this.playerId = null;
        
        // Bloque actual (se establecerá al cargar la dimensión)
        this.currentBloqueId = null;
        
        // Controlador de cámara (se inicializará después de cargar la dimensión)
        this.cameraController = null;
        
        // Para calcular deltaTime en animate
        this.lastTime = null;
        
        // Sistema celestial (se inicializará después de cargar el bloque)
        this.celestialSystem = null;
        this.celestialRenderer = null;
        
        // Configuración de sincronización celestial
        this.celestialSyncInterval = 5.0; // Sincronizar cada 5 segundos
        this.lastCelestialSync = 0;
        this.celestialInterpolationTime = 0; // Tiempo desde última sincronización
        
        // Sistema de frustum culling (se inicializará después de cargar la escena)
        this.frustumCuller = null;
        
        // Sistema de LOD (se inicializará después de cargar la escena)
        this.lodManager = null;
        
        // Frame Scheduler para distribuir trabajo entre frames (JDG-049)
        this.frameScheduler = new FrameScheduler();
        
        // Spatial Grid para queries espaciales eficientes (JDG-049)
        this.spatialGrid = null;
        
        // Instancing Manager para agrupar entidades similares (JDG-049)
        this.instancingManager = null;
        
        // Inicializar herramientas de debugging (solo en desarrollo)
        this.initDevelopmentTools();
        
        // Inicializar PerformanceLogger (opcional, solo si está habilitado)
        this.initPerformanceLogger();
        
        // Suscribirse a cambios de estado
        this.setupStateListeners();
    }
    
    /**
     * Inicializar herramientas de debugging
     */
    initDevelopmentTools() {
        // Inicializar herramientas de debugging (centralizado)
        const developmentToolsResult = initDevelopmentTools(this);
        
        if (developmentToolsResult) {
            // Guardar referencias para uso interno si es necesario
            this.inspector = developmentToolsResult.inspector;
            this.debugMetrics = developmentToolsResult.metrics;
            this.debugPanel = developmentToolsResult.panel;
            this.debugInterface = developmentToolsResult.interface;
            
            // Exponer todas las herramientas de desarrollo (centralizado)
            exposeDevelopmentTools(this, {
                developmentTools: developmentToolsResult
            });
        } else {
            // Log si no está en desarrollo
            debugLogger.info('DebugTools', 'Modo desarrollo no detectado. Debugging deshabilitado.');
        }
    }
    
    /**
     * Inicializar PerformanceLogger para logging estructurado
     */
    initPerformanceLogger() {
        // Importar dinámicamente para no cargar en producción si no es necesario
        import('./debug/performance-logger.js').then(({ PerformanceLogger }) => {
            if (this.debugMetrics && this.scene) {
                // Obtener renderer (ya está disponible porque scene se inicializa antes)
                const renderer = this.scene?.renderer?.renderer || null;
                
                this.performanceLogger = new PerformanceLogger(
                    this.debugMetrics,
                    renderer
                );
                
                // Iniciar si está habilitado en configuración
                if (this.performanceLogger.enabled) {
                    this.performanceLogger.start();
                }
            }
        }).catch(err => {
            debugLogger.warn('PerformanceLogger', 'No se pudo inicializar', { error: err.message || err });
        });
    }
    
    /**
     * Configurar listeners de estado para actualizar UI
     */
    setupStateListeners() {
        this.store.subscribe((state) => {
            // Aquí se pueden actualizar componentes UI reactivos al estado
            // Por ahora, la UI se actualiza manualmente en loadDemo()
        });
    }
    
    /**
     * Cargar y renderizar dimensión demo
     */
    async loadDemo() {
        try {
            // 1. Caso de uso: cargar mundo (dimensiones y tamaño; actualiza store)
            const { dimension: demoDimension, worldSize } = await loadWorld(this.ports, this.store);
            this.currentBloqueId = demoDimension.id;

            // 2. Inicializar sistema celestial
            if (!this.celestialSystem) {
                this.celestialSystem = new CelestialSystem(null, worldSize);
                this.celestialRenderer = new CelestialRenderer(this.scene.scene, this.celestialSystem);
            } else {
                this.celestialSystem.updateWorldCenter(worldSize);
            }
            await this.syncCelestialState();

            // 3. Cargar bloque usando TerrainManager
            const terrainResult = await this.terrain.loadDimension(demoDimension);
            const viewport = terrainResult.viewport;
            const particlesData = { particles: terrainResult.particles };
            
            // 5. Establecer partículas y viewport en estado
            actions.setParticles(this.store, particlesData.particles);
            actions.setViewport(this.store, viewport);
            
            // 6. Actualizar instanced meshes para compatibilidad temporal
            this.currentInstancedMeshes = terrainResult.meshes;
            
            // 7. Ajustar grilla y ejes al tamaño del terreno
            this.scene.updateHelpers(demoDimension.ancho_metros, demoDimension.alto_metros);
            
            // 8. Centrar cámara PRIMERO (antes de renderizar para que frustum culling funcione correctamente)
            const centerX = (viewport.x_max + viewport.x_min) / 2 * demoDimension.tamano_celda;
            const centerY = (viewport.y_max + viewport.y_min) / 2 * demoDimension.tamano_celda;
            const centerZ = (viewport.z_max + viewport.z_min) / 2 * demoDimension.tamano_celda;
            this.scene.centerCamera(centerX, centerY, centerZ);
            
            // 9. Actualizar matrices de la cámara para que frustum culling funcione correctamente
            this.scene.camera.camera.updateMatrixWorld();
            
            // 9.5. Establecer cámara en TerrainManager para optimizaciones de renderizado
            if (this.terrain && this.scene.camera) {
                this.terrain.setCamera(this.scene.camera.camera);
            }
            
            // NOTA: PlayerPositionGetter se configura después de crear el jugador (ver línea ~446)
            
            // 10. Contar draw calls después de renderizar
            this.performanceManager.countDrawCalls(this.currentInstancedMeshes);
            
            // 11. Finalizar carga
            actions.setLoading(this.store, false);
            
            // 12. Inicializar Spatial Grid si no existe
            if (!this.spatialGrid) {
                // Usar tamaño de celda del juego como tamaño de celda del grid
                this.spatialGrid = new SpatialGrid(demoDimension.tamano_celda * 5); // Grid de 5 celdas de juego
            }
            
            // 13. Inicializar Instancing Manager si no existe
            if (!this.instancingManager && this.scene) {
                this.instancingManager = new InstancingManager(this.scene.scene);
            }
            
            // 14. Inicializar CollisionDetector y CollisionSystem
            if (!this.collisionDetector) {
                this.collisionDetector = new CollisionDetector(
                    this.particlesApi,
                    demoDimension.tamano_celda
                );
                this.collisionSystem = new CollisionSystem(
                    this.collisionDetector,
                    demoDimension.id,
                    demoDimension,
                    particlesData.particles, // Usar partículas ya cargadas
                    this.spatialGrid // Pasar spatial grid
                );
                this.ecs.registerSystem(this.collisionSystem);
            } else {
                // Actualizar partículas en CollisionSystem si ya existe
                this.collisionSystem.setParticles(particlesData.particles);
                // Asignar spatial grid si no lo tiene
                if (this.spatialGrid && !this.collisionSystem.spatialGrid) {
                    this.collisionSystem.spatialGrid = this.spatialGrid;
                }
            }
            
            // 15. Inicializar FrustumCuller y LODManager si no existen (después de que la cámara esté lista)
            if (!this.frustumCuller && this.scene && this.scene.camera) {
                this.frustumCuller = new FrustumCuller(this.scene.camera.camera);
            }
            
            if (!this.lodManager && this.scene && this.scene.camera) {
                this.lodManager = new LODManager(this.scene.camera.camera);
            }
            
            // Inicializar AnimationMixerSystem con LOD manager si no existe
            if (!this.animationMixerSystem) {
                this.animationMixerSystem = new AnimationMixerSystem(this.lodManager);
                this.ecs.registerSystem(this.animationMixerSystem); // Priority 2.5
            } else if (this.lodManager) {
                // Si el animationMixerSystem ya existe pero no tiene lodManager, asignarlo
                this.animationMixerSystem.lodManager = this.lodManager;
            }
            
            // 16. Inicializar RenderSystem con cellSize de la dimensión y frustum culler
            if (!this.renderSystem) {
                this.renderSystem = new RenderSystem(demoDimension.tamano_celda, this.frustumCuller);
                this.ecs.registerSystem(this.renderSystem);
            } else if (this.frustumCuller) {
                // Si el renderSystem ya existe pero no tiene frustumCuller, asignarlo
                this.renderSystem.frustumCuller = this.frustumCuller;
            }
            
            // 17. Inicializar WeaponEquipSystem (necesita la escena)
            if (!this.weaponEquipSystem) {
                this.weaponEquipSystem = new WeaponEquipSystem(this.scene.scene);
                this.ecs.registerSystem(this.weaponEquipSystem);
            }
            
            // 18. Caso de uso: spawnear jugador
            if (!this.playerId) {
                this.playerId = await spawnPlayer(this.ports, this.store, this.ecs, this.scene);

                // 9.6. Establecer función para obtener posición del jugador (DESPUÉS de crear el jugador)
                // Esto permite que las optimizaciones de partículas prioricen alrededor del jugador, no de la cámara
                if (this.terrain && this.playerId && this.ecs) {
                    this.terrain.setPlayerPositionGetter(() => {
                        const positionComponent = this.ecs.getComponent(this.playerId, 'Position');
                        if (positionComponent && this.terrain.currentDimension) {
                            const cellSize = this.terrain.currentDimension.tamano_celda;
                            return {
                                x: positionComponent.x * cellSize,
                                y: positionComponent.y * cellSize,
                                z: positionComponent.z * cellSize
                            };
                        }
                        return null;
                    });
                    debugLogger.info('App', 'PlayerPositionGetter configurado para TerrainManager');
                } else {
                    debugLogger.warn('App', 'No se pudo configurar PlayerPositionGetter', {
                        hasTerrain: !!this.terrain,
                        hasPlayerId: !!this.playerId,
                        hasEcs: !!this.ecs
                    });
                }
                
                // 19. Inicializar controlador de cámara y configurarlo para seguir al jugador
                if (!this.cameraController) {
                    this.cameraController = new CameraController(
                        this.scene.camera,
                        this.scene,
                        demoDimension.tamano_celda,
                        this.inputManager // Pasar InputManager para control de mouse
                    );
                    this.cameraController.setTarget(this.playerId);
                    
                    // Pasar CameraController al InputSystem para control de vuelo 3D
                    if (this.inputSystem) {
                        this.inputSystem.cameraController = this.cameraController;
                    }
                    
                    // Deshabilitar OrbitControls cuando el jugador está activo
                    this.scene.controls.setEnabled(false);
                }
            }
            
            // 20. Iniciar profiling de performance
            this.performanceManager.startProfiling();
            // console.log('Performance profiling iniciado. Las métricas aparecerán cada segundo en consola.');
            
            // 21. Iniciar animación (con medición de FPS y actualización de ECS)
            // Usar nuestro propio loop de animación que incluye ECS
            this.startAnimation();
            
            // Retornar datos para actualizar UI externa
            return {
                dimension: demoDimension,
                particlesCount: terrainResult.particlesCount,
                viewport: viewport
            };
            
        } catch (error) {
            // console.error('Error cargando demo:', error);
            actions.setLoading(this.store, false);
            actions.setError(this.store, error.message);
            throw error;
        }
    }
    
    /**
     * Obtener estado actual
     * @returns {Object} - Estado actual
     */
    getState() {
        return this.store.getState();
    }
    
    /**
     * Obtener dimensión actual
     * @returns {Object|null} - Dimensión actual
     */
    getCurrentDimension() {
        return selectors.getCurrentDimension(this.store.getState());
    }
    
    /**
     * Obtener número de partículas
     * @returns {number} - Número de partículas
     */
    getParticlesCount() {
        return selectors.getParticlesCount(this.store.getState());
    }
    
    /**
     * Sincronizar estado celestial con el backend
     */
    async syncCelestialState() {
        if (!this.celestialApi || !this.celestialSystem) {
            debugLogger.warn('App', 'No se puede sincronizar estado celestial: falta celestialApi o celestialSystem');
            return;
        }
        
        try {
            const state = await this.celestialApi.getState();
            this.celestialSystem.update(state);
        } catch (error) {
            debugLogger.error('App', 'Error sincronizando estado celestial', { error });
        }
    }
    
    /**
     * Iniciar loop de animación con actualización de ECS
     */
    startAnimation() {
        const animate = () => {
            requestAnimationFrame(animate);
            
            // Calcular deltaTime
            const currentTime = performance.now();
            const deltaTime = this.lastTime ? (currentTime - this.lastTime) / 1000 : 0;
            this.lastTime = currentTime;
            
            // Sincronizar estado celestial periódicamente
            const currentTimeSeconds = performance.now() / 1000; // Tiempo en segundos
            if (this.celestialSystem && currentTimeSeconds - this.lastCelestialSync >= this.celestialSyncInterval) {
                this.syncCelestialState().catch(err => {
                    debugLogger.error('App', 'Error sincronizando estado celestial', { error: err.message || err });
                });
                this.lastCelestialSync = currentTimeSeconds;
                this.celestialInterpolationTime = 0;
            }
            
            // Actualizar frustum culling (una vez por frame antes de actualizar sistemas)
            if (this.frustumCuller) {
                this.frustumCuller.update();
            }
            
            // Actualizar interpolación celestial
            if (this.celestialSystem) {
                this.celestialInterpolationTime += deltaTime;
                const interpolationFactor = Math.min(
                    this.celestialInterpolationTime / this.celestialSyncInterval,
                    1.0
                );
                
                // Actualizar renderizador celestial
                if (this.celestialRenderer) {
                    this.celestialRenderer.update(interpolationFactor);
                }
                
                // Actualizar iluminación (esto actualiza el color de la luz del sol)
                if (this.scene.lights) {
                    this.scene.lights.updateLighting(this.celestialSystem);
                }
                
                // Actualizar color del cielo basado en la iluminación (como en el mundo real)
                if (this.scene.renderer && this.scene.lights) {
                    this.scene.renderer.updateSkyColor(this.celestialSystem, this.scene.lights);
                }
            }
            
            // Actualizar sistemas ECS (procesan input primero)
            if (this.ecs) {
                this.ecs.update(deltaTime);
            }
            
            // Actualizar controlador de cámara ANTES de limpiar el frame
            // (necesita el mouseDelta antes de que se resetee)
            if (this.cameraController) {
                this.cameraController.update(this.ecs);
            } else {
                // Si no hay controlador de cámara, actualizar OrbitControls
            this.scene.controls.update();
            }
            
            // Actualizar partículas según posición del jugador (re-renderiza si el jugador se movió)
            if (this.terrain) {
                this.terrain.updateForPlayerMovement().catch(err => {
                    debugLogger.error('App', 'Error actualizando partículas por movimiento del jugador', { error: err.message || err });
                });
            }
            
            // Limpiar frame de InputManager DESPUÉS de que todos los sistemas procesen el input
            this.inputManager.clearFrame();
            
            // Renderizar
            this.scene.renderer.render(this.scene.scene, this.scene.camera.camera);
            
            // Medir FPS
            this.performanceManager.measureFPS();
        };
        
        animate();
    }
}

