/**
 * Renderizador genérico de partículas con soporte de formas geométricas
 */
import * as THREE from 'three';
import { BaseRenderer } from '../../renderers/base-renderer.js';
import { FrustumCache } from '../utils/culling.js';
import { sortParticlesByDepth } from '../utils/sorting.js';
import { LODManager } from '../optimizations/lod-manager.js';
import { ParticleLimiter } from '../optimizations/particle-limiter.js';
import { AdaptiveLimiter } from '../optimizations/adaptive-limiter.js';
import { Geometry } from '../components/geometry.js';
import { debugLogger } from '../../../debug/logger.js';
import {
    DEFAULT_MAX_PARTICLES,
    ADAPTIVE_LIMITER_LIMITS,
    ADAPTIVE_LIMITER_DEBOUNCE,
    DENSITY_DISTANCES,
    RENDER_OPTIMIZATIONS,
    MAX_INSTANCES_PER_MESH,
    HIDDEN_PARTICLE_POSITION,
    WATER_OPTIMIZATION_OPTIONS
} from '../../../config/particle-optimization-config.js';

/**
 * @typedef {import('../../../types.js').Particle} Particle
 * @typedef {import('../../../types.js').ParticleStyle} ParticleStyle
 * @typedef {import('../../../types.js').TipoEstilosBD} TipoEstilosBD
 */

export class ParticleRenderer extends BaseRenderer {
    /**
     * @param {GeometryRegistry} geometryRegistry - Registry de geometrías
     * @param {PerformanceManager} performanceManager - Performance Manager (opcional)
     */
    constructor(geometryRegistry, performanceManager = null) {
        super(geometryRegistry);
        // geometryCache removido - se usa geometryCacheLOD en su lugar
        // frustumCache: lazy-loaded solo si enableFrustumCulling es true
        this._frustumCache = null;
        this.lodManager = new LODManager(geometryRegistry);
        this.particleLimiter = new ParticleLimiter(DEFAULT_MAX_PARTICLES);
        this.geometryCacheLOD = new Geometry(geometryRegistry, this.lodManager);
        this.materialPool = new Map(); // Pool de materiales para reutilización
        this.enableFrustumCulling = RENDER_OPTIMIZATIONS.frustumCulling;
        this.enableLOD = RENDER_OPTIMIZATIONS.lod;
        this.enableParticleLimiting = RENDER_OPTIMIZATIONS.particleLimiting;
        this.enableAdaptiveLimiting = RENDER_OPTIMIZATIONS.adaptiveLimiting;
        
        // Crear AdaptiveLimiter solo si está habilitado y se proporciona PerformanceManager
        this.adaptiveLimiter = null;
        if (this.enableAdaptiveLimiting && performanceManager) {
            this.adaptiveLimiter = new AdaptiveLimiter(performanceManager, {
                ...ADAPTIVE_LIMITER_LIMITS,
                debounce: ADAPTIVE_LIMITER_DEBOUNCE
            });
        }
        
        // Distancias de densidad configurables
        this.densityDistances = DENSITY_DISTANCES;
        
        // Índice de partículas: particleId -> {meshKey, instanceIndex}
        this.particleIndex = new Map();
        
        // Throttling ahora se maneja directamente en debugLogger
    }
    
