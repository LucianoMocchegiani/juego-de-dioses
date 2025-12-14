/**
 * Configuración centralizada del sistema de debugging
 */
export const DEBUG_CONFIG = {
    // Habilitar debugging (por defecto en localhost o si NODE_ENV es development)
    enabled: (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) ||
             (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'),
    
    // Nivel de log por defecto
    defaultLogLevel: 'info', // 'debug' | 'info' | 'warn' | 'error'
    
    // Configuración de logger
    logger: {
        enabled: true,
        level: 'info',
        showTimestamp: true,
        showSystem: true
    },
    
    // Configuración de inspector
    inspector: {
        enabled: true,
        cacheEnabled: true,
        maxCacheSize: 100
    },
    
    // Configuración de métricas
    metrics: {
        enabled: true,
        sampleRate: 1, // 1 = cada frame, 0.1 = cada 10 frames
        maxHistorySize: 100
    },
    
    // Configuración de validación
    validator: {
        enabled: true,
        warnOnInvalid: true
    },
    
    // Configuración de eventos
    events: {
        enabled: true,
        maxHistorySize: 1000
    },
    
    // Configuración de UI
    ui: {
        enabled: true,
        toggleKey: 'F3',
        autoUpdateInterval: 1000 // ms
    }
};
