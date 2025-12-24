/**
 * Cliente API para partículas (wrapper)
 * 
 * Wrapper alrededor de ParticlesApi para uso con TerrainManager
 */

/**
 * Cliente de partículas para terreno
 */
export class ParticlesClient {
    /**
     * @param {Object} particlesApi - Instancia de ParticlesApi
     */
    constructor(particlesApi) {
        this.api = particlesApi;
    }
    
    /**
     * Obtener partículas de un bloque en un viewport
     * @param {string} bloqueId - ID del bloque
     * @param {Object} viewport - Viewport
     * @returns {Promise<Object>} - { particles: Array }
     */
    async getParticles(bloqueId, viewport) {
        return this.api.getParticles(bloqueId, viewport);
    }
    
    /**
     * Obtener tipos de partículas de un bloque en un viewport
     * @param {string} bloqueId - ID del bloque
     * @param {Object} viewport - Viewport
     * @returns {Promise<Object>} - { types: Array }
     */
    async getParticleTypes(bloqueId, viewport) {
        return this.api.getParticleTypes(bloqueId, viewport);
    }
    
    /**
     * Actualizar partícula (futuro: cuando el backend soporte actualización)
     * @param {string} bloqueId - ID del bloque
     * @param {string} particleId - ID de la partícula
     * @param {Object} data - Nuevos datos
     * @returns {Promise<void>}
     */
    async updateParticle(bloqueId, particleId, data) {
        // TODO: Implementar cuando el backend soporte actualización
        throw new Error('updateParticle not yet implemented');
    }
    
    /**
     * Eliminar partícula (futuro: cuando el backend soporte eliminación)
     * @param {string} bloqueId - ID del bloque
     * @param {string} particleId - ID de la partícula
     * @returns {Promise<void>}
     */
    async deleteParticle(bloqueId, particleId) {
        // TODO: Implementar cuando el backend soporte eliminación
        throw new Error('deleteParticle not yet implemented');
    }
}