    /**
     * Helper: Obtener posición de referencia (jugador o cámara) y fuente
     * @param {Object|THREE.Vector3|null} playerPosition - Posición del jugador
     * @param {THREE.Camera|null} camera - Cámara
     * @returns {{position: THREE.Vector3|null, source: string}} - Posición y fuente
     */
    _getReferencePosition(playerPosition, camera) {
        if (playerPosition) {
            if (playerPosition.x !== undefined && !(playerPosition instanceof THREE.Vector3)) {
                return {
                    position: new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z),
                    source: 'player'
                };
            } else {
                return {
                    position: playerPosition instanceof THREE.Vector3 ? playerPosition : camera?.position || null,
                    source: playerPosition instanceof THREE.Vector3 ? 'player' : 'camera'
                };
            }
        } else if (camera) {
            return {
                position: camera.position,
                source: 'camera'
            };
        }
        return { position: null, source: 'none' };
    }
    
    /**
     * Crear clave única para geometría+material+LOD
     * @param {string} geometryType - Tipo de geometría
     * @param {Object} geometryParams - Parámetros de geometría (serializados)
     * @param {ParticleStyle} estilo - Estilo de la partícula
     * @param {string} [lodLevel] - Nivel LOD (opcional)
     * @returns {string} - Clave única
     */
    getGeometryKey(geometryType, geometryParams, estilo, lodLevel = 'high') {
        const paramsStr = JSON.stringify(geometryParams || {});
        const opacity = estilo.opacity !== undefined ? estilo.opacity : 1.0;
        // IMPORTANTE: Incluir el color en la clave para que partículas con diferentes colores se agrupen por separado
        return `${geometryType}_${lodLevel}_${paramsStr}_${estilo.color}_${estilo.metalness}_${estilo.roughness}_${opacity}`;
    }
    
    /**
     * Obtener clave única para material
     * @param {ParticleStyle} estilo - Estilo de la partícula
     * @returns {string} - Clave única
     */
    getMaterialKey(estilo) {
        const opacity = estilo.opacity !== undefined ? estilo.opacity : 1.0;
        return `${estilo.color}_${estilo.metalness}_${estilo.roughness}_${opacity}_${estilo.isError || false}`;
    }
    
    /**
     * Obtener o crear material desde pool
     * @param {ParticleStyle} estilo - Estilo de la partícula
     * @returns {THREE.MeshStandardMaterial}
     */
    getMaterial(estilo) {
        const key = this.getMaterialKey(estilo);
        
        if (this.materialPool.has(key)) {
            return this.materialPool.get(key);
        }
        
        // Crear nuevo material
        const material = this.createMaterial(estilo);
        this.materialPool.set(key, material);
        return material;
    }
    
    /**
     * Crear material para una partícula
     * @param {ParticleStyle} estilo - Estilo de la partícula
     * @returns {THREE.MeshStandardMaterial}
     */
    createMaterial(estilo) {
        // color_hex viene como string hexadecimal en formato CSS desde BD (ej: "#8B4513")
        // THREE.Color acepta strings en formato CSS (#RRGGBB) directamente
        const color = new THREE.Color(estilo.color);
        
        // Determinar opacidad (default: 1.0 si no se especifica)
        const opacity = estilo.opacity !== undefined ? estilo.opacity : 1.0;
        
        // Hacer transparente si opacity < 1.0 o si es un estilo de error
        const isTransparent = estilo.isError || opacity < 1.0;
        
        const material = new THREE.MeshStandardMaterial({ 
            color: color,
            metalness: estilo.metalness,
            roughness: estilo.roughness,
            transparent: isTransparent,
            opacity: opacity,
            // Configurar depth testing para materiales transparentes
            depthWrite: !isTransparent, // No escribir en depth buffer si es transparente
            depthTest: true // Siempre hacer depth test
        });
        
        return material;
    }
    
    /**
     * Renderizar partículas usando instanced rendering
     * @param {Particle[]} particles - Array de partículas
     * @param {Map<string, TipoEstilosBD>} tiposEstilos - Map de estilos por tipo de partícula
     * @param {Map<string, Object>} agrupacionesGeometria - Map de geometrías por agrupación (opcional)
     * @param {number} cellSize - Tamaño de celda en metros
     * @param {THREE.Scene} scene - Escena Three.js
     * @param {THREE.Camera} [camera] - Cámara Three.js (opcional, para frustum culling)
     * @param {THREE.Vector3|Object} [playerPosition] - Posición del jugador en metros (opcional, para limitación por densidad)
     * @returns {Map<string, THREE.InstancedMesh>} - Map de instanced meshes creados
     */
    renderParticles(particles, tiposEstilos, agrupacionesGeometria, cellSize, scene, camera = null, playerPosition = null) {
        // Log inicial para debugging
        debugLogger.info('ParticleRenderer', 'Inicio renderParticles', {
            totalParticles: particles ? particles.length : 0,
            hasCamera: !!camera,
            hasPlayerPosition: !!playerPosition,
            enableFrustumCulling: this.enableFrustumCulling,
            enableLOD: this.enableLOD,
            enableParticleLimiting: this.enableParticleLimiting
        });
        
        // 1. Aplicar frustum culling si está habilitado y se proporciona cámara
        // NOTA: Frustum culling está deshabilitado por defecto para partículas de terreno
        // porque las partículas deben renderizarse alrededor del jugador, no de la cámara
        let particlesToRender = particles;
        
        if (this.enableFrustumCulling && camera) {
            // Lazy-load frustumCache solo si está habilitado
            if (!this._frustumCache) {
                this._frustumCache = new FrustumCache();
            }
            const particlesBeforeFrustum = particlesToRender.length;
            particlesToRender = this._frustumCache.getVisible(
                particles,
                camera,
                cellSize
            );
            debugLogger.info('ParticleRenderer', 'Frustum culling aplicado', {
                antes: particlesBeforeFrustum,
                despues: particlesToRender.length,
                filtradas: particlesBeforeFrustum - particlesToRender.length,
                porcentajeFiltrado: particlesBeforeFrustum > 0 
                    ? ((particlesBeforeFrustum - particlesToRender.length) / particlesBeforeFrustum * 100).toFixed(1) + '%'
                    : '0%'
            });
        }
        
        // 2. Aplicar LOD si está habilitado
        // IMPORTANTE: Para partículas de terreno, usar posición del jugador si está disponible
        const particlesBeforeLOD = particlesToRender.length;
        if (this.enableLOD && (playerPosition || camera)) {
            // Usar posición del jugador para LOD si está disponible, sino usar cámara
            const { position: lodReferencePosition, source: lodSourceRaw } = this._getReferencePosition(playerPosition, camera);
            const lodSource = lodSourceRaw === 'player' ? 'jugador' : lodSourceRaw === 'camera' ? 'cámara' : 'none';
            
            if (lodReferencePosition && particlesToRender.length > 0) {
                debugLogger.info('ParticleRenderer', 'Aplicando LOD', {
                    antes: particlesBeforeLOD,
                    referencia: lodSource,
                    referenciaPos: {
                        x: lodReferencePosition.x?.toFixed(2),
                        y: lodReferencePosition.y?.toFixed(2),
                        z: lodReferencePosition.z?.toFixed(2)
                    }
                });
                
                particlesToRender = this.lodManager.applyLOD(
                    particlesToRender,
                    lodReferencePosition,
                    cellSize
                );
                
                debugLogger.info('ParticleRenderer', 'LOD aplicado', {
                    antes: particlesBeforeLOD,
                    despues: particlesToRender.length,
                    filtradas: particlesBeforeLOD - particlesToRender.length,
                    referencia: lodSource
                });
            } else if (this.enableLOD) {
                debugLogger.warn('ParticleRenderer', 'LOD habilitado pero sin referencia o sin partículas', {
                    hasReference: !!lodReferencePosition,
                    particlesBeforeLOD: particlesBeforeLOD,
                    referencia: lodSource
                });
            }
        }
        
        // 2.5. Ajustar límite dinámicamente según FPS si está habilitado
        if (this.enableAdaptiveLimiting && this.adaptiveLimiter) {
            const adaptiveLimit = this.adaptiveLimiter.getCurrentLimit();
            const previousLimit = this.particleLimiter.maxParticles;
            this.particleLimiter.setMaxParticles(adaptiveLimit);
            
            // Log solo cuando cambia el límite (para no saturar)
            if (adaptiveLimit !== previousLimit) {
                const fps = this.adaptiveLimiter.performanceManager?.getMetrics()?.fps || 0;
                debugLogger.info('ParticleRenderer', 'Límite adaptativo aplicado', {
                    fps: fps,
                    limiteAdaptivo: adaptiveLimit,
                    limiteAnterior: previousLimit
                });
            }
        } else if (this.enableAdaptiveLimiting) {
            debugLogger.warn('ParticleRenderer', 'Adaptación dinámica habilitada pero AdaptiveLimiter no está disponible');
        }
        
        // 2.6. Aplicar limitación agresiva de partículas con densidad reducida si está habilitado
        // IMPORTANTE: Usar posición del jugador en lugar de la cámara para que las partículas se prioricen alrededor del jugador
        if (this.enableParticleLimiting && (playerPosition || camera)) {
            // Priorizar posición del jugador si está disponible, sino usar cámara
            const { position: referencePosition, source: positionSource } = this._getReferencePosition(playerPosition, camera);
            
            if (referencePosition) {
                const particlesBeforeLimit = particlesToRender.length;
                
                debugLogger.info('ParticleRenderer', 'Aplicando limitación por densidad', {
                    positionSource: positionSource,
                    referencePosition: {
                        x: referencePosition.x?.toFixed(2),
                        y: referencePosition.y?.toFixed(2),
                        z: referencePosition.z?.toFixed(2)
                    },
                    particlesBeforeLimit: particlesBeforeLimit,
                    limiteMax: this.particleLimiter.maxParticles,
                    nearDistance: this.densityDistances.near,
                    farDistance: this.densityDistances.far,
                    totalInput: particles.length,
                    despuesFrustum: this.enableFrustumCulling ? 'aplicado' : 'deshabilitado',
                    despuesLOD: this.enableLOD ? particlesBeforeLOD : 'deshabilitado'
                });
                
                if (particlesBeforeLimit === 0) {
                    debugLogger.warn('ParticleRenderer', 'No hay partículas para limitar (todas fueron filtradas antes)', {
                        totalInput: particles.length,
                        despuesFrustum: this.enableFrustumCulling ? 'aplicado' : 'deshabilitado',
                        despuesLOD: this.enableLOD ? particlesBeforeLOD : 'deshabilitado',
                        particlesAntesLimit: particlesBeforeLimit
                    });
                } else {
                    particlesToRender = this.particleLimiter.limitParticlesWithDensity(
                        particlesToRender,
                        referencePosition, // Usar posición del jugador (no cámara)
                        cellSize,
                        this.densityDistances.near,  // nearDistance (metros) - todas las partículas dentro de esta distancia se renderizan al 100%
                        this.densityDistances.far,    // farDistance (metros) - partículas lejanas se reducen
                        WATER_OPTIMIZATION_OPTIONS
                    );
                    
                    debugLogger.info('ParticleRenderer', 'Limitación por densidad aplicada', {
                        particlesBefore: particlesBeforeLimit,
                        particlesAfter: particlesToRender.length,
                        reduccion: particlesBeforeLimit > 0
                            ? ((1 - particlesToRender.length / particlesBeforeLimit) * 100).toFixed(1) + '%'
                            : '0%',
                        limiteMax: this.particleLimiter.maxParticles
                    });
                }
            } else {
                debugLogger.warn('ParticleRenderer', 'Limitación habilitada pero no hay posición de referencia (jugador o cámara)');
            }
        } else if (this.enableParticleLimiting && !camera) {
            // Throttling ahora manejado directamente en debugLogger
            debugLogger.warn('ParticleRenderer', 'Limitación con densidad DESHABILITADA: sin cámara. Las optimizaciones no se aplicarán.', {
                particulasInput: particles.length,
                particulasRender: particlesToRender.length,
                limiteActual: this.particleLimiter.maxParticles
            }, { throttleMs: 1000 });
        } else if (!this.enableParticleLimiting) {
            debugLogger.warn('ParticleRenderer', 'Limitación de partículas DESHABILITADA', {
                particulasInput: particles.length
            });
        }
        
        // 3. Ordenar partículas por profundidad (celda_z) de mayor a menor
        const sortedParticles = sortParticlesByDepth(particlesToRender);
        
        // Agrupar partículas por geometría+material para instanced rendering
        const particlesByGeometry = new Map();
        
        sortedParticles.forEach((particle) => {
            const tipoEstilos = tiposEstilos.get(particle.tipo);
            const agrupacionGeom = agrupacionesGeometria?.get(particle.agrupacion_id);
            
            // Obtener estilo
            const estilo = this.getStyle(particle, tipoEstilos);
            const opacity = estilo.opacity !== undefined ? estilo.opacity : 1.0;
            
            // Saltar partículas invisibles
            if (opacity === 0.0) {
                return;
            }
            
            // Obtener tipo y parámetros de geometría para la clave
            let geometryType = 'box';
            let geometryParams = {};
            
            if (particle.agrupacion_id && agrupacionGeom) {
                const parteEntidad = particle.propiedades?.parte_entidad;
                if (parteEntidad && agrupacionGeom.partes && agrupacionGeom.partes[parteEntidad]) {
                    const parteDef = agrupacionGeom.partes[parteEntidad];
                    if (parteDef.geometria) {
                        geometryType = parteDef.geometria.tipo;
                        geometryParams = parteDef.geometria.parametros || {};
                    }
                }
            } else if (tipoEstilos?.geometria) {
                // Nueva estructura: geometria directa
                geometryType = tipoEstilos.geometria.tipo;
                geometryParams = tipoEstilos.geometria.parametros || {};
            } else if (tipoEstilos?.visual?.geometria) {
                // Estructura antigua: visual.geometria (compatibilidad)
                geometryType = tipoEstilos.visual.geometria.tipo;
                geometryParams = tipoEstilos.visual.geometria.parametros || {};
            }
            
            // Obtener nivel LOD de la partícula (si fue aplicado)
            const lodLevel = particle._lodLevel || 'high';
            
            // Obtener geometría con LOD desde cache
            const geometry = this.geometryCacheLOD.getGeometry(
                geometryType,
                geometryParams,
                lodLevel,
                cellSize
            );
            
            // Crear clave única para geometría+material+LOD
            const geometryKey = this.getGeometryKey(geometryType, geometryParams, estilo, lodLevel);
            
            if (!particlesByGeometry.has(geometryKey)) {
                particlesByGeometry.set(geometryKey, {
                    geometry: geometry,
                    estilo: estilo,
                    particles: []
                });
            }
            
            particlesByGeometry.get(geometryKey).particles.push(particle);
        });
        
        // Separar grupos opacos de transparentes
        const opaqueGroups = [];
        const transparentGroups = [];
        
        particlesByGeometry.forEach((group, geometryKey) => {
            const opacity = group.estilo.opacity !== undefined ? group.estilo.opacity : 1.0;
            const isTransparent = group.estilo.isError || opacity < 1.0;
            
            // Calcular profundidad promedio del grupo (para ordenamiento)
            const avgDepth = group.particles.reduce((sum, p) => sum + p.celda_z, 0) / group.particles.length;
            
            const groupData = { group, geometryKey, avgDepth };
            
            if (isTransparent) {
                transparentGroups.push(groupData);
            } else {
                opaqueGroups.push(groupData);
            }
        });
        
        // Ordenar grupos opacos por profundidad (más profundos primero)
        opaqueGroups.sort((a, b) => b.avgDepth - a.avgDepth);
        
        // OPTIMIZACIÓN: Ordenar grupos transparentes solo si hay muchos (evitar costo innecesario)
        // Para pocos grupos transparentes, el ordenamiento no es crítico
        if (transparentGroups.length > 1) {
            // Ordenar grupos transparentes por profundidad (más profundos primero)
            // Esto es necesario para renderizado correcto de transparencias
            transparentGroups.sort((a, b) => b.avgDepth - a.avgDepth);
        }
        
        // Limpiar índice anterior
        this.particleIndex.clear();
        
        // Crear instanced meshes para cada grupo
        const instancedMeshes = new Map();
        
        // Renderizar primero grupos opacos, luego transparentes
        const groupsToRender = [...opaqueGroups, ...transparentGroups];
        
        groupsToRender.forEach(({ group, geometryKey }) => {
            const count = group.particles.length;
            
            // Obtener material desde pool (reutilizar materiales)
            const material = this.getMaterial(group.estilo);
            
            // Dividir en múltiples instanced meshes si es necesario
            const numMeshes = Math.ceil(count / MAX_INSTANCES_PER_MESH);
            
            for (let meshIndex = 0; meshIndex < numMeshes; meshIndex++) {
                const start = meshIndex * MAX_INSTANCES_PER_MESH;
                const end = Math.min(start + MAX_INSTANCES_PER_MESH, count);
                const particlesChunk = group.particles.slice(start, end);
                
                // Crear instanced mesh para este chunk
                const instancedMesh = new THREE.InstancedMesh(
                    group.geometry,
                    material,
                    particlesChunk.length
                );
                
                // Configurar posiciones de instancias y construir índice
                const matrix = new THREE.Matrix4();
                const meshKey = numMeshes > 1 ? `${geometryKey}_${meshIndex}` : geometryKey;
                
                particlesChunk.forEach((particle, chunkIndex) => {
                    const pos = this._calculateParticlePosition(particle, cellSize);
                    matrix.setPosition(pos.x, pos.y, pos.z);
                    instancedMesh.setMatrixAt(chunkIndex, matrix);
                    
                    // Guardar en índice: particleId -> {meshKey, instanceIndex}
                    this.particleIndex.set(particle.id, {
                        meshKey: meshKey,
                        instanceIndex: chunkIndex
                    });
                });
                
                instancedMesh.instanceMatrix.needsUpdate = true;
                
                // Guardar referencia con índice único
                instancedMeshes.set(meshKey, instancedMesh);
                scene.add(instancedMesh);
            }
        });
        
        // Throttling ahora manejado directamente en debugLogger
        const totalMeshes = instancedMeshes.size;
        let totalInstances = 0;
        instancedMeshes.forEach(mesh => {
            totalInstances += mesh.count;
        });
        
        debugLogger.info('ParticleRenderer', 'Renderizado completado', {
            particulasInput: particles.length,
            particulasRender: totalInstances,
            meshes: totalMeshes,
            reduccion: particles.length > 0 ? `${((1 - totalInstances / particles.length) * 100).toFixed(1)}%` : '0%'
        }, { throttleMs: 1000 });
        
        return instancedMeshes;
    }
    
    
    /**
     * Obtener estadísticas de optimizaciones
     * @returns {Object} - Estadísticas
     */
    getOptimizationStats() {
        const stats = {
            frustumCulling: {
                enabled: this.enableFrustumCulling
            },
            lod: {
                enabled: this.enableLOD
            },
            particleLimiting: {
                enabled: this.enableParticleLimiting,
                currentLimit: this.particleLimiter.maxParticles,
                stats: this.particleLimiter.getStats()
            },
            adaptiveLimiting: {
                enabled: this.enableAdaptiveLimiting && this.adaptiveLimiter !== null,
                currentLimit: this.adaptiveLimiter?.getCurrentLimitWithoutAdjustment() || null
            },
            densityLimiting: {
                near: this.densityDistances.near,
                far: this.densityDistances.far
            }
        };
        
        if (this.adaptiveLimiter) {
            const fps = this.adaptiveLimiter.performanceManager?.getMetrics()?.fps || 0;
            stats.adaptiveLimiting.fps = fps;
        }
        
        return stats;
    }
    
    /**
     * Obtener estilo desde tiposEstilos (helper para compatibilidad)
     * @param {Particle} particle - Partícula
     * @param {TipoEstilosBD} tipoEstilos - Estilos del tipo
     * @returns {ParticleStyle}
     */
    getStyle(particle, tipoEstilos) {
        // Este método será usado por renderParticles
        // Por ahora, retornar estilo básico (se puede mejorar con cache)
        if (!tipoEstilos) {
            return {
                color: '#FFFFFF',
                metalness: 0.1,
                roughness: 0.8
            };
        }
        
        // Prioridad: color directo (nuevo) > color_hex (antiguo)
        let colorValue = '#FFFFFF';
        if (tipoEstilos.color !== undefined && tipoEstilos.color !== null) {
            const colorStr = String(tipoEstilos.color).trim();
            // Validar que no sea 'transparent' o vacío
            if (colorStr && colorStr !== 'transparent' && colorStr !== '') {
                colorValue = colorStr;
            }
        } else if (tipoEstilos.color_hex !== undefined && tipoEstilos.color_hex !== null) {
            const colorStr = String(tipoEstilos.color_hex).trim();
            // Validar que no sea 'transparent' o vacío
            if (colorStr && colorStr !== 'transparent' && colorStr !== '') {
                colorValue = colorStr;
            }
        }
        
        const estilo = {
            color: colorValue,
            metalness: tipoEstilos.material?.metalness || 0.1,
            roughness: tipoEstilos.material?.roughness || 0.8
        };
        
        if (tipoEstilos.visual?.opacity !== undefined) {
            estilo.opacity = tipoEstilos.visual.opacity;
        }
        
        return estilo;
    }
    
    /**
     * Limpiar instanced meshes de la escena
     * @param {Map<string, THREE.InstancedMesh>} instancedMeshes - Map de meshes a limpiar
     * @param {THREE.Scene} scene - Escena Three.js
     */
    clearParticles(instancedMeshes, scene) {
        instancedMeshes.forEach(mesh => {
            scene.remove(mesh);
            mesh.geometry.dispose();
            // NO disposar material - se reutiliza desde pool
        });
        instancedMeshes.clear();
    }
    
    /**
     * Limpiar pool de materiales
     * Llamar cuando se limpia completamente la escena
     */
    clearMaterialPool() {
        this.materialPool.forEach(material => {
            material.dispose();
        });
        this.materialPool.clear();
    }
    
    /**
     * Calcular posición 3D de una partícula desde coordenadas de celda
     * @private
     * @param {Object} particle - Partícula con celda_x, celda_y, celda_z
     * @param {number} cellSize - Tamaño de celda en metros
     * @returns {{x: number, y: number, z: number}} - Posición 3D en metros
     */
    _calculateParticlePosition(particle, cellSize) {
        return {
            x: particle.celda_x * cellSize + cellSize / 2,
            y: particle.celda_z * cellSize + cellSize / 2,
            z: particle.celda_y * cellSize + cellSize / 2
        };
    }
    
    /**
     * Configurar matriz para ocultar una partícula (moverla fuera de vista)
     * @private
     * @param {THREE.Matrix4} matrix - Matriz a configurar
     * @returns {THREE.Matrix4} - Matriz configurada
     */
    _setHiddenParticleMatrix(matrix) {
        matrix.setPosition(HIDDEN_PARTICLE_POSITION, HIDDEN_PARTICLE_POSITION, HIDDEN_PARTICLE_POSITION);
        return matrix;
    }
    
    /**
     * Actualizar instancia de partícula individual
     * @param {string} particleId - ID de la partícula
     * @param {Object|null} newData - Nuevos datos (null = eliminar)
     * @param {Map<string, THREE.InstancedMesh>} instancedMeshes - Map de meshes actuales
     * @param {number} cellSize - Tamaño de celda
     * @returns {boolean} - true si se actualizó exitosamente
     */
    updateParticleInstance(particleId, newData, instancedMeshes, cellSize) {
        const index = this.particleIndex.get(particleId);
        if (!index) {
            debugLogger.warn('ParticleRenderer', 'Partícula no encontrada en índice', { particleId });
            return false;
        }
        
        const mesh = instancedMeshes.get(index.meshKey);
        if (!mesh) {
            debugLogger.warn('ParticleRenderer', 'Mesh no encontrado', { meshKey: index.meshKey, particleId });
            return false;
        }
        
        const matrix = new THREE.Matrix4();
        
        if (newData === null) {
            // Eliminar: Mover instancia fuera de vista (o usar escala 0)
            this._setHiddenParticleMatrix(matrix);
        } else {
            // Actualizar posición
            const pos = this._calculateParticlePosition(newData, cellSize);
            matrix.setPosition(pos.x, pos.y, pos.z);
        }
        
        mesh.setMatrixAt(index.instanceIndex, matrix);
        mesh.instanceMatrix.needsUpdate = true;
        
        return true;
    }
    
    /**
     * Actualizar múltiples partículas en batch
     * @param {Array<string>} particleIds - IDs de partículas
     * @param {Array<Object|null>} newDataArray - Array de nuevos datos
     * @param {Map<string, THREE.InstancedMesh>} instancedMeshes - Map de meshes actuales
     * @param {number} cellSize - Tamaño de celda
     * @returns {boolean} - true si se actualizó exitosamente
     */
    updateParticleInstances(particleIds, newDataArray, instancedMeshes, cellSize) {
        // Validaciones
        if (!Array.isArray(particleIds) || !Array.isArray(newDataArray)) {
            debugLogger.error('ParticleRenderer', 'updateParticleInstances: particleIds y newDataArray deben ser arrays', {
                particleIdsType: typeof particleIds,
                newDataArrayType: typeof newDataArray
            });
            return false;
        }
        
        if (particleIds.length !== newDataArray.length) {
            debugLogger.error('ParticleRenderer', 'updateParticleInstances: arrays deben tener la misma longitud', {
                particleIdsLength: particleIds.length,
                newDataArrayLength: newDataArray.length
            });
            return false;
        }
        
        if (particleIds.length === 0) {
            debugLogger.warn('ParticleRenderer', 'updateParticleInstances: arrays vacíos');
            return true; // No hay nada que actualizar, pero es válido
        }
        
        if (!instancedMeshes || !(instancedMeshes instanceof Map)) {
            debugLogger.error('ParticleRenderer', 'updateParticleInstances: instancedMeshes debe ser un Map válido');
            return false;
        }
        
        if (typeof cellSize !== 'number' || cellSize <= 0) {
            debugLogger.error('ParticleRenderer', 'updateParticleInstances: cellSize debe ser un número positivo', { cellSize });
            return false;
        }
        
        const updatesByMesh = new Map(); // Agrupar actualizaciones por mesh
        
        particleIds.forEach((particleId, index) => {
            const particleIndex = this.particleIndex.get(particleId);
            if (!particleIndex) return;
            
            const meshKey = particleIndex.meshKey;
            if (!updatesByMesh.has(meshKey)) {
                updatesByMesh.set(meshKey, []);
            }
            
            updatesByMesh.get(meshKey).push({
                instanceIndex: particleIndex.instanceIndex,
                newData: newDataArray[index]
            });
        });
        
        // Aplicar actualizaciones por mesh
        updatesByMesh.forEach((updates, meshKey) => {
            const mesh = instancedMeshes.get(meshKey);
            if (!mesh) return;
            
            const matrix = new THREE.Matrix4();
            
            updates.forEach(({ instanceIndex, newData }) => {
                matrix.identity(); // Resetear matriz antes de cada uso
                
                if (newData === null) {
                    this._setHiddenParticleMatrix(matrix);
                } else {
                    const pos = this._calculateParticlePosition(newData, cellSize);
                    matrix.setPosition(pos.x, pos.y, pos.z);
                }
                
                mesh.setMatrixAt(instanceIndex, matrix);
            });
            
            mesh.instanceMatrix.needsUpdate = true;
        });
        
        return true;
    }
}
