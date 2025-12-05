/**
 * Gestión de cámara PerspectiveCamera
 */
import * as THREE from 'three';
import {
    CAMERA_FOV,
    CAMERA_NEAR,
    CAMERA_FAR,
    CAMERA_POSITION_X,
    CAMERA_POSITION_Y,
    CAMERA_POSITION_Z
} from '../constants.js';

export class Camera {
    /**
     * @param {HTMLElement} container - Contenedor HTML para calcular aspect ratio
     */
    constructor(container) {
        this.container = container;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.camera = new THREE.PerspectiveCamera(
            CAMERA_FOV,
            width / height,
            CAMERA_NEAR,
            CAMERA_FAR
        );
        
        this.camera.position.set(CAMERA_POSITION_X, CAMERA_POSITION_Y, CAMERA_POSITION_Z);
        this.camera.lookAt(0, 0, 0);
    }
    
    /**
     * Actualizar aspect ratio cuando cambia el tamaño del contenedor
     * @param {number} width - Nuevo ancho
     * @param {number} height - Nuevo alto
     */
    updateAspect(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
    
    /**
     * Centrar cámara en una posición
     * @param {number} centerX - Centro X
     * @param {number} centerY - Centro Y
     * @param {number} centerZ - Centro Z
     * @param {number} offsetX - Offset X desde el centro
     * @param {number} offsetY - Offset Y desde el centro
     * @param {number} offsetZ - Offset Z desde el centro
     */
    centerAt(centerX, centerY, centerZ, offsetX = 10, offsetY = 10, offsetZ = 10) {
        this.camera.position.set(
            centerX + offsetX,
            centerZ + offsetZ,
            centerY + offsetY
        );
        this.camera.lookAt(centerX, centerZ, centerY);
    }
    
    /**
     * Obtener frustum de la cámara
     * Útil para frustum culling de partículas
     * @returns {THREE.Frustum} - Frustum de la cámara
     */
    getFrustum() {
        const frustum = new THREE.Frustum();
        const matrix = new THREE.Matrix4().multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        frustum.setFromProjectionMatrix(matrix);
        return frustum;
    }
    
    /**
     * Verificar si la cámara se movió comparando la matriz actual con la última conocida
     * Útil para invalidar caches de frustum culling
     * @param {THREE.Matrix4} lastMatrix - Última matriz conocida (opcional)
     * @returns {boolean} - True si la cámara se movió, False si no cambió
     */
    hasCameraMoved(lastMatrix = null) {
        if (!lastMatrix) {
            return true; // Si no hay matriz previa, asumir que se movió
        }
        
        const currentMatrix = this.camera.matrixWorldInverse.clone();
        return !currentMatrix.equals(lastMatrix);
    }
    
    /**
     * Obtener la matriz world inverse actual de la cámara
     * Útil para tracking de movimiento de cámara
     * @returns {THREE.Matrix4} - Matriz world inverse actual
     */
    getMatrixWorldInverse() {
        return this.camera.matrixWorldInverse.clone();
    }
}

