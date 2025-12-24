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
     * @param {string} bloqueId - ID del bloque
     * @param {string} characterId - ID del personaje (agrupación)
     * @returns {Promise<Object>} - Información del personaje
     */
    async getCharacter(bloqueId, characterId) {
        const endpoint = `/bloques/${bloqueId}/characters/${characterId}`;
        
        try {
            return await this.client.get(endpoint);
        } catch (error) {
            // console.error('Error al obtener personaje:', error);
            throw new Error(`Error al obtener personaje: ${error.message}`);
        }
    }
    
    /**
     * Listar todos los personajes en un bloque
     * @param {string} bloqueId - ID del bloque
     * @returns {Promise<Array>} - Lista de personajes
     */
    async listCharacters(bloqueId) {
        const endpoint = `/bloques/${bloqueId}/characters`;
        
        try {
            return await this.client.get(endpoint);
        } catch (error) {
            // console.error('Error al listar personajes:', error);
            throw new Error(`Error al listar personajes: ${error.message}`);
        }
    }
    
    /**
     * Crear un personaje desde un template
     * @param {string} bloqueId - ID del bloque
     * @param {string} templateId - ID del template (ej: 'humano')
     * @param {number} x - Posición X en celdas
     * @param {number} y - Posición Y en celdas
     * @param {number} z - Posición Z en celdas
     * @returns {Promise<Object>} - Información del personaje creado
     */
    async createCharacter(bloqueId, templateId, x, y, z) {
        const endpoint = `/bloques/${bloqueId}/characters`;
        
        try {
            return await this.client.post(endpoint, {
                template_id: templateId,
                x,
                y,
                z
            });
        } catch (error) {
            // console.error('Error al crear personaje:', error);
            throw new Error(`Error al crear personaje: ${error.message}`);
        }
    }
    
    /**
     * Obtener URL y metadatos del modelo 3D de un personaje
     * @param {string} bloqueId - ID del bloque
     * @param {string} characterId - ID del personaje
     * @returns {Promise<Object>} - { model_url, metadata }
     */
    async getCharacterModel(bloqueId, characterId) {
        const endpoint = `/bloques/${bloqueId}/characters/${characterId}/model`;
        
        try {
            return await this.client.get(endpoint);
        } catch (error) {
            // console.error('Error al obtener modelo del personaje:', error);
            throw new Error(`Error al obtener modelo del personaje: ${error.message}`);
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
 * @param {string} bloqueId - ID del bloque
 * @param {string} characterId - ID del personaje
 * @returns {Promise<Object>} - Información del personaje
 */
export async function getCharacter(bloqueId, characterId) {
    if (!defaultClient) {
        throw new Error('CharactersApi no inicializado. Llama a initCharactersApi() primero.');
    }
    return await defaultClient.getCharacter(bloqueId, characterId);
}

/**
 * Listar todos los personajes en un bloque (función helper)
 * @param {string} bloqueId - ID del bloque
 * @returns {Promise<Array>} - Lista de personajes
 */
export async function listCharacters(bloqueId) {
    if (!defaultClient) {
        throw new Error('CharactersApi no inicializado. Llama a initCharactersApi() primero.');
    }
    return await defaultClient.listCharacters(bloqueId);
}

/**
 * Crear un personaje desde un template (función helper)
 * @param {string} bloqueId - ID del bloque
 * @param {string} templateId - ID del template (ej: 'humano')
 * @param {number} x - Posición X en celdas
 * @param {number} y - Posición Y en celdas
 * @param {number} z - Posición Z en celdas
 * @returns {Promise<Object>} - Información del personaje creado
 */
export async function createCharacter(bloqueId, templateId, x, y, z) {
    if (!defaultClient) {
        throw new Error('CharactersApi no inicializado. Llama a initCharactersApi() primero.');
    }
    return await defaultClient.createCharacter(bloqueId, templateId, x, y, z);
}

/**
 * Obtener URL y metadatos del modelo 3D de un personaje (función helper)
 * @param {string} bloqueId - ID del bloque
 * @param {string} characterId - ID del personaje
 * @returns {Promise<Object>} - { model_url, metadata }
 */
export async function getCharacterModel(bloqueId, characterId) {
    if (!defaultClient) {
        throw new Error('CharactersApi no inicializado. Llama a initCharactersApi() primero.');
    }
    return await defaultClient.getCharacterModel(bloqueId, characterId);
}

