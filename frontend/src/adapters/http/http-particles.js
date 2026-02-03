/**
 * Adapter HTTP: Particles API (port particlesApi)
 */

export class HttpParticlesApi {
    constructor(client) {
        this.client = client;
    }

    async getParticles(bloqueId, viewport) {
        const { x_min, x_max, y_min, y_max, z_min, z_max } = viewport;
        const endpoint = `/bloques/${bloqueId}/particles?` +
            `x_min=${x_min}&x_max=${x_max}&y_min=${y_min}&y_max=${y_max}&z_min=${z_min}&z_max=${z_max}`;
        try {
            return await this.client.get(endpoint);
        } catch (error) {
            throw new Error(`Error al obtener partículas: ${error.message}`);
        }
    }

    async getParticleTypes(bloqueId, viewport) {
        const { x_min, x_max, y_min, y_max, z_min, z_max } = viewport;
        const endpoint = `/bloques/${bloqueId}/particle-types?` +
            `x_min=${x_min}&x_max=${x_max}&y_min=${y_min}&y_max=${y_max}&z_min=${z_min}&z_max=${z_max}`;
        try {
            return await this.client.get(endpoint);
        } catch (error) {
            throw new Error(`Error al obtener tipos de partículas: ${error.message}`);
        }
    }
}
