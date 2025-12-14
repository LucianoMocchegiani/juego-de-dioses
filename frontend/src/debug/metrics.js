/**
 * Sistema de métricas detalladas para debugging
 */
import { DEBUG_CONFIG } from './config.js';

export class DebugMetrics {
    constructor(ecs) {
        this.ecs = ecs;
        const config = DEBUG_CONFIG.metrics;
        this.enabled = config.enabled && DEBUG_CONFIG.enabled;
        this.sampleRate = config.sampleRate ?? 1; // 1 = cada frame, 0.1 = cada 10 frames
        this.maxHistorySize = config.maxHistorySize ?? 100;
        this.frameCount = 0;
        
        this.metrics = {
            frameTime: [],
            systemTimes: new Map(), // systemName -> [times]
            entityCounts: new Map() // systemName -> [counts]
        };
        
        this.currentFrame = {
            startTime: 0,
            systemTimes: new Map()
        };
    }
    
    /**
     * Iniciar medición de frame
     */
    startFrame() {
        if (!this.enabled) return;
        
        // Sampling: solo medir cada N frames
        this.frameCount++;
        if (this.sampleRate < 1 && Math.random() > this.sampleRate) {
            return;
        }
        
        this.currentFrame.startTime = performance.now();
        this.currentFrame.systemTimes.clear();
    }
    
    /**
     * Iniciar medición de sistema
     * @param {string} systemName - Nombre del sistema
     */
    startSystem(systemName) {
        if (!this.enabled) return;
        this.currentFrame.systemTimes.set(systemName, performance.now());
    }
    
    /**
     * Finalizar medición de sistema
     * @param {string} systemName - Nombre del sistema
     * @param {number} entityCount - Número de entidades procesadas
     */
    endSystem(systemName, entityCount) {
        if (!this.enabled) return;
        
        const startTime = this.currentFrame.systemTimes.get(systemName);
        if (!startTime) return;
        
        const time = performance.now() - startTime;
        
        // Agregar a métricas
        if (!this.metrics.systemTimes.has(systemName)) {
            this.metrics.systemTimes.set(systemName, []);
        }
        this.metrics.systemTimes.get(systemName).push(time);
        
        // Mantener solo últimos N frames
        const times = this.metrics.systemTimes.get(systemName);
        if (times.length > this.maxHistorySize) {
            times.shift();
        }
        
        // Contar entidades
        if (!this.metrics.entityCounts.has(systemName)) {
            this.metrics.entityCounts.set(systemName, []);
        }
        this.metrics.entityCounts.get(systemName).push(entityCount);
        const counts = this.metrics.entityCounts.get(systemName);
        if (counts.length > this.maxHistorySize) {
            counts.shift();
        }
    }
    
    /**
     * Finalizar medición de frame
     */
    endFrame() {
        if (!this.enabled) return;
        
        const frameTime = performance.now() - this.currentFrame.startTime;
        if (frameTime > 0) {
            this.metrics.frameTime.push(frameTime);
            
            // Mantener solo últimos N frames
            if (this.metrics.frameTime.length > this.maxHistorySize) {
                this.metrics.frameTime.shift();
            }
        }
    }
    
    /**
     * Obtener estadísticas
     * @returns {Object|null} Estadísticas de performance o null si está deshabilitado
     */
    getStats() {
        if (!this.enabled) return null;
        
        const stats = {
            frameTime: {
                avg: this.average(this.metrics.frameTime),
                min: this.metrics.frameTime.length > 0 ? Math.min(...this.metrics.frameTime) : 0,
                max: this.metrics.frameTime.length > 0 ? Math.max(...this.metrics.frameTime) : 0,
                count: this.metrics.frameTime.length
            },
            systems: {}
        };
        
        // Calcular estadísticas por sistema
        for (const [systemName, times] of this.metrics.systemTimes) {
            if (times.length === 0) continue;
            
            stats.systems[systemName] = {
                avgTime: this.average(times),
                minTime: Math.min(...times),
                maxTime: Math.max(...times),
                avgEntities: this.average(this.metrics.entityCounts.get(systemName) || [])
            };
        }
        
        return stats;
    }
    
    /**
     * Calcular promedio de array
     * @param {Array<number>} array - Array de números
     * @returns {number} Promedio
     */
    average(array) {
        if (array.length === 0) return 0;
        return array.reduce((a, b) => a + b, 0) / array.length;
    }
    
    /**
     * Resetear métricas
     */
    reset() {
        this.metrics.frameTime = [];
        this.metrics.systemTimes.clear();
        this.metrics.entityCounts.clear();
        this.frameCount = 0;
    }
    
    /**
     * Habilitar/deshabilitar métricas
     * @param {boolean} enabled - Si está habilitado
     */
    setEnabled(enabled) {
        this.enabled = enabled && DEBUG_CONFIG.enabled;
    }
}
