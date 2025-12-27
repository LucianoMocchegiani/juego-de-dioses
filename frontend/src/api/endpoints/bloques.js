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
    
    /**
     * Obtener el tamaño total del mundo (todos los bloques combinados)
     * @returns {Promise<Object>} - Tamaño del mundo:
     *   {
     *     ancho_total: number,    // Ancho total en metros
     *     alto_total: number,     // Alto total en metros
     *     radio_mundo: number,   // Radio del mundo en metros
     *     min_x: number,         // Coordenada X mínima
     *     max_x: number,         // Coordenada X máxima
     *     min_y: number,        // Coordenada Y mínima
     *     max_y: number,        // Coordenada Y máxima
     *     centro_x: number,      // Coordenada X del centro
     *     centro_y: number       // Coordenada Y del centro
     *   }
     */
    async getWorldSize() {
        try {
            return await this.client.get('/bloques/world/size');
        } catch (error) {
            throw new Error(`Error al obtener tamaño del mundo: ${error.message}`);
        }
    }
}

