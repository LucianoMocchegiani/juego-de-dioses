/**
 * Controles de cámara (OrbitControls wrapper)
 */
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONTROLS_DAMPING_FACTOR, CONTROLS_MIN_DISTANCE, CONTROLS_MAX_DISTANCE } from '../../config/constants.js';

export class Controls {
    constructor(camera, domElement) {
        this.controls = new OrbitControls(camera, domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = CONTROLS_DAMPING_FACTOR;
        this.controls.minDistance = CONTROLS_MIN_DISTANCE;
        this.controls.maxDistance = CONTROLS_MAX_DISTANCE;
    }

    update() { this.controls.update(); }

    setTarget(x, y, z) {
        this.controls.target.set(x, y, z);
        this.controls.update();
    }

    getControls() { return this.controls; }

    setEnabled(enabled) { this.controls.enabled = enabled; }
}
