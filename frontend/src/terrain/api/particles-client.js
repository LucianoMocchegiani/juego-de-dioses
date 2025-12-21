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
     * Obtener partículas de una dimensión en un viewport
     * @param {string} dimensionId - ID de la dimensión
     * @param {Object} viewport - Viewport
     * @returns {Promise<Object>} - { particles: Array }
     */
    async getParticles(dimensionId, viewport) {
        return this.api.getParticles(dimensionId, viewport);
    }
    
    /**
     * Obtener tipos de partículas de una dimensión en un viewport
     * @param {string} dimensionId - ID de la dimensión
     * @param {Object} viewport - Viewport
     * @returns {Promise<Object>} - { types: Array }
     */
    async getParticleTypes(dimensionId, viewport) {
        return this.api.getParticleTypes(dimensionId, viewport);
    }
    
    /**
     * Actualizar partícula (futuro: cuando el backend soporte actualización)
     * @param {string} dimensionId - ID de la dimensión
     * @param {string} particleId - ID de la partícula
     * @param {Object} data - Nuevos datos
     * @returns {Promise<void>}
     */
    async updateParticle(dimensionId, particleId, data) {
        // TODO: Implementar cuando el backend soporte actualización
        throw new Error('updateParticle not yet implemented');
    }
    
    /**
     * Eliminar partícula (futuro: cuando el backend soporte eliminación)
     * @param {string} dimensionId - ID de la dimensión
     * @param {string} particleId - ID de la partícula
     * @returns {Promise<void>}
     */
    async deleteParticle(dimensionId, particleId) {
        // TODO: Implementar cuando el backend soporte eliminación
        throw new Error('deleteParticle not yet implemented');
    }
}
