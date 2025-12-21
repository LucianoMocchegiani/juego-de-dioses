/**
 * Módulo Utils - Utilidades organizadas
 * 
 * Contiene funciones de utilidad organizadas por tipo:
 * - Utilidades de colores
 * - Utilidades de geometría
 * - Utilidades matemáticas
 * - Helpers generales
 */

// Colores
export {
    increaseBrightness,
    parseColor,
    colorToHexString,
    hexStringToColor
} from './colors.js';

// Geometría
export {
    calculateBoundingBox,
    calculateCenter,
    calculateSize
} from './geometry.js';

// Matemáticas
export {
    clamp,
    lerp,
    map,
    roundTo,
    inRange
} from './math.js';

// Helpers
export {
    formatNumber,
    formatBytes,
    debounce,
    throttle,
    generateId,
    isNullOrUndefined,
    defaultValue
} from './helpers.js';

// Nota: frustumCull, FrustumCache, sortParticlesByDepth y SortingCache
// fueron migrados a terrain/utils/ como parte de la refactorización JDG-035-2

