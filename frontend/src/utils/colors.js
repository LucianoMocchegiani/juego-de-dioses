/**
 * Utilidades de colores
 */
import { COLOR_MAX_VALUE } from '../constants.js';

/**
 * Aumentar brillo de un color RGB
 * @param {number} color - Color hexadecimal (ej: 0x8B4513)
 * @param {number} multiplier - Multiplicador de brillo (ej: 1.2 para 20% más brillo)
 * @returns {number} - Color con brillo aumentado
 */
export function increaseBrightness(color, multiplier) {
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    const rNew = Math.min(COLOR_MAX_VALUE, Math.floor(r * multiplier));
    const gNew = Math.min(COLOR_MAX_VALUE, Math.floor(g * multiplier));
    const bNew = Math.min(COLOR_MAX_VALUE, Math.floor(b * multiplier));
    return (rNew << 16) | (gNew << 8) | bNew;
}

/**
 * Parsear color hexadecimal string a número
 * @param {string} colorHex - Color en formato string (ej: "#8B4513" o "8B4513")
 * @returns {number} - Color como número hexadecimal (ej: 0x8B4513)
 */
export function parseColor(colorHex) {
    if (!colorHex) {
        return 0xFFFFFF; // Default blanco
    }
    
    // Remover # si existe
    const hex = colorHex.replace('#', '');
    
    // Parsear a número
    const parsed = parseInt(hex, 16);
    
    // Si no es válido, retornar blanco
    if (isNaN(parsed)) {
        return 0xFFFFFF;
    }
    
    return parsed;
}

/**
 * Convertir color número a string hexadecimal
 * @param {number} color - Color como número (ej: 0x8B4513)
 * @returns {string} - Color como string (ej: "#8B4513")
 */
export function colorToHexString(color) {
    return `#${color.toString(16).padStart(6, '0').toUpperCase()}`;
}

/**
 * Convertir color string a número
 * @param {string} colorHex - Color como string (ej: "#8B4513")
 * @returns {number} - Color como número (ej: 0x8B4513)
 */
export function hexStringToColor(colorHex) {
    return parseColor(colorHex);
}

