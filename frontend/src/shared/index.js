/**
 * Utilidades puras: sin dependencias de state ni driving.
 * Usadas por domain, application, rendering y adapters.
 */
export {
    increaseBrightness,
    parseColor,
    colorToHexString,
    hexStringToColor
} from './colors.js';
export {
    calculateBoundingBox,
    calculateCenter,
    calculateSize
} from './geometry.js';
export {
    clamp,
    lerp,
    map,
    roundTo,
    inRange
} from './math.js';
export {
    formatNumber,
    formatBytes,
    debounce,
    throttle,
    generateId,
    isNullOrUndefined,
    defaultValue
} from './helpers.js';
export { getBackendBaseUrl, API_BASE_URL } from './config.js';
export { cursorManager } from './cursor-manager.js';
