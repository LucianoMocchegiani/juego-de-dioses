/**
 * Definiciones de tipos (JSDoc para facilitar migración a TypeScript)
 */

/**
 * @typedef {Object} ParticleStyle
 * @property {string|number} color - Color hexadecimal como string (ej: "0x8B4513") o número (para compatibilidad)
 * @property {number} metalness - Metalness del material (0-1)
 * @property {number} roughness - Roughness del material (0-1)
 * @property {boolean} [isError] - Si es un estilo de error/fallback
 * @property {number} [opacity] - Opacidad del material (0-1)
 */

/**
 * @typedef {Object} TipoEstilosBD
 * @property {string} [color_hex] - Color en hexadecimal como string en formato CSS (ej: "#8B4513")
 * @property {number[]} [color_rgb] - Color en RGB [R, G, B]
 * @property {Object} [material] - Propiedades del material
 * @property {number} [material.metalness] - Metalness (0-1)
 * @property {number} [material.roughness] - Roughness (0-1)
 * @property {boolean} [material.emissive] - Si es emisivo
 * @property {Object} [visual] - Propiedades visuales
 * @property {string} [visual.modelo] - Tipo de modelo 3D
 * @property {number} [visual.escala] - Escala del modelo
 * @property {number} [visual.opacity] - Opacidad del material (0-1), 0.0 = completamente transparente
 */

/**
 * @typedef {Object} Particle
 * @property {string} id - ID único de la partícula
 * @property {string} tipo - Nombre del tipo de partícula
 * @property {number} celda_x - Coordenada X
 * @property {number} celda_y - Coordenada Y
 * @property {number} celda_z - Coordenada Z
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

/**
 * @typedef {Object} Dimension
 * @property {string} id - ID de la dimensión
 * @property {number} ancho_metros - Ancho en metros
 * @property {number} alto_metros - Alto en metros
 * @property {number} tamano_celda - Tamaño de celda en metros
 * @property {number} [profundidad_maxima] - Profundidad máxima en celdas
 * @property {number} [altura_maxima] - Altura máxima en celdas
 */
