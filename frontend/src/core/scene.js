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
    /**
     * @param {HTMLElement} container - Contenedor HTML para el canvas
     */
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        
        // Inicializar componentes core
        this.camera = new Camera(container);
        this.renderer = new Renderer(container);
        this.controls = new Controls(this.camera.camera, this.renderer.getDomElement());
        this.lights = new Lights();
        this.helpers = new Helpers();
        
        // Configurar luces
        this.lights.setup(this.scene);
        
        // Configurar resize handler
        this.setupResizeHandler();
    }
    
    /**
     * Configurar handler de resize de ventana
     */
    setupResizeHandler() {
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    /**
     * Manejar resize de ventana
     */
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.updateAspect(width, height);
        this.renderer.setSize(width, height);
    }
    
    /**
     * Actualizar helpers según tamaño del terreno
     * @param {number} anchoMetros - Ancho del terreno en metros
     * @param {number} altoMetros - Alto del terreno en metros
     */
    updateHelpers(anchoMetros, altoMetros) {
        this.helpers.update(this.scene, anchoMetros, altoMetros);
    }
    
    /**
     * Centrar cámara en el mundo
     * @param {number} centerX - Centro X
     * @param {number} centerY - Centro Y
     * @param {number} centerZ - Centro Z
     */
    centerCamera(centerX, centerY, centerZ) {
        this.camera.centerAt(centerX, centerY, centerZ);
        this.controls.setTarget(centerX, centerZ, centerY);
    }
    
    /**
     * Animar escena
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera.camera);
    }
}

