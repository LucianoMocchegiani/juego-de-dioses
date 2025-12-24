/**
 * Endpoints específicos para bloques
 */
import { ApiClient } from '../client.js';

export class BloquesApi {
    /**
     * @param {ApiClient} client - Cliente API base
     */
    constructor(client) {
        this.client = client;
    }
    
    /**
     * Obtener todos los bloques
     * @returns {Promise<Array>} - Lista de bloques
     */
    async getDimensions() {
        try {
            return await this.client.get('/bloques');
        } catch (error) {
            throw new Error(`Error al obtener bloques: ${error.message}`);
        }
    }
    
    /**
     * Obtener un bloque específico por ID
     * @param {string} bloqueId - ID del bloque
     * @returns {Promise<Object>} - Bloque
     */
    async getDimension(bloqueId) {
        try {
            return await this.client.get(`/bloques/${bloqueId}`);
        } catch (error) {
            throw new Error(`Error al obtener bloque: ${error.message}`);
        }
    }
}

