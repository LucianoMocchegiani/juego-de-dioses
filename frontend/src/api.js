/**
 * Cliente API para comunicarse con el backend
 * 
 * NOTA: Este archivo mantiene compatibilidad temporal con el código existente.
 * El nuevo código debe usar los módulos modulares en api/.
 * 
 * @deprecated Usar { ApiClient, DimensionsApi, ParticlesApi, AgrupacionesApi } from './api/index.js' en su lugar
 */
import { ApiClient as BaseApiClient, DimensionsApi, ParticlesApi, AgrupacionesApi } from './api/index.js';

/**
 * Cliente API con compatibilidad hacia atrás
 * Expone los métodos del cliente antiguo usando los nuevos módulos modulares
 */
class ApiClient {
    constructor(baseUrl) {
        // Crear cliente base y APIs específicos
        this.baseClient = new BaseApiClient(baseUrl);
        this.dimensionsApi = new DimensionsApi(this.baseClient);
        this.particlesApi = new ParticlesApi(this.baseClient);
        this.agrupacionesApi = new AgrupacionesApi(this.baseClient);
    }

    async getDimensions() {
        return this.dimensionsApi.getDimensions();
    }

    async getDimension(dimensionId) {
        return this.dimensionsApi.getDimension(dimensionId);
    }

    async getParticles(dimensionId, viewport) {
        return this.particlesApi.getParticles(dimensionId, viewport);
    }

    async getAgrupaciones(dimensionId) {
        return this.agrupacionesApi.getAgrupaciones(dimensionId);
    }

    async getParticleTypes(dimensionId, viewport) {
        return this.particlesApi.getParticleTypes(dimensionId, viewport);
    }
}

export default ApiClient;

