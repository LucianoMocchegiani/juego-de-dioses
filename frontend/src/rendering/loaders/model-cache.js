/**
 * Cache de modelos 3D usando Registry pattern
 * 
 * Almacena modelos cargados para evitar recargas innecesarias.
 * Usa Singleton pattern para un cache global.
 */
export class ModelCache {
    /**
     * Crear instancia de ModelCache
     */
    constructor() {
        this.cache = new Map(); // URL -> THREE.Group
    }
    
    /**
     * Obtener modelo del cache (clonado)
     * @param {string} url - URL del modelo
     * @returns {THREE.Group|null} Modelo cacheado clonado o null
     */
    get(url) {
        const cached = this.cache.get(url);
        if (cached) {
            // Clonar para evitar modificar el original
            return cached.clone();
        }
        return null;
    }
    
    /**
     * Verificar si modelo está en cache
     * @param {string} url - URL del modelo
     * @returns {boolean}
     */
    has(url) {
        return this.cache.has(url);
    }
    
    /**
     * Agregar modelo al cache
     * @param {string} url - URL del modelo
     * @param {THREE.Group} model - Modelo Three.js
     */
    set(url, model) {
        this.cache.set(url, model);
    }
    
    /**
     * Limpiar cache
     */
    clear() {
        this.cache.clear();
    }
    
    /**
     * Obtener tamaño del cache
     * @returns {number} Cantidad de modelos en cache
     */
    size() {
        return this.cache.size;
    }
    
    /**
     * Singleton instance
     * @returns {ModelCache} Instancia única del cache
     */
    static getInstance() {
        if (!ModelCache.instance) {
            ModelCache.instance = new ModelCache();
        }
        return ModelCache.instance;
    }
}
