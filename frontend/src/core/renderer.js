/**
 * Renderizador WebGL
 */
import * as THREE from 'three';
import { COLOR_CIELO } from '../constants.js';

export class Renderer {
    /**
     * @param {HTMLElement} container - Contenedor HTML para el canvas
     */
    constructor(container) {
        this.container = container;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(COLOR_CIELO);
        container.appendChild(this.renderer.domElement);
    }
    
    /**
     * Renderizar escena con cámara
     * @param {THREE.Scene} scene - Escena Three.js
     * @param {THREE.Camera} camera - Cámara Three.js
     */
    render(scene, camera) {
        this.renderer.render(scene, camera);
    }
    
    /**
     * Actualizar tamaño del renderizador
     * @param {number} width - Nuevo ancho
     * @param {number} height - Nuevo alto
     */
    setSize(width, height) {
        this.renderer.setSize(width, height);
    }
    
    /**
     * Obtener el elemento DOM del canvas
     * @returns {HTMLCanvasElement}
     */
    getDomElement() {
        return this.renderer.domElement;
    }
}

