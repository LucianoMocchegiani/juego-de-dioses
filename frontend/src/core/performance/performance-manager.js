/**
 * Gestor de métricas de rendimiento
 * 
 * Proporciona medición y monitoreo de métricas de rendimiento en tiempo real,
 * incluyendo FPS, draw calls, y otras métricas útiles para debugging y optimización.
 */
export class PerformanceManager {
    constructor() {
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.subscribers = [];
        this.isProfiling = false;
        this.drawCalls = 0;
        this.lastDrawCalls = 0;
    }
    
    /**
     * Medir FPS
     * Debe llamarse en cada frame del loop de animación
     */
    measureFPS() {
        if (!this.isProfiling) {
            return; // No medir si no está en modo profiling
        }
        
        this.frameCount++;
        const currentTime = performance.now();
        const delta = currentTime - this.lastTime;
        
        // Calcular FPS cada segundo
        if (delta >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / delta);
            this.frameCount = 0;
            this.lastTime = currentTime;
            
            // Notificar a suscriptores
            this.notify({
                fps: this.fps,
                drawCalls: this.lastDrawCalls
            });
        }
    }
    
    /**
     * Contar draw calls (aproximado)
     * @param {Map} instancedMeshes - Map de instanced meshes
     * @returns {number} - Número aproximado de draw calls
     */
    countDrawCalls(instancedMeshes) {
        if (!instancedMeshes) {
            return 0;
        }
        
        let drawCalls = 0;
        instancedMeshes.forEach(mesh => {
            // Cada instanced mesh es un draw call
            drawCalls++;
        });
        
        this.lastDrawCalls = drawCalls;
        return drawCalls;
    }
    
    /**
     * Suscribirse a métricas
     * @param {Function} callback - Función callback que recibe métricas: (metrics) => {}
     */
    subscribe(callback) {
        this.subscribers.push(callback);
    }
    
    /**
     * Desuscribirse de métricas
     * @param {Function} callback - Función callback a remover
     */
    unsubscribe(callback) {
        const index = this.subscribers.indexOf(callback);
        if (index > -1) {
            this.subscribers.splice(index, 1);
        }
    }
    
    /**
     * Notificar métricas a todos los suscriptores
     * @param {Object} metrics - Objeto con métricas
     */
    notify(metrics) {
        if (!this.isProfiling) {
            return; // No notificar si no está en modo profiling
        }
        
        this.subscribers.forEach(callback => {
            try {
                callback(metrics);
            } catch (error) {
                console.error('Error en callback de performance:', error);
            }
        });
    }
    
    /**
     * Iniciar profiling
     */
    startProfiling() {
        this.isProfiling = true;
        this.frameCount = 0;
        this.lastTime = performance.now();
    }
    
    /**
     * Detener profiling
     */
    stopProfiling() {
        this.isProfiling = false;
    }
    
    /**
     * Obtener métricas actuales
     * @returns {Object} - Métricas actuales
     */
    getMetrics() {
        return {
            fps: this.fps,
            drawCalls: this.lastDrawCalls
        };
    }
    
    /**
     * Resetear métricas
     */
    reset() {
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.drawCalls = 0;
        this.lastDrawCalls = 0;
    }
}
