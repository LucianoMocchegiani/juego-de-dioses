import * as THREE from 'three';
import { debugLogger } from '../../debug/logger.js';

/**
 * Sistema de Frustum Culling
 * Determina qué objetos están visibles dentro del frustum de la cámara
 * para evitar renderizar objetos fuera de vista.
 */
export class FrustumCuller {
    constructor(camera) {
        this.camera = camera;
        this.frustum = new THREE.Frustum();
        this.matrix = new THREE.Matrix4();
        this.stats = {
            totalChecks: 0,
            visibleObjects: 0,
            culledObjects: 0
        };
    }
    
    /**
     * Actualizar frustum (debe llamarse una vez por frame antes de verificar visibilidad)
     */
    update() {
        if (!this.camera) return;
        
        this.matrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.matrix);
    }
    
    /**
     * Verificar si un objeto está visible dentro del frustum
     * @param {THREE.Object3D} object - Objeto a verificar
     * @returns {boolean} True si está visible
     */
    isVisible(object) {
        if (!object || !object.visible) {
            return false;
        }
        
        this.stats.totalChecks++;
        
        // Asegurar que el objeto tenga su matriz de mundo actualizada
        object.updateMatrixWorld(true);
        
        // Calcular bounding box y sphere para el objeto
        // Esto funciona para cualquier tipo de objeto (Mesh, Group, etc.)
        try {
            const box = new THREE.Box3();
            box.setFromObject(object);
            
            // Si el bounding box está vacío, el objeto no tiene geometría visible
            if (box.isEmpty()) {
                this.stats.culledObjects++;
                return false;
            }
            
            // Calcular bounding sphere desde el bounding box
            const sphere = new THREE.Sphere();
            box.getBoundingSphere(sphere);
            
            // Verificar si el bounding sphere intersecta con el frustum
            const visible = this.frustum.intersectsSphere(sphere);
            
            if (visible) {
                this.stats.visibleObjects++;
            } else {
                this.stats.culledObjects++;
            }
            
            return visible;
        } catch (error) {
            // Si hay error al calcular, asumir visible para no romper el juego
            // Esto puede ocurrir si el objeto no tiene geometría válida o está corrupto
            debugLogger.warn('FrustumCuller', 'Error verificando visibilidad, asumiendo visible', {
                error: error.message,
                objectType: object?.constructor?.name || 'unknown'
            });
            this.stats.visibleObjects++;
            return true;
        }
    }
    
    /**
     * Filtrar array de objetos para obtener solo los visibles
     * @param {Array<THREE.Object3D>} objects - Array de objetos
     * @returns {Array<THREE.Object3D>} Array de objetos visibles
     */
    filterVisible(objects) {
        if (!Array.isArray(objects)) return [];
        return objects.filter(obj => this.isVisible(obj));
    }
    
    /**
     * Obtener estadísticas de uso
     * @returns {Object} Estadísticas de frustum culling
     */
    getStats() {
        const cullRate = this.stats.totalChecks > 0 
            ? (this.stats.culledObjects / this.stats.totalChecks) * 100 
            : 0;
        
        return {
            totalChecks: this.stats.totalChecks,
            visibleObjects: this.stats.visibleObjects,
            culledObjects: this.stats.culledObjects,
            cullRate: cullRate.toFixed(2) + '%',
            efficiency: cullRate > 30 ? 'Excelente' : cullRate > 10 ? 'Regular' : 'Baja'
        };
    }
    
    /**
     * Resetear estadísticas
     */
    resetStats() {
        this.stats = {
            totalChecks: 0,
            visibleObjects: 0,
            culledObjects: 0
        };
    }
}
