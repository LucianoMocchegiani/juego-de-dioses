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
} from '../config/constants.js';

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
     * Actualizar iluminación según ciclo día/noche
     * @param {Object} celestialSystem - Sistema celestial del frontend
     */
    updateLighting(celestialSystem) {
        if (!this.ambientLight || !this.directionalLight) {
            return;
        }
        
        const sunIntensity = celestialSystem.getSunIntensity();
        const isDaytime = celestialSystem.isDaytime();
        const hour = celestialSystem.getCurrentHour();
        
        // Actualizar luz ambiente según intensidad solar
        // Día: más brillante, Noche: más oscuro
        const ambientIntensity = 0.3 + (sunIntensity * 0.4); // 0.3 a 0.7
        this.ambientLight.intensity = ambientIntensity;
        
        // Actualizar luz direccional según posición del sol
        const directionalIntensity = sunIntensity * 1.5; // 0.0 a 1.5
        this.directionalLight.intensity = directionalIntensity;
        
        // Actualizar color de la luz direccional según hora
        if (isDaytime) {
            // Día: luz blanca/amarilla cálida
            if (hour >= 6 && hour <= 10) {
                // Amanecer: naranja/rojo
                this.directionalLight.color.setHex(0xFFA500);
            } else if (hour >= 10 && hour <= 16) {
                // Mediodía: blanco
                this.directionalLight.color.setHex(0xFFFFFF);
            } else if (hour >= 16 && hour <= 18) {
                // Atardecer: naranja/rojo
                this.directionalLight.color.setHex(0xFF6347);
            } else {
                this.directionalLight.color.setHex(0xFFFFFF);
            }
        } else {
            // Noche: luz azul/plateada (luna)
            this.directionalLight.color.setHex(0xE6E6FA);
        }
        
        // Actualizar posición de la luz direccional según posición del sol
        const solPos = celestialSystem.getSunPosition();
        const worldCenter = celestialSystem.worldCenter || { x: 0.0, y: 0.0 };
        
        // En Three.js: X es horizontal, Y es vertical (altura), Z es profundidad
        // El sistema celestial devuelve: x (horizontal relativo al centro), y (horizontal relativo al centro), z (altura)
        this.directionalLight.position.set(
            solPos.x + worldCenter.x,
            solPos.z, // Altura (Y en Three.js)
            solPos.y + worldCenter.y
        );
        
        // Asegurar que la luz apunte hacia el centro del mundo
        this.directionalLight.lookAt(worldCenter.x, 0, worldCenter.y);
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

