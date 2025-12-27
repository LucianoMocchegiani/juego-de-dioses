/**
 * Endpoints específicos para tiempo celestial y temperatura
 */
import { ApiClient } from '../client.js';

export class CelestialApi {
    /**
     * @param {ApiClient} client - Cliente API base
     */
    constructor(client) {
        this.client = client;
    }
    
    /**
     * Obtener estado completo del tiempo celestial
     * @returns {Promise<Object>} - Estado celestial:
     *   {
     *     time: number,              // Tiempo del juego en segundos
     *     sun_angle: number,          // Ángulo del sol en radianes
     *     luna_angle: number,        // Ángulo de la luna en radianes
     *     luna_phase: number,         // Fase lunar (0.0 a 1.0)
     *     current_hour: number,       // Hora del día (0-24)
     *     is_daytime: boolean         // Es de día
     *   }
     */
    async getState() {
        try {
            return await this.client.get('/celestial/state');
        } catch (error) {
            throw new Error(`Error al obtener estado celestial: ${error.message}`);
        }
    }
    
    /**
     * Calcular temperatura en una posición específica
     * @param {number} x - Coordenada X en celdas
     * @param {number} y - Coordenada Y en celdas
     * @param {number} z - Coordenada Z (altitud) en celdas
     * @param {string} bloqueId - ID del bloque
     * @param {string} [tipoParticulaSuperficie] - Tipo de partícula dominante (opcional)
     * @returns {Promise<Object>} - Temperatura calculada:
     *   {
     *     temperatura: number,  // Temperatura en grados Celsius
     *     x: number,
     *     y: number,
     *     z: number
     *   }
     */
    async calculateTemperature(x, y, z, bloqueId, tipoParticulaSuperficie = null) {
        try {
            const body = {
                x,
                y,
                z,
                bloque_id: bloqueId
            };
            if (tipoParticulaSuperficie) {
                body.tipo_particula_superficie = tipoParticulaSuperficie;
            }
            return await this.client.post('/celestial/temperature', body);
        } catch (error) {
            throw new Error(`Error al calcular temperatura: ${error.message}`);
        }
    }
}

