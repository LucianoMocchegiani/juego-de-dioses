/**
 * Controles de cámara (OrbitControls wrapper)
 */
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    CONTROLS_DAMPING_FACTOR,
    CONTROLS_MIN_DISTANCE,
    CONTROLS_MAX_DISTANCE
} from '../constants.js';

export class Controls {
    /**
     * @param {THREE.Camera} camera - Cámara Three.js
     * @param {HTMLElement} domElement - Elemento DOM para eventos
     */
    constructor(camera, domElement) {
        this.controls = new OrbitControls(camera, domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = CONTROLS_DAMPING_FACTOR;
        this.controls.minDistance = CONTROLS_MIN_DISTANCE;
        this.controls.maxDistance = CONTROLS_MAX_DISTANCE;
    }
    
    /**
     * Actualizar controles (debe llamarse en cada frame si damping está habilitado)
     */
    update() {
        this.controls.update();
    }
    
    /**
     * Establecer target de los controles
     * @param {number} x - Posición X del target
     * @param {number} y - Posición Y del target
     * @param {number} z - Posición Z del target
     */
    setTarget(x, y, z) {
        this.controls.target.set(x, y, z);
        this.controls.update();
    }
    
    /**
     * Obtener el objeto OrbitControls interno
     * @returns {OrbitControls}
     */
    getControls() {
        return this.controls;
    }
    
    /**
     * Habilitar o deshabilitar los controles
     * @param {boolean} enabled - True para habilitar, false para deshabilitar
     */
    setEnabled(enabled) {
        this.controls.enabled = enabled;
    }
}

