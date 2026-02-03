/**
 * Utilidades para culling de partículas
 * 
 * Proporciona funciones para filtrar partículas visibles usando frustum culling,
 * optimizando el renderizado al procesar solo las partículas dentro del campo de visión.
 */
import * as THREE from 'three';

/**
 * Filtrar partículas visibles usando frustum culling
 * @param {Array} particles - Array de partículas con celda_x, celda_y, celda_z
 * @param {THREE.Camera} camera - Cámara Three.js
 * @param {number} cellSize - Tamaño de celda en metros
 * @returns {Array} - Array de partículas visibles
 */
export function frustumCull(particles, camera, cellSize) {
    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(matrix);
    
    return particles.filter(particle => {
        // Convertir posición de celda a posición 3D
        const position = new THREE.Vector3(
            particle.celda_x * cellSize,
            particle.celda_y * cellSize,
            particle.celda_z * cellSize
        );
        
        // Crear bounding box pequeño para la partícula
        const box = new THREE.Box3(
            position.clone().subScalar(cellSize * 0.5),
            position.clone().addScalar(cellSize * 0.5)
        );
        
        return frustum.intersectsBox(box);
    });
}

/**
 * Cache de frustum para evitar recalcular si cámara no se mueve
 * 
 * Optimiza el frustum culling cacheando resultados cuando la cámara no cambia,
 * reduciendo cálculos redundantes en frames consecutivos.
 */
export class FrustumCache {
    constructor() {
        this.lastCameraMatrix = null;
        this.cachedResult = null;
    }
    
    /**
     * Obtener partículas visibles con cache
     * @param {Array} particles - Array de partículas
     * @param {THREE.Camera} camera - Cámara Three.js
     * @param {number} cellSize - Tamaño de celda
     * @returns {Array} - Partículas visibles
     */
    getVisible(particles, camera, cellSize) {
        const currentMatrix = camera.matrixWorldInverse.clone();
        
        // Verificar si cámara se movió
        if (this.lastCameraMatrix && 
            this.lastCameraMatrix.equals(currentMatrix) &&
            this.cachedResult) {
            return this.cachedResult;
        }
        
        // Recalcular
        this.lastCameraMatrix = currentMatrix;
        this.cachedResult = frustumCull(particles, camera, cellSize);
        return this.cachedResult;
    }
    
    /**
     * Invalidar cache
     * 
     * Útil cuando las partículas cambian o se necesita forzar recálculo.
     */
    invalidate() {
        this.lastCameraMatrix = null;
        this.cachedResult = null;
    }
}
