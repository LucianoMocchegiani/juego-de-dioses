/**
 * Selectores para acceder a partes específicas del estado
 */
/**
 * @typedef {import('./store.js').AppState} AppState
 */

export const selectors = {
    /**
     * Obtener dimensión actual
     * @param {AppState} state - Estado
     * @returns {Object|null} - Dimensión actual
     */
    getCurrentDimension(state) {
        return state.currentDimension;
    },
    
    /**
     * Obtener partículas actuales
     * @param {AppState} state - Estado
     * @returns {Array} - Partículas actuales
     */
    getCurrentParticles(state) {
        return state.currentParticles;
    },
    
    /**
     * Obtener viewport actual
     * @param {AppState} state - Estado
     * @returns {Object|null} - Viewport actual
     */
    getViewport(state) {
        return state.viewport;
    },
    
    /**
     * Verificar si está cargando
     * @param {AppState} state - Estado
     * @returns {boolean} - True si está cargando
     */
    isLoading(state) {
        return state.loading;
    },
    
    /**
     * Obtener error actual
     * @param {AppState} state - Estado
     * @returns {string|null} - Mensaje de error o null
     */
    getError(state) {
        return state.error;
    },
    
    /**
     * Verificar si hay error
     * @param {AppState} state - Estado
     * @returns {boolean} - True si hay error
     */
    hasError(state) {
        return state.error !== null;
    },
    
    /**
     * Obtener número de partículas
     * @param {AppState} state - Estado
     * @returns {number} - Número de partículas
     */
    getParticlesCount(state) {
        return state.currentParticles.length;
    }
};

