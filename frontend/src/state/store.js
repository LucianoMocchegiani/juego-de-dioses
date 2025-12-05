/**
 * Store centralizado simple 
 */
/**
 * @typedef {Object} AppState
 * @property {Object|null} currentDimension - Dimensión actual cargada
 * @property {Array} currentParticles - Partículas cargadas
 * @property {Object|null} viewport - Viewport actual
 * @property {boolean} loading - Estado de carga
 * @property {string|null} error - Errores
 */

/**
 * @typedef {Function} StateListener
 * @param {AppState} state - Estado actual
 */

export class Store {
    constructor() {
        /**
         * Estado de la aplicación
         * @type {AppState}
         */
        this.state = {
            currentDimension: null,
            currentParticles: [],
            viewport: null,
            loading: false,
            error: null
        };
        
        /**
         * Listeners suscritos a cambios de estado
         * @type {Array<StateListener>}
         */
        this.listeners = [];
    }
    
    /**
     * Obtener estado actual
     * @returns {AppState} - Estado actual
     */
    getState() {
        return this.state;
    }
    
    /**
     * Actualizar estado (merge con estado anterior)
     * @param {Partial<AppState>} newState - Nuevo estado (parcial)
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notifyListeners();
    }
    
    /**
     * Suscribirse a cambios de estado
     * @param {StateListener} listener - Función que se ejecutará cuando cambie el estado
     * @returns {Function} - Función para desuscribirse
     */
    subscribe(listener) {
        this.listeners.push(listener);
        
        // Retornar función de desuscripción
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
    
    /**
     * Notificar a todos los listeners sobre cambios de estado
     */
    notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener(this.state);
            } catch (error) {
                console.error('Error en listener de estado:', error);
            }
        });
    }
    
    /**
     * Resetear estado a valores iniciales
     */
    reset() {
        this.setState({
            currentDimension: null,
            currentParticles: [],
            viewport: null,
            loading: false,
            error: null
        });
    }
}

