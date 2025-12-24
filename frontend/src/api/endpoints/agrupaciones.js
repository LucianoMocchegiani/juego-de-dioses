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
     * Obtener todas las agrupaciones de un bloque
     * @param {string} bloqueId - ID del bloque
     * @returns {Promise<Array>} - Lista de agrupaciones
     */
    async getAgrupaciones(bloqueId) {
        try {
            return await this.client.get(`/bloques/${bloqueId}/agrupaciones`);
        } catch (error) {
            throw new Error(`Error al obtener agrupaciones: ${error.message}`);
        }
    }
    
    /**
     * Obtener una agrupación específica con sus partículas
     * @param {string} bloqueId - ID del bloque
     * @param {string} agrupacionId - ID de la agrupación
     * @returns {Promise<Object>} - Agrupación con partículas
     */
    async getAgrupacion(bloqueId, agrupacionId) {
        try {
            return await this.client.get(`/bloques/${bloqueId}/agrupaciones/${agrupacionId}`);
        } catch (error) {
            throw new Error(`Error al obtener agrupación: ${error.message}`);
        }
    }
}

