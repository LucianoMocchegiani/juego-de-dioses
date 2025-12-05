/**
 * Endpoints específicos para dimensiones
 */
import { ApiClient } from '../client.js';

export class DimensionsApi {
    /**
     * @param {ApiClient} client - Cliente API base
     */
    constructor(client) {
        this.client = client;
    }
    
    /**
     * Obtener todas las dimensiones
     * @returns {Promise<Array>} - Lista de dimensiones
     */
    async getDimensions() {
        try {
            return await this.client.get('/dimensions');
        } catch (error) {
            throw new Error(`Error al obtener dimensiones: ${error.message}`);
        }
    }
    
    /**
     * Obtener una dimensión específica por ID
     * @param {string} dimensionId - ID de la dimensión
     * @returns {Promise<Object>} - Dimensión
     */
    async getDimension(dimensionId) {
        try {
            return await this.client.get(`/dimensions/${dimensionId}`);
        } catch (error) {
            throw new Error(`Error al obtener dimensión: ${error.message}`);
        }
    }
}

