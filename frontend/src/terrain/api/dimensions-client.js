/**
 * Cliente API para dimensiones (wrapper)
 * 
 * Wrapper alrededor de DimensionsApi para uso con TerrainManager
 */

/**
 * Cliente de dimensiones para terreno
 */
export class DimensionsClient {
    /**
     * @param {Object} dimensionsApi - Instancia de DimensionsApi
     */
    constructor(dimensionsApi) {
        this.api = dimensionsApi;
    }
    
    /**
     * Obtener todas las dimensiones
     * @returns {Promise<Array>}
     */
    async getDimensions() {
        return this.api.getDimensions();
    }
    
    /**
     * Obtener dimensión por nombre
     * @param {string} name - Nombre de la dimensión
     * @returns {Promise<Object|null>}
     */
    async getDimensionByName(name) {
        const dimensions = await this.api.getDimensions();
        return dimensions.find(d => d.nombre === name) || null;
    }
    
    /**
     * Obtener dimensión por ID
     * @param {string} id - ID de la dimensión
     * @returns {Promise<Object|null>}
     */
    async getDimensionById(id) {
        const dimensions = await this.api.getDimensions();
        return dimensions.find(d => d.id === id) || null;
    }
}
