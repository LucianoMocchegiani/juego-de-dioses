/**
 * Gestor de viewport y carga de datos
 * 
 * Calcula viewports dinámicamente basado en límites del backend
 * y prioriza altura para árboles
 */
import {
    VIEWPORT_MAX_CELLS_X,
    VIEWPORT_MAX_CELLS_Y
} from '../constants.js';

/**
 * @typedef {Object} Dimension
 * @property {string} id - ID de la dimensión
 * @property {number} ancho_metros - Ancho en metros
 * @property {number} alto_metros - Alto en metros
 * @property {number} tamano_celda - Tamaño de celda en metros
 * @property {number} [profundidad_maxima] - Profundidad máxima en celdas
 * @property {number} [altura_maxima] - Altura máxima en celdas
 */

/**
 * @typedef {Object} Viewport
 * @property {number} x_min - Coordenada X mínima
 * @property {number} x_max - Coordenada X máxima
 * @property {number} y_min - Coordenada Y mínima
 * @property {number} y_max - Coordenada Y máxima
 * @property {number} z_min - Coordenada Z mínima
 * @property {number} z_max - Coordenada Z máxima
 */

export class ViewportManager {
    /**
     * @param {number} maxCells - Límite máximo de celdas del backend (default: 1000000)
     */
    constructor(maxCells = 1000000) {
        this.maxCells = maxCells;
    }
    
    /**
     * Calcular viewport dinámicamente basado en dimensiones
     * Prioriza altura para árboles
     * 
     * @param {Dimension} dimension - Dimensión con propiedades
     * @returns {Viewport} - Viewport calculado
     */
    calculateViewport(dimension) {
        // Convertir metros a celdas
        const celdas_x = Math.floor(dimension.ancho_metros / dimension.tamano_celda);
        const celdas_y = Math.floor(dimension.alto_metros / dimension.tamano_celda);
        
        // Viewport optimizado: cargar área completa horizontal pero limitar profundidad
        // IMPORTANTE: Los rangos son inclusivos, así que x_max - x_min + 1 = número de celdas
        const xMax = Math.min(celdas_x - 1, VIEWPORT_MAX_CELLS_X - 1); // -1 porque es inclusivo
        const yMax = Math.min(celdas_y - 1, VIEWPORT_MAX_CELLS_Y - 1);
        const xRange = xMax - 0 + 1; // Número real de celdas en X (inclusivo)
        const yRange = yMax - 0 + 1; // Número real de celdas en Y (inclusivo)
        const maxZRange = Math.floor(this.maxCells / (xRange * yRange)); // Máximo de niveles Z
        
        // Centrar en superficie (z=0) y cargar hacia arriba y abajo
        // Los árboles más grandes pueden llegar hasta z=30 (tronco) + 3 (copa) = z=33
        const zCenter = 0;
        const alturaMaximaNecesaria = 35; // Suficiente para árboles muy grandes con copa
        
        // Calcular zMin y zMax priorizando altura (árboles) sobre profundidad
        // Usar 1/4 del rango hacia abajo y 3/4 hacia arriba para ver los árboles
        const espacioHaciaAbajo = Math.floor(maxZRange / 4);
        const espacioHaciaArriba = maxZRange - espacioHaciaAbajo;
        
        let zMin = Math.max(
            dimension.profundidad_maxima || -8, 
            zCenter - espacioHaciaAbajo
        );
        let zMax = Math.min(
            Math.max(dimension.altura_maxima || alturaMaximaNecesaria, alturaMaximaNecesaria),
            zCenter + espacioHaciaArriba - 1 // -1 porque es inclusivo
        );
        
        // Verificar que no exceda el límite (con margen de seguridad)
        let zRange = zMax - zMin + 1;
        let totalCells = xRange * yRange * zRange;
        if (totalCells > this.maxCells) {
            // Ajustar zMax hacia abajo si excede, pero asegurar mínimo z=35 para ver copas
            const maxAllowedZRange = Math.floor(this.maxCells / (xRange * yRange));
            const zMaxCalculado = zMin + maxAllowedZRange - 1;
            // Priorizar ver las copas: si el cálculo da menos de 35, ajustar zMin hacia arriba
            if (zMaxCalculado < alturaMaximaNecesaria) {
                zMin = Math.max(zMin, alturaMaximaNecesaria - maxAllowedZRange + 1);
                zMax = alturaMaximaNecesaria;
            } else {
                zMax = zMaxCalculado;
            }
            zRange = zMax - zMin + 1;
            totalCells = xRange * yRange * zRange;
            console.warn(`Viewport ajustado para no exceder límite: ${totalCells} celdas (Z: ${zMin} a ${zMax})`);
        }
        
        return {
            x_min: 0,
            x_max: xMax,
            y_min: 0,
            y_max: yMax,
            z_min: zMin,
            z_max: zMax
        };
    }
    
    /**
     * Validar que un viewport no exceda el límite de celdas
     * @param {Viewport} viewport - Viewport a validar
     * @returns {boolean} - True si es válido, False si excede el límite
     */
    validateViewport(viewport) {
        const xRange = viewport.x_max - viewport.x_min + 1;
        const yRange = viewport.y_max - viewport.y_min + 1;
        const zRange = viewport.z_max - viewport.z_min + 1;
        const totalCells = xRange * yRange * zRange;
        return totalCells <= this.maxCells;
    }
    
    /**
     * Calcular número total de celdas en un viewport
     * @param {Viewport} viewport - Viewport
     * @returns {number} - Número total de celdas
     */
    getTotalCells(viewport) {
        const xRange = viewport.x_max - viewport.x_min + 1;
        const yRange = viewport.y_max - viewport.y_min + 1;
        const zRange = viewport.z_max - viewport.z_min + 1;
        return xRange * yRange * zRange;
    }
}

