/**
 * Modelo de dominio: Viewport
 * Región 3D (x_min, x_max, y_min, y_max, z_min, z_max) en celdas.
 * Sin dependencias de Three.js, fetch ni DOM.
 */

/**
 * @typedef {Object} Viewport
 * @property {number} x_min
 * @property {number} x_max
 * @property {number} y_min
 * @property {number} y_max
 * @property {number} z_min
 * @property {number} z_max
 */

/**
 * Clase pura que calcula y valida viewports. No importa configuración ni constantes;
 * el caller pasa `maxCells` u otros parámetros si lo desea. Esto mantiene el módulo
 * libre de dependencias de infraestructura y facilita testing.
 */
export class Viewport {
    /**
     * @param {number} maxCells - límite máximo de celdas (ej. 1000000)
     */
    constructor(maxCells = 1000000) {
        this.maxCells = maxCells;
    }

    /**
     * Calcular viewport mínimo necesario para la dimensión.
     * Nota: este método no usa constantes globales; el caller puede ajustar `maxCells`.
     * @param {Object} dimension - Dimensión (domain Dimension)
     * @returns {Viewport}
     */
    calculateViewport(dimension) {
        const cellSize = dimension.tamano_celda || 0.25;
        const celdas_x = Math.max(1, Math.floor((dimension.ancho_metros || 40) / cellSize));
        const celdas_y = Math.max(1, Math.floor((dimension.alto_metros || 40) / cellSize));

        const xMax = celdas_x - 1;
        const yMax = celdas_y - 1;
        const xRange = xMax - 0 + 1;
        const yRange = yMax - 0 + 1;
        const maxZRange = Math.floor(this.maxCells / (xRange * yRange)) || 1;

        const zCenter = 0;
        const alturaMaximaNecesaria = 35;
        const espacioHaciaAbajo = Math.floor(maxZRange / 4);
        const espacioHaciaArriba = maxZRange - espacioHaciaAbajo;

        let zMin = Math.max(dimension.profundidad_maxima || -8, zCenter - espacioHaciaAbajo);
        let zMax = Math.min(Math.max(dimension.altura_maxima || alturaMaximaNecesaria, alturaMaximaNecesaria), zCenter + espacioHaciaArriba - 1);

        // Ajustes mínimos/seguridad
        if (zMax < zMin) zMax = zMin;

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
     * Validar que el viewport no exceda maxCells.
     * @param {Viewport} viewport
     * @returns {boolean}
     */
    validateViewport(viewport) {
        const xRange = viewport.x_max - viewport.x_min + 1;
        const yRange = viewport.y_max - viewport.y_min + 1;
        const zRange = viewport.z_max - viewport.z_min + 1;
        const totalCells = xRange * yRange * zRange;
        return totalCells <= this.maxCells;
    }

    /**
     * Obtener número total de celdas en un viewport
     * @param {Viewport} viewport
     * @returns {number}
     */
    getTotalCells(viewport) {
        const xRange = viewport.x_max - viewport.x_min + 1;
        const yRange = viewport.y_max - viewport.y_min + 1;
        const zRange = viewport.z_max - viewport.z_min + 1;
        return xRange * yRange * zRange;
    }
}
