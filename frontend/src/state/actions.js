/**
 * Acciones para modificar estado de forma estructurada
 */
/**
 * @typedef {import('./store.js').Store} Store
 * @typedef {import('./store.js').AppState} AppState
 */

export const actions = {
    /**
     * Establecer dimensión actual
     * @param {Store} store - Store de estado
     * @param {Object} dimension - Dimensión a establecer
     */
    setDimension(store, dimension) {
        store.setState({ currentDimension: dimension });
    },
    
    /**
     * Establecer partículas actuales
     * @param {Store} store - Store de estado
     * @param {Array} particles - Partículas a establecer
     */
    setParticles(store, particles) {
        store.setState({ currentParticles: particles });
    },
    
    /**
     * Establecer viewport actual
     * @param {Store} store - Store de estado
     * @param {Object} viewport - Viewport a establecer
     */
    setViewport(store, viewport) {
        store.setState({ viewport: viewport });
    },
    
    /**
     * Establecer estado de carga
     * @param {Store} store - Store de estado
     * @param {boolean} loading - Estado de carga
     */
    setLoading(store, loading) {
        store.setState({ loading: loading });
    },
    
    /**
     * Establecer error
     * @param {Store} store - Store de estado
     * @param {string|null} error - Mensaje de error (null para limpiar)
     */
    setError(store, error) {
        store.setState({ error: error });
    },
    
    /**
     * Limpiar error
     * @param {Store} store - Store de estado
     */
    clearError(store) {
        store.setState({ error: null });
    },
    
    /**
     * Resetear estado completo
     * @param {Store} store - Store de estado
     */
    reset(store) {
        store.reset();
    }
};

