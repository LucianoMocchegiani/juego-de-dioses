/**
 * Logger de Rendimiento para Frontend
 * Loguea métricas de rendimiento en formato estructurado (JSON)
 */
import { DEBUG_CONFIG } from '../config/debug-config.js';

export class PerformanceLogger {
    constructor(debugMetrics, renderer = null) {
        this.debugMetrics = debugMetrics;
        this.renderer = renderer;
        this.enabled = DEBUG_CONFIG.performanceLogging?.enabled ?? false;
        this.interval = DEBUG_CONFIG.performanceLogging?.interval ?? 30000; // 30 segundos
        this.intervalId = null;
    }
    
    /**
     * Iniciar logging periódico
     */
    start() {
        if (!this.enabled) return;
        
        this.stop(); // Asegurar que no hay otro intervalo activo
        
        this.intervalId = setInterval(() => {
            this.logMetrics();
        }, this.interval);
    }
    
    /**
     * Detener logging periódico
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    
    /**
     * Loguear métricas actuales
     */
    logMetrics() {
        if (!this.enabled) return;
        
        const stats = this.debugMetrics.getStats(this.renderer);
        if (!stats) return;
        
        const logData = {
            timestamp: new Date().toISOString(),
            frameTime: stats.frameTime,
            memory: stats.memory,
            gpu: stats.gpu,
            systems: stats.systems
        };
        
        console.log('[RUNTIME STATS]', JSON.stringify(logData, null, 2));
    }
    
    /**
     * Habilitar/deshabilitar logging
     * @param {boolean} enabled - Si está habilitado
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (enabled) {
            this.start();
        } else {
            this.stop();
        }
    }
    
    /**
     * Establecer renderer para métricas de GPU
     * @param {THREE.WebGLRenderer} renderer - Renderer de Three.js
     */
    setRenderer(renderer) {
        this.renderer = renderer;
    }
}
