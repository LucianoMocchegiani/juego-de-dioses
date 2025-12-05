/**
 * Gestor de entidades y selección de renderizadores
 */
import { ParticleRenderer } from '../renderers/particle-renderer.js';

/**
 * @typedef {import('../types.js').Particle} Particle
 * @typedef {import('../types.js').TipoEstilosBD} TipoEstilosBD
 */

export class EntityManager {
    /**
     * @param {ParticleRenderer} particleRenderer - Renderizador de partículas (por ahora solo uno)
     */
    constructor(particleRenderer) {
        this.particleRenderer = particleRenderer;
        // Futuro: registry de renderizadores para selección dinámica
        // this.rendererRegistry = rendererRegistry;
    }
    
    /**
     * Seleccionar renderizador apropiado según tipo de entidad
     * Por ahora, siempre retorna ParticleRenderer
     * Futuro: seleccionar TreeRenderer para árboles, PlantRenderer para plantas, etc.
     * 
     * @param {Particle} particle - Partícula
     * @param {TipoEstilosBD} tipoEstilos - Estilos del tipo de partícula
     * @returns {ParticleRenderer} - Renderizador apropiado
     */
    selectRenderer(particle, tipoEstilos) {
        // Por ahora, usar ParticleRenderer para todo
        // Futuro: lógica de selección basada en tipo de entidad
        // if (particle.agrupacion_id && agrupacion.tipo === 'arbol') {
        //     return this.rendererRegistry.get('tree');
        // }
        return this.particleRenderer;
    }
    
    /**
     * Renderizar partículas usando el renderizador apropiado
     * @param {Array<Particle>} particles - Array de partículas
     * @param {Map<string, TipoEstilosBD>} tiposEstilos - Map de estilos por tipo
     * @param {Map<string, Object>} agrupacionesGeometria - Map de geometrías por agrupación (opcional)
     * @param {number} cellSize - Tamaño de celda en metros
     * @param {THREE.Scene} scene - Escena Three.js
     * @param {THREE.Camera} [camera] - Cámara Three.js (opcional, para frustum culling)
     * @returns {Map<string, THREE.InstancedMesh>} - Map de instanced meshes creados
     */
    renderParticles(particles, tiposEstilos, agrupacionesGeometria, cellSize, scene, camera = null) {
        // Por ahora, usar ParticleRenderer para todo
        // Futuro: agrupar por tipo de entidad y usar renderizadores especializados
        return this.particleRenderer.renderParticles(
            particles,
            tiposEstilos,
            agrupacionesGeometria,
            cellSize,
            scene,
            camera
        );
    }
    
    /**
     * Limpiar partículas renderizadas
     * @param {Map<string, THREE.InstancedMesh>} instancedMeshes - Map de meshes a limpiar
     * @param {THREE.Scene} scene - Escena Three.js
     */
    clearParticles(instancedMeshes, scene) {
        this.particleRenderer.clearParticles(instancedMeshes, scene);
    }
}

