/**
 * Manager de frustum culling para partículas
 * 
 * Wrapper alrededor de FrustumCache para uso con OptimizationSystem
 */
import { FrustumCache } from '../utils/culling.js';

/**
 * Manager de culling (wrapper para OptimizationSystem)
 */
export class CullingManager {
    constructor() {
        this.frustumCache = new FrustumCache();
    }
    
    /**
     * Obtener partículas visibles
     * @param {Array} particles - Partículas
     * @param {THREE.Camera} camera - Cámara
     * @param {number} cellSize - Tamaño de celda
     * @returns {Array} - Partículas visibles
     */
    getVisible(particles, camera, cellSize) {
        return this.frustumCache.getVisible(particles, camera, cellSize);
    }
    
    /**
     * Invalidar cache
     */
    invalidate() {
        this.frustumCache.invalidate();
    }
}
