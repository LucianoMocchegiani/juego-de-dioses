/**
 * Adapter HTTP: Agrupaciones API (port agrupacionesApi)
 */

export class HttpAgrupacionesApi {
    constructor(client) {
        this.client = client;
    }

    async getAgrupaciones(bloqueId) {
        try {
            return await this.client.get(`/bloques/${bloqueId}/agrupaciones`);
        } catch (error) {
            throw new Error(`Error al obtener agrupaciones: ${error.message}`);
        }
    }

    async getAgrupacion(bloqueId, agrupacionId) {
        try {
            return await this.client.get(`/bloques/${bloqueId}/agrupaciones/${agrupacionId}`);
        } catch (error) {
            throw new Error(`Error al obtener agrupación: ${error.message}`);
        }
    }
}
