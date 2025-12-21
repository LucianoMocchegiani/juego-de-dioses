/**
 * Cache de geometrías LOD para reutilización
 * 
 * Evita recrear geometrías con los mismos parámetros y nivel LOD,
 * mejorando el rendimiento al reutilizar geometrías existentes.
 */
import * as THREE from 'three';

/**
 * Módulo de datos puros para cache de geometrías
 */
export class Geometry {
    /**
     * @param {GeometryRegistry} geometryRegistry - Registry de geometrías
     * @param {LODManager} lodManager - LOD Manager para obtener parámetros LOD
     */
    constructor(geometryRegistry, lodManager) {
        this.geometryRegistry = geometryRegistry;
        this.lodManager = lodManager;
        this.cache = new Map(); // key -> THREE.BufferGeometry
    }
    
    /**
     * Obtener o crear geometría LOD
     * @param {string} geometryType - Tipo de geometría
     * @param {Object} params - Parámetros originales
     * @param {string} lodLevel - Nivel LOD ('high', 'medium', 'low')
     * @param {number} cellSize - Tamaño de celda en metros
     * @returns {THREE.BufferGeometry} - Geometría (cached o nueva)
     */
    getGeometry(geometryType, params, lodLevel, cellSize) {
        const key = this.getCacheKey(geometryType, params, lodLevel);
        
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        
        // Obtener parámetros LOD del LODManager
        const lodParams = this.lodManager.getLODParams(geometryType, params, lodLevel);
        
        // Crear nueva geometría con parámetros LOD
        const geometry = this.geometryRegistry.create(geometryType, lodParams, cellSize);
        
        // Cachear
        this.cache.set(key, geometry);
        return geometry;
    }
    
    /**
     * Generar clave única de cache
     * @param {string} geometryType - Tipo de geometría
     * @param {Object} params - Parámetros originales
     * @param {string} lodLevel - Nivel LOD
     * @returns {string} - Clave única
     */
    getCacheKey(geometryType, params, lodLevel) {
        // Serializar parámetros de forma estable (ordenar keys)
        const sortedParams = {};
        const paramKeys = Object.keys(params || {}).sort();
        paramKeys.forEach(key => {
            sortedParams[key] = params[key];
        });
        const paramsStr = JSON.stringify(sortedParams);
        
        return `${geometryType}_${lodLevel}_${paramsStr}`;
    }
    
    /**
     * Limpiar cache y disposar geometrías
     * 
     * Importante: Llamar este método cuando se limpia la escena para evitar memory leaks
     */
    clear() {
        this.cache.forEach(geometry => {
            geometry.dispose();
        });
        this.cache.clear();
    }
    
    /**
     * Obtener estadísticas del cache
     * @returns {Object} - Estadísticas (número de geometrías cacheadas)
     */
    getStats() {
        return {
            cachedGeometries: this.cache.size
        };
    }
}
