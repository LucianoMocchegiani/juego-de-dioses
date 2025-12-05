/**
 * Helpers visuales (grid, axes) con gestión dinámica
 */
import * as THREE from 'three';
import {
    COLOR_GRID_PRIMARY,
    COLOR_GRID_SECONDARY
} from '../constants.js';

export class Helpers {
    constructor() {
        this.gridHelper = null;
        this.axesHelper = null;
    }
    
    /**
     * Actualizar helpers según tamaño del terreno
     * @param {THREE.Scene} scene - Escena Three.js
     * @param {number} anchoMetros - Ancho del terreno en metros
     * @param {number} altoMetros - Alto del terreno en metros
     */
    update(scene, anchoMetros, altoMetros) {
        // Remover helpers antiguos si existen
        if (this.gridHelper) {
            scene.remove(this.gridHelper);
            this.gridHelper = null;
        }
        if (this.axesHelper) {
            scene.remove(this.axesHelper);
            this.axesHelper = null;
        }
        
        // Calcular tamaño de grilla (un poco más grande que el terreno para contexto)
        const gridSize = Math.max(anchoMetros, altoMetros) * 1.2;
        const gridDivisions = Math.max(20, Math.floor(gridSize / 2)); // División cada 2 metros aproximadamente
        
        // Crear grilla centrada en el terreno
        this.gridHelper = new THREE.GridHelper(
            gridSize,
            gridDivisions,
            COLOR_GRID_PRIMARY,
            COLOR_GRID_SECONDARY
        );
        // Posicionar grilla en el centro del terreno (en Y=0 para que esté al nivel del suelo)
        this.gridHelper.position.set(anchoMetros / 2, 0, altoMetros / 2);
        scene.add(this.gridHelper);
        
        // Crear ejes en el centro del terreno
        this.axesHelper = new THREE.AxesHelper(Math.max(anchoMetros, altoMetros) * 0.3);
        this.axesHelper.position.set(anchoMetros / 2, 0, altoMetros / 2);
        scene.add(this.axesHelper);
    }
    
    /**
     * Remover todos los helpers de la escena
     * @param {THREE.Scene} scene - Escena Three.js
     */
    remove(scene) {
        if (this.gridHelper) {
            scene.remove(this.gridHelper);
            this.gridHelper = null;
        }
        if (this.axesHelper) {
            scene.remove(this.axesHelper);
            this.axesHelper = null;
        }
    }
}

