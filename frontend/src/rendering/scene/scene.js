/**
 * Escena base de Three.js con configuración mínima
 */
import * as THREE from 'three';
import { Camera } from './camera.js';
import { Renderer } from './renderer.js';
import { Controls } from './controls.js';
import { Lights } from './lights.js';
import { Helpers } from './helpers.js';

export class Scene3D {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.camera = new Camera(container);
        this.renderer = new Renderer(container);
        this.controls = new Controls(this.camera.camera, this.renderer.getDomElement());
        this.lights = new Lights();
        this.helpers = new Helpers();
        this.lights.setup(this.scene);
        this.setupResizeHandler();
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.updateAspect(width, height);
        this.renderer.setSize(width, height);
    }

    updateHelpers(anchoMetros, altoMetros) {
        this.helpers.update(this.scene, anchoMetros, altoMetros);
    }

    centerCamera(centerX, centerY, centerZ) {
        this.camera.centerAt(centerX, centerY, centerZ);
        this.controls.setTarget(centerX, centerZ, centerY);
    }

    animate(performanceManager = null) {
        requestAnimationFrame(() => this.animate(performanceManager));
        this.controls.update();
        this.renderer.render(this.scene, this.camera.camera);
        if (performanceManager) performanceManager.measureFPS();
    }
}
