/**
 * Gestor de métricas de rendimiento
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

    measureFPS() {
        if (!this.isProfiling) return;
        this.frameCount++;
        const currentTime = performance.now();
        const delta = currentTime - this.lastTime;
        if (delta >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / delta);
            this.frameCount = 0;
            this.lastTime = currentTime;
            this.notify({ fps: this.fps, drawCalls: this.lastDrawCalls });
        }
    }

    countDrawCalls(instancedMeshes) {
        if (!instancedMeshes) return 0;
        let drawCalls = 0;
        instancedMeshes.forEach(() => drawCalls++);
        this.lastDrawCalls = drawCalls;
        return drawCalls;
    }

    subscribe(callback) { this.subscribers.push(callback); }

    unsubscribe(callback) {
        const index = this.subscribers.indexOf(callback);
        if (index > -1) this.subscribers.splice(index, 1);
    }

    notify(metrics) {
        if (!this.isProfiling) return;
        this.subscribers.forEach(cb => { try { cb(metrics); } catch (e) { console.error(e); } });
    }

    startProfiling() {
        this.isProfiling = true;
        this.frameCount = 0;
        this.lastTime = performance.now();
    }

    stopProfiling() { this.isProfiling = false; }

    getMetrics() { return { fps: this.fps, drawCalls: this.lastDrawCalls }; }

    reset() {
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.drawCalls = 0;
        this.lastDrawCalls = 0;
    }
}
