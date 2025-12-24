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
 * @property {string} [color] - Color del tipo de partícula (VARCHAR desde BD)
 * @property {Object} [geometria] - Geometría visual del tipo (JSONB desde BD)
 * @property {string} [geometria.tipo] - Tipo de geometría: "box", "sphere", "cylinder", etc.
 * @property {Object} [geometria.parametros] - Parámetros de la geometría (relativos a tamano_celda)
 * 
 * @deprecated Este tipo se mantiene por compatibilidad. La nueva estructura usa `color` y `geometria` directamente.
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
 * @property {string} id - ID del bloque
 * @property {number} ancho_metros - Ancho en metros
 * @property {number} alto_metros - Alto en metros
 * @property {number} tamano_celda - Tamaño de celda en metros
 * @property {number} [profundidad_maxima] - Profundidad máxima en celdas
 * @property {number} [altura_maxima] - Altura máxima en celdas
 * 
 * @deprecated El nombre "Dimension" se mantiene por compatibilidad, pero ahora representa un "Bloque"
 */
