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
} from '../../config/constants.js';

export class Lights {
    constructor() {
        this.ambientLight = null;
        this.directionalLight = null;
    }

    setup(scene) {
        this.ambientLight = new THREE.AmbientLight(COLOR_LUZ_AMBIENTE, LUZ_AMBIENTE_INTENSIDAD);
        scene.add(this.ambientLight);
        this.directionalLight = new THREE.DirectionalLight(COLOR_LUZ_DIRECCIONAL, LUZ_DIRECCIONAL_INTENSIDAD);
        this.directionalLight.position.set(LUZ_DIRECCIONAL_POS_X, LUZ_DIRECCIONAL_POS_Y, LUZ_DIRECCIONAL_POS_Z);
        scene.add(this.directionalLight);
    }

    updateLighting(celestialSystem) {
        if (!this.ambientLight || !this.directionalLight) return;
        const sunIntensity = celestialSystem.getSunIntensity();
        const isDaytime = celestialSystem.isDaytime();
        const hour = celestialSystem.getCurrentHour();
        this.ambientLight.intensity = 0.3 + (sunIntensity * 0.4);
        this.directionalLight.intensity = sunIntensity * 1.5;
        if (isDaytime) {
            if (hour >= 6 && hour <= 10) this.directionalLight.color.setHex(0xFFA500);
            else if (hour >= 10 && hour <= 16) this.directionalLight.color.setHex(0xFFFFFF);
            else if (hour >= 16 && hour <= 18) this.directionalLight.color.setHex(0xFF6347);
            else this.directionalLight.color.setHex(0xFFFFFF);
        } else {
            this.directionalLight.color.setHex(0xE6E6FA);
        }
        const solPos = celestialSystem.getSunPosition();
        const worldCenter = celestialSystem.worldCenter || { x: 0.0, y: 0.0 };
        this.directionalLight.position.set(solPos.x + worldCenter.x, solPos.z, solPos.y + worldCenter.y);
        this.directionalLight.lookAt(worldCenter.x, 0, worldCenter.y);
    }

    remove(scene) {
        if (this.ambientLight) { scene.remove(this.ambientLight); this.ambientLight = null; }
        if (this.directionalLight) { scene.remove(this.directionalLight); this.directionalLight = null; }
    }
}
