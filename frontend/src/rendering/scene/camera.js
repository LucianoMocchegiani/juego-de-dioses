/**
 * Gestión de cámara PerspectiveCamera
 */
import * as THREE from 'three';
import {
    CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR,
    CAMERA_POSITION_X, CAMERA_POSITION_Y, CAMERA_POSITION_Z
} from '../../config/constants.js';

export class Camera {
    constructor(container) {
        this.container = container;
        const width = container.clientWidth;
        const height = container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, CAMERA_NEAR, CAMERA_FAR);
        this.camera.position.set(CAMERA_POSITION_X, CAMERA_POSITION_Y, CAMERA_POSITION_Z);
        this.camera.lookAt(0, 0, 0);
    }

    updateAspect(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    centerAt(centerX, centerY, centerZ, offsetX = 10, offsetY = 10, offsetZ = 10) {
        this.camera.position.set(centerX + offsetX, centerZ + offsetZ, centerY + offsetY);
        this.camera.lookAt(centerX, centerZ, centerY);
    }

    getFrustum() {
        const frustum = new THREE.Frustum();
        const matrix = new THREE.Matrix4().multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        frustum.setFromProjectionMatrix(matrix);
        return frustum;
    }

    hasCameraMoved(lastMatrix = null) {
        if (!lastMatrix) return true;
        const currentMatrix = this.camera.matrixWorldInverse.clone();
        return !currentMatrix.equals(lastMatrix);
    }

    getMatrixWorldInverse() {
        return this.camera.matrixWorldInverse.clone();
    }
}
