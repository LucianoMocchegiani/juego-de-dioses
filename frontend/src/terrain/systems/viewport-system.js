/**
 * Sistema de cálculo y gestión de viewports
 */
import { Viewport } from '../components/viewport.js';

/**
 * Sistema de procesamiento de viewports
 */
export class ViewportSystem {
    constructor(maxCells = 1000000) {
        this.viewport = new Viewport(maxCells);
    }
    
    /**
     * Calcular viewport para una dimensión
     * @param {Object} dimension - Dimensión
     * @returns {Object} - Viewport calculado
     */
    calculateViewport(dimension) {
        return this.viewport.calculateViewport(dimension);
    }
    
    /**
     * Validar viewport
     * @param {Object} viewport - Viewport a validar
     * @returns {boolean} - True si es válido
     */
    validateViewport(viewport) {
        return this.viewport.validateViewport(viewport);
    }
    
    /**
     * Obtener número total de celdas en viewport
     * @param {Object} viewport - Viewport
     * @returns {number} - Número total de celdas
     */
    getTotalCells(viewport) {
        return this.viewport.getTotalCells(viewport);
    }
}
