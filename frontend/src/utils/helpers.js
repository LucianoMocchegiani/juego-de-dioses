/**
 * Helpers generales
 */

/**
 * Formatear número con separadores de miles
 * @param {number} num - Número a formatear
 * @returns {string} - Número formateado (ej: "1,000,000")
 */
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Formatear tamaño en bytes a formato legible
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} - Tamaño formateado (ej: "1.5 MB")
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Debounce: ejecutar función después de un delay, cancelando ejecuciones previas
 * @param {Function} func - Función a ejecutar
 * @param {number} delay - Delay en milisegundos
 * @returns {Function} - Función debounced
 */
export function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Throttle: ejecutar función como máximo una vez por periodo
 * @param {Function} func - Función a ejecutar
 * @param {number} limit - Límite en milisegundos
 * @returns {Function} - Función throttled
 */
export function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Generar ID único simple
 * @returns {string} - ID único
 */
export function generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Verificar si un valor es null o undefined
 * @param {*} value - Valor a verificar
 * @returns {boolean} - True si es null o undefined
 */
export function isNullOrUndefined(value) {
    return value === null || value === undefined;
}

/**
 * Obtener valor por defecto si es null o undefined
 * @param {*} value - Valor a verificar
 * @param {*} defaultValue - Valor por defecto
 * @returns {*} - Valor o valor por defecto
 */
export function defaultValue(value, defaultValue) {
    return isNullOrUndefined(value) ? defaultValue : value;
}

