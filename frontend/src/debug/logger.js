/**
 * Sistema de logging estructurado para debugging
 */
import { DEBUG_CONFIG } from '../config/debug-config.js';

export class DebugLogger {
    constructor(options = {}) {
        const config = { ...DEBUG_CONFIG.logger, ...options };
        this.enabled = config.enabled && DEBUG_CONFIG.enabled;
        this.level = config.level || 'info';
        this.showTimestamp = config.showTimestamp ?? true;
        this.showSystem = config.showSystem ?? true;
        this.filters = options.filters || {}; // { system: 'AnimationMixer', level: 'warn' }
        this.subscribers = [];
        
        // Niveles de log ordenados por severidad
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
    }
    
    /**
     * Verificar si se debe loguear según nivel y filtros
     * @param {string} level - Nivel de log
     * @param {string} system - Nombre del sistema
     * @returns {boolean} Si se debe loguear
     */
    shouldLog(level, system) {
        if (!this.enabled) return false;
        
        // Verificar nivel mínimo
        if (this.levels[level] < this.levels[this.level]) {
            return false;
        }
        
        // Verificar filtros
        if (this.filters.system && this.filters.system !== system) {
            return false;
        }
        if (this.filters.level && this.filters.level !== level) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Log con contexto estructurado
     * @param {string} level - Nivel de log
     * @param {string} system - Nombre del sistema
     * @param {string} message - Mensaje
     * @param {Object} data - Datos adicionales
     */
    log(level, system, message, data = {}) {
        if (!this.shouldLog(level, system)) return;
        
        const logEntry = {
            timestamp: performance.now(),
            timestampISO: new Date().toISOString(),
            level,
            system,
            message,
            data,
            stack: level === 'error' ? new Error().stack : undefined
        };
        
        // Notificar a suscriptores (UI, archivo, etc.)
        this.notifySubscribers(logEntry);
        
        // Log a consola
        const consoleMethod = console[level] || console.log;
        const prefix = this.buildPrefix(system, level);
        consoleMethod(prefix, message, data);
    }
    
    /**
     * Construir prefijo para log
     * @param {string} system - Nombre del sistema
     * @param {string} level - Nivel de log
     * @returns {string} Prefijo formateado
     */
    buildPrefix(system, level) {
        const parts = [];
        
        if (this.showTimestamp) {
            const time = new Date().toLocaleTimeString();
            parts.push(`[${time}]`);
        }
        
        if (this.showSystem) {
            parts.push(`[${system}]`);
        }
        
        parts.push(`[${level.toUpperCase()}]`);
        
        return parts.join(' ');
    }
    
    /**
     * Notificar a suscriptores
     * @param {Object} logEntry - Entrada de log
     */
    notifySubscribers(logEntry) {
        this.subscribers.forEach(callback => {
            try {
                callback(logEntry);
            } catch (error) {
                console.error('Error in logger subscriber:', error);
            }
        });
    }
    
    // Helpers para cada nivel
    debug(system, message, data) { 
        this.log('debug', system, message, data); 
    }
    
    info(system, message, data) { 
        this.log('info', system, message, data); 
    }
    
    warn(system, message, data) { 
        this.log('warn', system, message, data); 
    }
    
    error(system, message, data) { 
        this.log('error', system, message, data); 
    }
    
    /**
     * Suscribirse a logs (para UI o archivos)
     * @param {Function} callback - Función callback que recibe logEntry
     */
    subscribe(callback) {
        this.subscribers.push(callback);
    }
    
    /**
     * Desuscribirse de logs
     * @param {Function} callback - Función callback a remover
     */
    unsubscribe(callback) {
        const index = this.subscribers.indexOf(callback);
        if (index > -1) {
            this.subscribers.splice(index, 1);
        }
    }
    
    /**
     * Configurar filtros
     * @param {Object} filters - Filtros { system, level }
     */
    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
    }
    
    /**
     * Habilitar/deshabilitar logger
     * @param {boolean} enabled - Si está habilitado
     */
    setEnabled(enabled) {
        this.enabled = enabled && DEBUG_CONFIG.enabled;
    }
}

// Singleton global
export const debugLogger = new DebugLogger();
