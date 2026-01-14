/**
 * Sistema de actualización dinámica de partículas
 * 
 * Maneja la actualización, adición y eliminación de partículas cuando
 * los personajes interactúan con el terreno (romper, colocar, modificar)
 */
import { debugLogger } from '../../debug/logger.js';

/**
 * Sistema de actualización de partículas
 */
export class UpdateSystem {
    /**
     * @param {Object} particlesApi - Cliente API para partículas
     */
    constructor(particlesApi) {
        this.particlesApi = particlesApi;
    }
    
    /**
     * Actualizar partícula en backend
     * @param {string} particleId - ID de la partícula
     * @param {Object|null} newData - Nuevos datos (null = eliminar)
     * @returns {Promise<void>}
     */
    async updateParticleInBackend(particleId, newData) {
        // TODO: Implementar llamada API cuando el backend soporte actualización
        // Por ahora, solo log
        if (newData === null) {
            debugLogger.info('UpdateSystem', 'Eliminar partícula', { particleId });
        } else {
            debugLogger.info('UpdateSystem', 'Actualizar partícula', { particleId, newData });
        }
    }
    
    /**
     * Actualizar múltiples partículas en backend (batch)
     * @param {string[]} particleIds - IDs de partículas
     * @param {Array<Object|null>} newDataArray - Array de nuevos datos
     * @returns {Promise<void>}
     */
    async updateParticlesBatch(particleIds, newDataArray) {
        // TODO: Implementar llamada API batch cuando el backend lo soporte
        debugLogger.info('UpdateSystem', 'Actualizar partículas en batch', { count: particleIds.length });
    }
    
    /**
     * Actualizar renderizado de una partícula individual (incremental)
     * @param {string} particleId - ID de la partícula
     * @param {Object|null} newData - Nuevos datos (null = eliminar)
     * @param {Map<string, THREE.InstancedMesh>} currentMeshes - Map de meshes actuales
     * @param {ParticleRenderer} renderer - Renderer de partículas
     * @param {number} cellSize - Tamaño de celda
     */
    updateParticleRender(particleId, newData, currentMeshes, renderer, cellSize) {
        // Validaciones
        if (!particleId || typeof particleId !== 'string') {
            debugLogger.error('UpdateSystem', 'updateParticleRender: particleId debe ser un string no vacío', { particleId });
            return false;
        }
        
        if (!currentMeshes || !(currentMeshes instanceof Map)) {
            debugLogger.error('UpdateSystem', 'updateParticleRender: currentMeshes debe ser un Map válido');
            return false;
        }
        
        if (!renderer) {
            debugLogger.error('UpdateSystem', 'updateParticleRender: renderer es requerido');
            return false;
        }
        
        if (typeof cellSize !== 'number' || cellSize <= 0) {
            debugLogger.error('UpdateSystem', 'updateParticleRender: cellSize debe ser un número positivo', { cellSize });
            return false;
        }
        
        // Usar actualización incremental
        const success = renderer.updateParticleInstance(
            particleId,
            newData,
            currentMeshes,
            cellSize
        );
        
        if (!success) {
            debugLogger.warn('UpdateSystem', 'No se pudo actualizar partícula incrementalmente', { particleId });
            // Fallback: Podría recargar si es necesario (comentado por ahora)
            // return false;
        }
        
        return success;
    }
    
    /**
     * Actualizar renderizado de múltiples partículas (batch)
     * @param {Array<string>} particleIds - IDs de partículas
     * @param {Array<Object|null>} newDataArray - Array de nuevos datos
     * @param {Map<string, THREE.InstancedMesh>} currentMeshes - Map de meshes actuales
     * @param {ParticleRenderer} renderer - Renderer de partículas
     * @param {number} cellSize - Tamaño de celda
     */
    updateParticlesRender(particleIds, newDataArray, currentMeshes, renderer, cellSize) {
        if (!renderer || !currentMeshes) {
            debugLogger.warn('UpdateSystem', 'Renderer o meshes no disponibles para actualización incremental');
            return;
        }
        
        // Usar actualización incremental en batch
        const success = renderer.updateParticleInstances(
            particleIds,
            newDataArray,
            currentMeshes,
            cellSize
        );
        
        return success;
    }
}
