/**
 * Endpoints específicos para agrupaciones
 */
import { ApiClient } from '../client.js';

export class AgrupacionesApi {
    /**
     * @param {ApiClient} client - Cliente API base
     */
    constructor(client) {
        this.client = client;
    }
    
    /**
     * Obtener todas las agrupaciones de una dimensión
     * @param {string} dimensionId - ID de la dimensión
     * @returns {Promise<Array>} - Lista de agrupaciones
     */
    async getAgrupaciones(dimensionId) {
        try {
            return await this.client.get(`/dimensions/${dimensionId}/agrupaciones`);
        } catch (error) {
            throw new Error(`Error al obtener agrupaciones: ${error.message}`);
        }
    }
    
    /**
     * Obtener una agrupación específica con sus partículas
     * @param {string} dimensionId - ID de la dimensión
     * @param {string} agrupacionId - ID de la agrupación
     * @returns {Promise<Object>} - Agrupación con partículas
     */
    async getAgrupacion(dimensionId, agrupacionId) {
        try {
            return await this.client.get(`/dimensions/${dimensionId}/agrupaciones/${agrupacionId}`);
        } catch (error) {
            throw new Error(`Error al obtener agrupación: ${error.message}`);
        }
    }
}

