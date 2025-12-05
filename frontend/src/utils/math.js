/**
 * Utilidades matemáticas generales
 */

/**
 * Limitar valor entre min y max
 * @param {number} value - Valor a limitar
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {number} - Valor limitado
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Interpolación lineal entre dos valores
 * @param {number} a - Valor inicial
 * @param {number} b - Valor final
 * @param {number} t - Factor de interpolación (0-1)
 * @returns {number} - Valor interpolado
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Mapear valor de un rango a otro
 * @param {number} value - Valor a mapear
 * @param {number} inMin - Mínimo del rango de entrada
 * @param {number} inMax - Máximo del rango de entrada
 * @param {number} outMin - Mínimo del rango de salida
 * @param {number} outMax - Máximo del rango de salida
 * @returns {number} - Valor mapeado
 */
export function map(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Redondear a decimales específicos
 * @param {number} value - Valor a redondear
 * @param {number} decimals - Número de decimales
 * @returns {number} - Valor redondeado
 */
export function roundTo(value, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

/**
 * Verificar si un número está en un rango
 * @param {number} value - Valor a verificar
 * @param {number} min - Mínimo del rango
 * @param {number} max - Máximo del rango
 * @returns {boolean} - True si está en el rango
 */
export function inRange(value, min, max) {
    return value >= min && value <= max;
}

