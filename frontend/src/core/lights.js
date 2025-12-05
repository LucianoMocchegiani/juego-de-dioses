/**
 * Gestión de luces de la escena
 */
import * as THREE from 'three';
import {
    COLOR_LUZ_AMBIENTE,
    COLOR_LUZ_DIRECCIONAL,
    LUZ_AMBIENTE_INTENSIDAD,
    LUZ_DIRECCIONAL_INTENSIDAD,
    LUZ_DIRECCIONAL_POS_X,
    LUZ_DIRECCIONAL_POS_Y,
    LUZ_DIRECCIONAL_POS_Z
} from '../constants.js';

export class Lights {
    constructor() {
        this.ambientLight = null;
        this.directionalLight = null;
    }
    
    /**
     * Configurar luces en la escena
     * @param {THREE.Scene} scene - Escena Three.js
     */
    setup(scene) {
        // Luz ambiente
        this.ambientLight = new THREE.AmbientLight(
            COLOR_LUZ_AMBIENTE,
            LUZ_AMBIENTE_INTENSIDAD
        );
        scene.add(this.ambientLight);
        
        // Luz direccional
        this.directionalLight = new THREE.DirectionalLight(
            COLOR_LUZ_DIRECCIONAL,
            LUZ_DIRECCIONAL_INTENSIDAD
        );
        this.directionalLight.position.set(
            LUZ_DIRECCIONAL_POS_X,
            LUZ_DIRECCIONAL_POS_Y,
            LUZ_DIRECCIONAL_POS_Z
        );
        scene.add(this.directionalLight);
    }
    
    /**
     * Remover luces de la escena
     * @param {THREE.Scene} scene - Escena Three.js
     */
    remove(scene) {
        if (this.ambientLight) {
            scene.remove(this.ambientLight);
            this.ambientLight = null;
        }
        if (this.directionalLight) {
            scene.remove(this.directionalLight);
            this.directionalLight = null;
        }
    }
}

