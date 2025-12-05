/**
 * Endpoints específicos para partículas
 */
import { ApiClient } from '../client.js';

export class ParticlesApi {
    /**
     * @param {ApiClient} client - Cliente API base
     */
    constructor(client) {
        this.client = client;
    }
    
    /**
     * Obtener partículas por viewport
     * @param {string} dimensionId - ID de la dimensión
     * @param {Object} viewport - Viewport con x_min, x_max, y_min, y_max, z_min, z_max
     * @returns {Promise<Object>} - Respuesta con partículas y metadatos
     */
    async getParticles(dimensionId, viewport) {
        const { x_min, x_max, y_min, y_max, z_min, z_max } = viewport;
        const endpoint = `/dimensions/${dimensionId}/particles?` +
            `x_min=${x_min}&x_max=${x_max}&y_min=${y_min}&y_max=${y_max}&z_min=${z_min}&z_max=${z_max}`;
        
        try {
            return await this.client.get(endpoint);
        } catch (error) {
            throw new Error(`Error al obtener partículas: ${error.message}`);
        }
    }
    
    /**
     * Obtener tipos de partículas con estilos por viewport
     * @param {string} dimensionId - ID de la dimensión
     * @param {Object} viewport - Viewport con x_min, x_max, y_min, y_max, z_min, z_max
     * @returns {Promise<Object>} - Respuesta con tipos y estilos
     */
    async getParticleTypes(dimensionId, viewport) {
        const { x_min, x_max, y_min, y_max, z_min, z_max } = viewport;
        const endpoint = `/dimensions/${dimensionId}/particle-types?` +
            `x_min=${x_min}&x_max=${x_max}&y_min=${y_min}&y_max=${y_max}&z_min=${z_min}&z_max=${z_max}`;
        
        try {
            return await this.client.get(endpoint);
        } catch (error) {
            throw new Error(`Error al obtener tipos: ${error.message}`);
        }
    }
}

