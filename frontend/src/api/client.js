/**
 * Cliente API base con configuración
 * 
 * Si se sirve desde nginx (Docker), usa rutas relativas (/api/)
 * Si se sirve localmente, usa la URL completa del backend
 */
import { API_BASE_URL } from '../utils/config.js';

export class ApiClient {
    /**
     * @param {string} baseUrl - URL base del API (default: detecta automáticamente)
     */
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }
    
    /**
     * Realizar request genérico al API
     * @param {string} endpoint - Endpoint relativo (ej: '/bloques')
     * @param {RequestInit} options - Opciones de fetch (method, body, headers, etc.)
     * @returns {Promise<any>} - Respuesta parseada como JSON
     * @throws {Error} - Si la respuesta no es exitosa
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    /**
     * Realizar GET request
     * @param {string} endpoint - Endpoint relativo
     * @returns {Promise<any>} - Respuesta parseada como JSON
     */
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }
    
    /**
     * Realizar POST request
     * @param {string} endpoint - Endpoint relativo
     * @param {any} body - Cuerpo de la request (se serializa a JSON)
     * @returns {Promise<any>} - Respuesta parseada como JSON
     */
    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    
    /**
     * Realizar PUT request
     * @param {string} endpoint - Endpoint relativo
     * @param {any} body - Cuerpo de la request (se serializa a JSON)
     * @returns {Promise<any>} - Respuesta parseada como JSON
     */
    async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }
    
    /**
     * Realizar DELETE request
     * @param {string} endpoint - Endpoint relativo
     * @returns {Promise<any>} - Respuesta parseada como JSON
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

