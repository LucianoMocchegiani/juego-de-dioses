/**
 * Endpoints específicos para personajes (bípedos)
 */
import { ApiClient } from '../client.js';

export class CharactersApi {
    /**
     * @param {ApiClient} client - Cliente API base
     */
    constructor(client) {
        this.client = client;
    }
    
    /**
     * Obtener información de un personaje
     * @param {string} dimensionId - ID de la dimensión
     * @param {string} characterId - ID del personaje (agrupación)
     * @returns {Promise<Object>} - Información del personaje
     */
    async getCharacter(dimensionId, characterId) {
        const endpoint = `/dimensions/${dimensionId}/characters/${characterId}`;
        
        try {
            return await this.client.get(endpoint);
        } catch (error) {
            console.error('Error al obtener personaje:', error);
            throw new Error(`Error al obtener personaje: ${error.message}`);
        }
    }
    
    /**
     * Listar todos los personajes en una dimensión
     * @param {string} dimensionId - ID de la dimensión
     * @returns {Promise<Array>} - Lista de personajes
     */
    async listCharacters(dimensionId) {
        const endpoint = `/dimensions/${dimensionId}/characters`;
        
        try {
            return await this.client.get(endpoint);
        } catch (error) {
            console.error('Error al listar personajes:', error);
            throw new Error(`Error al listar personajes: ${error.message}`);
        }
    }
    
    /**
     * Crear un personaje desde un template
     * @param {string} dimensionId - ID de la dimensión
     * @param {string} templateId - ID del template (ej: 'humano')
     * @param {number} x - Posición X en celdas
     * @param {number} y - Posición Y en celdas
     * @param {number} z - Posición Z en celdas
     * @returns {Promise<Object>} - Información del personaje creado
     */
    async createCharacter(dimensionId, templateId, x, y, z) {
        const endpoint = `/dimensions/${dimensionId}/characters`;
        
        try {
            return await this.client.post(endpoint, {
                template_id: templateId,
                x,
                y,
                z
            });
        } catch (error) {
            console.error('Error al crear personaje:', error);
            throw new Error(`Error al crear personaje: ${error.message}`);
        }
    }
}

// Funciones helper para uso directo (sin instanciar clase)
let defaultClient = null;

/**
 * Inicializar cliente por defecto
 * @param {ApiClient} client - Cliente API base
 */
export function initCharactersApi(client) {
    defaultClient = new CharactersApi(client);
}

/**
 * Obtener información de un personaje (función helper)
 * @param {string} dimensionId - ID de la dimensión
 * @param {string} characterId - ID del personaje
 * @returns {Promise<Object>} - Información del personaje
 */
export async function getCharacter(dimensionId, characterId) {
    if (!defaultClient) {
        throw new Error('CharactersApi no inicializado. Llama a initCharactersApi() primero.');
    }
    return await defaultClient.getCharacter(dimensionId, characterId);
}

/**
 * Listar todos los personajes en una dimensión (función helper)
 * @param {string} dimensionId - ID de la dimensión
 * @returns {Promise<Array>} - Lista de personajes
 */
export async function listCharacters(dimensionId) {
    if (!defaultClient) {
        throw new Error('CharactersApi no inicializado. Llama a initCharactersApi() primero.');
    }
    return await defaultClient.listCharacters(dimensionId);
}

/**
 * Crear un personaje desde un template (función helper)
 * @param {string} dimensionId - ID de la dimensión
 * @param {string} templateId - ID del template (ej: 'humano')
 * @param {number} x - Posición X en celdas
 * @param {number} y - Posición Y en celdas
 * @param {number} z - Posición Z en celdas
 * @returns {Promise<Object>} - Información del personaje creado
 */
export async function createCharacter(dimensionId, templateId, x, y, z) {
    if (!defaultClient) {
        throw new Error('CharactersApi no inicializado. Llama a initCharactersApi() primero.');
    }
    return await defaultClient.createCharacter(dimensionId, templateId, x, y, z);
}

