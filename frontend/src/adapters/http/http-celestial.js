/**
 * Adapter HTTP: Celestial API (port celestialApi)
 */

export class HttpCelestialApi {
    constructor(client) {
        this.client = client;
    }

    async getState() {
        try {
            return await this.client.get('/celestial/state');
        } catch (error) {
            throw new Error(`Error al obtener estado celestial: ${error.message}`);
        }
    }

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
