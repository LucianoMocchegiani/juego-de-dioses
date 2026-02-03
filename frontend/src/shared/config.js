/**
 * Configuración común del frontend
 * 
 * Centraliza la lógica de detección de entorno (Docker vs desarrollo local)
 * y URLs base del backend.
 */

/**
 * Obtener URL base del backend para archivos estáticos
 * @returns {string} URL base del backend (vacía para Docker, completa para desarrollo local)
 */
export function getBackendBaseUrl() {
    // Si está en Docker (nginx proxy en puerto 8080), usar rutas relativas
    // Si está en desarrollo local, usar URL completa del backend
    if (window.location.hostname === 'localhost' && window.location.port === '8080') {
        return '';  // Nginx proxy (Docker) - rutas relativas funcionan
    } else {
        return 'http://localhost:8000';  // Desarrollo local directo
    }
}

/**
 * URL base del API
 */
export const API_BASE_URL = `${getBackendBaseUrl()}/api/v1`;

