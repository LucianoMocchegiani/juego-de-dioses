/**
 * Cliente API para comunicarse con el backend
 * 
 * Si se sirve desde nginx (Docker), usa rutas relativas (/api/)
 * Si se sirve localmente, usa la URL completa del backend
 */
const API_BASE_URL = window.location.hostname === 'localhost' && window.location.port === '8080'
    ? '/api/v1'  // Nginx proxy (Docker)
    : 'http://localhost:8000/api/v1';  // Desarrollo local directo

class ApiClient {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    async getDimensions() {
        const response = await fetch(`${this.baseUrl}/dimensions`);
        if (!response.ok) {
            throw new Error(`Error al obtener dimensiones: ${response.statusText}`);
        }
        return await response.json();
    }

    async getDimension(dimensionId) {
        const response = await fetch(`${this.baseUrl}/dimensions/${dimensionId}`);
        if (!response.ok) {
            throw new Error(`Error al obtener dimensión: ${response.statusText}`);
        }
        return await response.json();
    }

    async getParticles(dimensionId, viewport) {
        const { x_min, x_max, y_min, y_max, z_min, z_max } = viewport;
        const url = `${this.baseUrl}/dimensions/${dimensionId}/particles?` +
            `x_min=${x_min}&x_max=${x_max}&y_min=${y_min}&y_max=${y_max}&z_min=${z_min}&z_max=${z_max}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error al obtener partículas: ${response.statusText}`);
        }
        return await response.json();
    }

    async getAgrupaciones(dimensionId) {
        const response = await fetch(`${this.baseUrl}/dimensions/${dimensionId}/agrupaciones`);
        if (!response.ok) {
            throw new Error(`Error al obtener agrupaciones: ${response.statusText}`);
        }
        return await response.json();
    }
}

export default ApiClient;

