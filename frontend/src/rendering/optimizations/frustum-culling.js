/**
 * FrustumCuller - Filtra objetos visibles según el frustum de la cámara.
 * Usado por RenderSystem para no procesar meshes fuera de vista.
 */
import * as THREE from 'three';

export class FrustumCuller {
    /**
     * @param {THREE.Camera} camera - Cámara Three.js
     */
    constructor(camera) {
        this.camera = camera;
        this.frustum = new THREE.Frustum();
        this.projScreenMatrix = new THREE.Matrix4();
    }

    /**
     * Actualizar frustum con la matriz de la cámara (llamar cada frame antes de isVisible).
     */
    update() {
        this.projScreenMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
    }

    /**
     * Comprobar si un mesh está dentro del frustum
     * @param {THREE.Object3D} mesh - Mesh u objeto Three.js
     * @returns {boolean}
     */
    isVisible(mesh) {
        if (!mesh) return false;
        const box = new THREE.Box3().setFromObject(mesh);
        return this.frustum.intersectsBox(box);
    }
}
