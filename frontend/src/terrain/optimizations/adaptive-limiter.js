/**
 * Limitador adaptativo que ajusta el límite de partículas según FPS
 * 
 * Observa métricas de PerformanceManager y ajusta límite dinámicamente
 * para mantener 60 FPS incluso bajo carga variable.
 */
import { debugLogger } from '../../debug/logger.js';
import { ADAPTIVE_LIMITER_FPS_THRESHOLDS } from '../../config/particle-optimization-config.js';

export class AdaptiveLimiter {
    /**
     * @param {PerformanceManager} performanceManager - Performance Manager para obtener FPS
     * @param {Object} options - Opciones de configuración
     */
    constructor(performanceManager, options = {}) {
        this.performanceManager = performanceManager;
        
        // Límites configurables
        this.limits = {
            min: options.min || 80000,      // FPS < 45
            low: options.low || 100000,     // FPS 45-55
            medium: options.medium || 120000, // FPS 55-59
            max: options.max || 150000       // FPS >= 60
        };
        
        // Usar thresholds de config
        this.fpsThresholds = options.fpsThresholds || ADAPTIVE_LIMITER_FPS_THRESHOLDS;
        
        this.currentLimit = this.limits.max;
        this.lastAdjustmentTime = 0;
        this.adjustmentDebounce = options.debounce || 2000; // 2 segundos por defecto
        this.enabled = options.enabled !== false; // Habilitado por defecto
    }
    
    /**
     * Obtener límite actual ajustado según FPS
     * @returns {number} - Límite actual de partículas
     */
    getCurrentLimit() {
        if (!this.enabled) {
            return this.limits.max;
        }
        
        const fps = this.performanceManager.getMetrics().fps;
        const now = performance.now();
        
        // Debounce: Solo ajustar cada X segundos para evitar oscilación
        if (now - this.lastAdjustmentTime < this.adjustmentDebounce) {
            return this.currentLimit;
        }
        
        // Ajustar según FPS
        // Si FPS es 0, asumir que es muy bajo (aún no se ha medido o está en carga inicial)
        let newLimit;
        if (fps === 0 || fps < this.fpsThresholds.low) {
            newLimit = this.limits.min;
        } else if (fps < this.fpsThresholds.medium) {
            newLimit = this.limits.low;
        } else if (fps < this.fpsThresholds.high) {
            newLimit = this.limits.medium;
        } else {
            newLimit = this.limits.max;
        }
        
        // Solo actualizar si cambió
        if (newLimit !== this.currentLimit) {
            const previousLimit = this.currentLimit;
            this.currentLimit = newLimit;
            this.lastAdjustmentTime = now;
            
            debugLogger.info('AdaptiveLimiter', 'Límite ajustado según FPS', {
                fps: fps,
                limiteAnterior: previousLimit,
                limiteNuevo: newLimit,
                razon: fps < 45 ? 'FPS muy bajo' : 
                       fps < 55 ? 'FPS bajo' : 
                       fps < 59 ? 'FPS medio' : 'FPS óptimo'
            });
        }
        
        return this.currentLimit;
    }
    
    /**
     * Configurar límites
     * @param {Object} limits - Objeto con límites (min, low, medium, max)
     */
    setLimits(limits) {
        this.limits = { ...this.limits, ...limits };
    }
    
    /**
     * Habilitar/deshabilitar adaptación
     * @param {boolean} enabled - true para habilitar, false para deshabilitar
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
    /**
     * Obtener límite actual sin ajustar (útil para debugging)
     * @returns {number}
     */
    getCurrentLimitWithoutAdjustment() {
        return this.currentLimit;
    }
}
