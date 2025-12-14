/**
 * Sistema de eventos para debugging
 */
import { DEBUG_CONFIG } from './config.js';

export class DebugEventEmitter {
    constructor() {
        const config = DEBUG_CONFIG.events;
        this.enabled = config.enabled && DEBUG_CONFIG.enabled;
        this.maxHistorySize = config.maxHistorySize ?? 1000;
        this.listeners = new Map(); // eventName -> [listeners]
        this.eventHistory = []; // Timeline de eventos
    }
    
    /**
     * Emitir evento
     * @param {string} eventName - Nombre del evento
     * @param {Object} data - Datos del evento
     */
    emit(eventName, data = {}) {
        if (!this.enabled) return;
        
        const event = {
            name: eventName,
            timestamp: performance.now(),
            timestampISO: new Date().toISOString(),
            data
        };
        
        // Agregar a historial
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
        
        // Notificar listeners
        const listeners = this.listeners.get(eventName) || [];
        listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Error in debug event listener:', error);
            }
        });
    }
    
    /**
     * Escuchar evento
     * @param {string} eventName - Nombre del evento
     * @param {Function} listener - Función listener que recibe (event) => {}
     * @returns {Function} Función para desuscribirse
     */
    on(eventName, listener) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(listener);
        
        // Retornar función de desuscripción
        return () => {
            const listeners = this.listeners.get(eventName);
            if (listeners) {
                const index = listeners.indexOf(listener);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        };
    }
    
    /**
     * Escuchar evento una sola vez
     * @param {string} eventName - Nombre del evento
     * @param {Function} listener - Función listener
     * @returns {Function} Función para desuscribirse
     */
    once(eventName, listener) {
        const wrappedListener = (event) => {
            listener(event);
            this.off(eventName, wrappedListener);
        };
        return this.on(eventName, wrappedListener);
    }
    
    /**
     * Desuscribirse de evento
     * @param {string} eventName - Nombre del evento
     * @param {Function} listener - Función listener a remover
     */
    off(eventName, listener) {
        const listeners = this.listeners.get(eventName);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * Obtener historial de eventos
     * @param {string} eventName - Filtrar por nombre (opcional)
     * @param {number} limit - Limitar número de eventos (opcional)
     * @returns {Array} Historial de eventos
     */
    getHistory(eventName = null, limit = null) {
        let history = eventName
            ? this.eventHistory.filter(e => e.name === eventName)
            : [...this.eventHistory];
        
        if (limit && limit > 0) {
            history = history.slice(-limit);
        }
        
        return history;
    }
    
    /**
     * Limpiar historial
     */
    clearHistory() {
        this.eventHistory = [];
    }
    
    /**
     * Habilitar/deshabilitar eventos
     * @param {boolean} enabled - Si está habilitado
     */
    setEnabled(enabled) {
        this.enabled = enabled && DEBUG_CONFIG.enabled;
    }
}

// Singleton global
export const debugEvents = new DebugEventEmitter();
