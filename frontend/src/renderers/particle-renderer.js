/**
 * Renderizador genérico de partículas con soporte de formas geométricas
 */
import * as THREE from 'three';
import { BaseRenderer } from './base-renderer.js';

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
    }
    
    /**
     * Crear clave única para geometría+material
     * @param {string} geometryType - Tipo de geometría
     * @param {Object} geometryParams - Parámetros de geometría (serializados)
     * @param {ParticleStyle} estilo - Estilo de la partícula
     * @returns {string} - Clave única
     */
    getGeometryKey(geometryType, geometryParams, estilo) {
        const paramsStr = JSON.stringify(geometryParams || {});
        return `${geometryType}_${paramsStr}_${estilo.metalness}_${estilo.roughness}_${estilo.opacity || 1.0}`;
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
     * @returns {Map<string, THREE.InstancedMesh>} - Map de instanced meshes creados
     */
    renderParticles(particles, tiposEstilos, agrupacionesGeometria, cellSize, scene) {
        // Ordenar partículas por profundidad (celda_z) de mayor a menor
        // Esto asegura que las partículas más profundas se rendericen primero
        // y las más superficiales se rendericen encima
        const sortedParticles = [...particles].sort((a, b) => {
            // Ordenar por celda_z descendente (mayor z primero = más profundo primero)
            return b.celda_z - a.celda_z;
        });
        
        // Agrupar partículas por geometría+material para instanced rendering
        const particlesByGeometry = new Map();
        
        sortedParticles.forEach((particle) => {
            const tipoEstilos = tiposEstilos.get(particle.tipo);
            const agrupacionGeom = agrupacionesGeometria?.get(particle.agrupacion_id);
            
            // Obtener geometría según prioridad
            const geometry = this.getGeometry(particle, tipoEstilos, agrupacionGeom, cellSize);
            
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
            
            // Crear clave única para geometría+material
            const geometryKey = this.getGeometryKey(geometryType, geometryParams, estilo);
            
            if (!particlesByGeometry.has(geometryKey)) {
                particlesByGeometry.set(geometryKey, {
                    geometry: geometry,
                    estilo: estilo,
                    particles: []
                });
            }
            
            particlesByGeometry.get(geometryKey).particles.push(particle);
        });
        
        // Ordenar partículas dentro de cada grupo por profundidad
        particlesByGeometry.forEach((group) => {
            group.particles.sort((a, b) => b.celda_z - a.celda_z);
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
        
        // Ordenar grupos transparentes por profundidad (más profundos primero)
        transparentGroups.sort((a, b) => b.avgDepth - a.avgDepth);
        
        // Crear instanced meshes para cada grupo
        const MAX_INSTANCES_PER_MESH = 50000; // Reducido de 100k para mejor rendimiento
        const instancedMeshes = new Map();
        
        // Renderizar primero grupos opacos, luego transparentes
        const groupsToRender = [...opaqueGroups, ...transparentGroups];
        
        groupsToRender.forEach(({ group, geometryKey }) => {
            const count = group.particles.length;
            
            // Crear material
            const material = this.createMaterial(group.estilo);
            
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
                // Ordenar partículas del chunk por celda_z para mejor orden de renderizado
                const sortedChunk = [...particlesChunk].sort((a, b) => b.celda_z - a.celda_z);
                
                const matrix = new THREE.Matrix4();
                sortedChunk.forEach((particle, index) => {
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
        
        console.log(`Renderizadas ${particles.length} partículas en ${particlesByGeometry.size} grupos instanciados`);
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
            mesh.material.dispose();
        });
        instancedMeshes.clear();
    }
}

