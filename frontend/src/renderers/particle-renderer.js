/**
 * Renderizador genérico de partículas con soporte de formas geométricas
 */
import * as THREE from 'three';
import { BaseRenderer } from './base-renderer.js';
import { FrustumCache } from '../utils/culling.js';
import { sortParticlesByDepth } from '../utils/sorting.js';
import { LODManager } from './optimizations/lod-manager.js';
import { ParticleLimiter } from './optimizations/particle-limiter.js';
import { GeometryCache } from '../managers/geometry-cache.js';

/**
 * @typedef {import('../types.js').Particle} Particle
 * @typedef {import('../types.js').ParticleStyle} ParticleStyle
 * @typedef {import('../types.js').TipoEstilosBD} TipoEstilosBD
 */

export class ParticleRenderer extends BaseRenderer {
    /**
     * @param {GeometryRegistry} geometryRegistry - Registry de geometrías
     */
    constructor(geometryRegistry) {
        super(geometryRegistry);
        this.geometryCache = new Map();
        this.frustumCache = new FrustumCache();
        this.lodManager = new LODManager(geometryRegistry);
        this.particleLimiter = new ParticleLimiter(150000); // Límite máximo de partículas
        this.geometryCacheLOD = new GeometryCache(geometryRegistry, this.lodManager);
        this.materialPool = new Map(); // Pool de materiales para reutilización
        this.enableFrustumCulling = true; // Configurable
        this.enableLOD = true; // Configurable
        this.enableParticleLimiting = true; // Configurable
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
        return `${geometryType}_${lodLevel}_${paramsStr}_${estilo.metalness}_${estilo.roughness}_${estilo.opacity || 1.0}`;
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
     * @returns {Map<string, THREE.InstancedMesh>} - Map de instanced meshes creados
     */
    renderParticles(particles, tiposEstilos, agrupacionesGeometria, cellSize, scene, camera = null) {
        // 1. Aplicar frustum culling si está habilitado y se proporciona cámara
        let particlesToRender = particles;
        if (this.enableFrustumCulling && camera) {
            particlesToRender = this.frustumCache.getVisible(
                particles,
                camera,
                cellSize
            );
            
            // Log para debugging (remover en producción o hacer configurable)
            if (particles.length !== particlesToRender.length) {
                const reduction = ((1 - particlesToRender.length / particles.length) * 100).toFixed(1);
                console.log(`Frustum culling: ${particles.length} -> ${particlesToRender.length} partículas (reducción: ${reduction}%)`);
            }
        }
        
        // 2. Aplicar LOD si está habilitado y se proporciona cámara
        if (this.enableLOD && camera) {
            const cameraPosition = camera.position;
            particlesToRender = this.lodManager.applyLOD(
                particlesToRender,
                cameraPosition,
                cellSize
            );
        }
        
        // 2.5. Aplicar limitación agresiva de partículas si está habilitado y se proporciona cámara
        if (this.enableParticleLimiting && camera) {
            const cameraPosition = camera.position;
            const beforeLimit = particlesToRender.length;
            particlesToRender = this.particleLimiter.limitParticles(
                particlesToRender,
                cameraPosition,
                cellSize
            );
            
            // Log para debugging
            if (beforeLimit !== particlesToRender.length) {
                const reduction = ((1 - particlesToRender.length / beforeLimit) * 100).toFixed(1);
                console.log(`Particle limiting: ${beforeLimit} -> ${particlesToRender.length} partículas (reducción: ${reduction}%)`);
            }
        }
        
        // 3. Ordenar partículas por profundidad (celda_z) de mayor a menor
        // Esto asegura que las partículas más profundas se rendericen primero
        // y las más superficiales se rendericen encima
        // OPTIMIZACIÓN: Usar función de ordenamiento optimizada (una sola vez)
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
            } else if (tipoEstilos?.visual?.geometria) {
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
        
        // OPTIMIZACIÓN: No ordenar dentro de cada grupo - ya están ordenadas desde sortedParticles
        // Las partículas se agregaron en orden, así que cada grupo ya está ordenado
        
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
        
        // Ordenar grupos transparentes por profundidad (más profundos primero)
        transparentGroups.sort((a, b) => b.avgDepth - a.avgDepth);
        
        // Crear instanced meshes para cada grupo
        // OPTIMIZACIÓN: Aumentado a 100k para reducir draw calls (probar si es seguro)
        const MAX_INSTANCES_PER_MESH = 100000;
        const instancedMeshes = new Map();
        
        // Renderizar primero grupos opacos, luego transparentes
        const groupsToRender = [...opaqueGroups, ...transparentGroups];
        
        groupsToRender.forEach(({ group, geometryKey }) => {
            const count = group.particles.length;
            
            // OPTIMIZACIÓN: Obtener material desde pool (reutilizar materiales)
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
                
                // Configurar posiciones de instancias
                // OPTIMIZACIÓN: No ordenar chunk - partículas ya están ordenadas desde sortedParticles
                const matrix = new THREE.Matrix4();
                particlesChunk.forEach((particle, index) => {
                    const x = particle.celda_x * cellSize + cellSize / 2;
                    const y = particle.celda_z * cellSize + cellSize / 2;
                    const z = particle.celda_y * cellSize + cellSize / 2;
                    
                    matrix.setPosition(x, y, z);
                    instancedMesh.setMatrixAt(index, matrix);
                });
                
                instancedMesh.instanceMatrix.needsUpdate = true;
                
                // Guardar referencia con índice único
                const meshKey = numMeshes > 1 ? `${geometryKey}_${meshIndex}` : geometryKey;
                instancedMeshes.set(meshKey, instancedMesh);
                scene.add(instancedMesh);
            }
        });
        
        console.log(`Renderizadas ${particlesToRender.length} partículas (de ${particles.length} totales) en ${particlesByGeometry.size} grupos instanciados`);
        return instancedMeshes;
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
        
        const estilo = {
            color: tipoEstilos.color_hex || '#FFFFFF',
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
            // mesh.material.dispose();
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
}

