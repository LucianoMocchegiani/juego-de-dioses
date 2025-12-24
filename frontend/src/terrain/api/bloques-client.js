/**
 * Cliente API para bloques (wrapper)
 * 
 * Wrapper alrededor de BloquesApi para uso con TerrainManager
 */

/**
 * Cliente de bloques para terreno
 */
export class BloquesClient {
    /**
     * @param {Object} bloquesApi - Instancia de BloquesApi
     */
    constructor(bloquesApi) {
        this.api = bloquesApi;
    }
    
    /**
     * Obtener todos los bloques
     * @returns {Promise<Array>}
     */
    async getDimensions() {
        return this.api.getDimensions();
    }
    
    /**
     * Obtener bloque por nombre
     * @param {string} name - Nombre del bloque
     * @returns {Promise<Object|null>}
     */
    async getDimensionByName(name) {
        const dimensions = await this.api.getDimensions();
        return dimensions.find(d => d.nombre === name) || null;
    }
    
    /**
     * Obtener bloque por ID
     * @param {string} id - ID del bloque
     * @returns {Promise<Object|null>}
     */
    async getDimensionById(id) {
        const dimensions = await this.api.getDimensions();
        return dimensions.find(d => d.id === id) || null;
    }
}

