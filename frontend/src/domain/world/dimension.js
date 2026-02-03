/**
 * Modelo de dominio: Dimensión / Bloque
 * Forma canónica de lo que devuelve el backend para un bloque/dimensión.
 * Sin dependencias de Three.js, fetch ni DOM.
 */

/**
 * @typedef {Object} Dimension
 * @property {string} id - ID del bloque
 * @property {string} [nombre] - Nombre de la dimensión
 * @property {number} [ancho_metros] - Ancho en metros
 * @property {number} [alto_metros] - Alto en metros
 * @property {number} [tamano_celda] - Tamaño de celda en metros
 * @property {number} [origen_x] - Origen X
 * @property {number} [origen_y] - Origen Y
 */

export const Dimension = {};
