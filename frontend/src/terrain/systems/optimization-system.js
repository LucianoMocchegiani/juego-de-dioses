/**
 * Sistema de optimizaciones (LOD, culling, limiting)
 * 
 * Orquesta las diferentes optimizaciones del terreno
 */

/**
 * Sistema de optimización del terreno
 */
export class OptimizationSystem {
    constructor(lodManager, cullingManager, particleLimiter) {
        this.lodManager = lodManager;
        this.cullingManager = cullingManager;
        this.particleLimiter = particleLimiter;
    }
    
    /**
     * Aplicar LOD a partículas
     * @param {Array} particles - Partículas
     * @param {THREE.Vector3} cameraPosition - Posición de la cámara
     * @param {number} cellSize - Tamaño de celda
     * @returns {Array} - Partículas con LOD aplicado
     */
    applyLOD(particles, cameraPosition, cellSize) {
        if (!this.lodManager) return particles;
        return this.lodManager.applyLOD(particles, cameraPosition, cellSize);
    }
    
    /**
     * Aplicar frustum culling
     * @param {Array} particles - Partículas
     * @param {THREE.Camera} camera - Cámara
     * @param {number} cellSize - Tamaño de celda
     * @returns {Array} - Partículas visibles
     */
    applyCulling(particles, camera, cellSize) {
        if (!this.cullingManager) return particles;
        return this.cullingManager.getVisible(particles, camera, cellSize);
    }
    
    /**
     * Aplicar limitación de partículas
     * @param {Array} particles - Partículas
     * @param {THREE.Camera} camera - Cámara
     * @param {number} cellSize - Tamaño de celda
     * @returns {Array} - Partículas limitadas
     */
    applyLimiting(particles, camera, cellSize) {
        if (!this.particleLimiter) return particles;
        return this.particleLimiter.limitParticles(particles, camera, cellSize);
    }
    
    /**
     * Aplicar todas las optimizaciones en orden
     * @param {Array} particles - Partículas
     * @param {THREE.Camera} camera - Cámara
     * @param {number} cellSize - Tamaño de celda
     * @returns {Array} - Partículas optimizadas
     */
    applyAll(particles, camera, cellSize) {
        let result = particles;
        const cameraPosition = camera.position;
        
        // 1. Frustum culling (primero para reducir partículas)
        result = this.applyCulling(result, camera, cellSize);
        
        // 2. LOD (segundo para reducir calidad de lejos)
        result = this.applyLOD(result, cameraPosition, cellSize);
        
        // 3. Limiting (último para reducir cantidad total)
        result = this.applyLimiting(result, camera, cellSize);
        
        return result;
    }
}
