/**
 * Adapter HTTP: World/Blocs API (port worldApi)
 */

export class HttpBloquesApi {
    constructor(client) {
        this.client = client;
    }

    async getDimensions() {
        try {
            return await this.client.get('/bloques');
        } catch (error) {
            throw new Error(`Error al obtener bloques: ${error.message}`);
        }
    }

    async getDimension(bloqueId) {
        try {
            return await this.client.get(`/bloques/${bloqueId}`);
        } catch (error) {
            throw new Error(`Error al obtener bloque: ${error.message}`);
        }
    }

    async getWorldSize() {
        try {
            return await this.client.get('/bloques/world/size');
        } catch (error) {
            throw new Error(`Error al obtener tamaño del mundo: ${error.message}`);
        }
    }
}
