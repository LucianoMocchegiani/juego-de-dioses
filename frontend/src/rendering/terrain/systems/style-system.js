/**
 * Sistema de cache y procesamiento de estilos
 */
import { Style } from '../components/style.js';

/**
 * Sistema de procesamiento de estilos
 */
export class StyleSystem {
    constructor() {
        this.style = new Style();
    }
    
    /**
     * Cachear estilos de tipos de partículas
     * @param {Array} tipos - Array de tipos con estilos
     */
    cacheStyles(tipos) {
        this.style.cacheStyles(tipos);
    }
    
    /**
     * Obtener estilo desde cache
     * @param {string} tipoNombre - Nombre del tipo
     * @returns {Object} - Estilo
     */
    getStyle(tipoNombre) {
        return this.style.getStyle(tipoNombre);
    }
    
    /**
     * Parsear estilo desde BD
     * @param {Object} tipoEstilos - Estilos desde BD
     * @returns {Object} - Estilo parseado
     */
    parseStyle(tipoEstilos) {
        return this.style.parseStyle(tipoEstilos);
    }
    
    /**
     * Invalidar cache completo
     */
    invalidateCache() {
        this.style.invalidateCache();
    }
    
    /**
     * Invalidar estilo específico
     * @param {string} tipoNombre - Nombre del tipo
     */
    invalidateStyle(tipoNombre) {
        this.style.invalidateStyle(tipoNombre);
    }
}
