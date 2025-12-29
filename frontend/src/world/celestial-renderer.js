/**
 * Renderizador de Sol y Luna en Three.js
 * 
 * Renderiza visualmente el sol y la luna en la escena usando las posiciones
 * calculadas por CelestialSystem.
 */
import * as THREE from 'three';
import { CelestialSystem } from './celestial-system.js';
import { debugLogger } from '../debug/logger.js';

export class CelestialRenderer {
    /**
     * @param {THREE.Scene} scene - Escena Three.js
     * @param {CelestialSystem} celestialSystem - Sistema celestial del frontend
     */
    constructor(scene, celestialSystem) {
        this.scene = scene;
        this.celestialSystem = celestialSystem;
        
        // Meshes del sol y luna
        this.solMesh = null;
        this.lunaMesh = null;
        
        // Configuración
        // Tamaños aumentados para visibilidad desde distancia (sol y luna están a ~500m de altura)
        this.solRadius = 50.0; // Aumentado de 20 a 50 metros
        this.lunaRadius = 30.0; // Aumentado de 10 a 30 metros
        this.solColor = 0xFFD700; // Dorado
        this.lunaColor = 0xE6E6FA; // Lavanda
        
        // Crear meshes
        this.createMeshes();
    }
    
    /**
     * Crear meshes del sol y luna
     */
    createMeshes() {
        try {
            // Crear sol
            const solGeometry = new THREE.SphereGeometry(this.solRadius, 32, 32);
            // Usar MeshStandardMaterial para soportar emissive y emissiveIntensity
            const solMaterial = new THREE.MeshStandardMaterial({
                color: this.solColor,
                emissive: this.solColor,
                emissiveIntensity: 1.0
            });
            this.solMesh = new THREE.Mesh(solGeometry, solMaterial);
            this.scene.add(this.solMesh);
            
            // Crear luna
            const lunaGeometry = new THREE.SphereGeometry(this.lunaRadius, 32, 32);
            // Usar MeshStandardMaterial para soportar emissive y emissiveIntensity
            const lunaMaterial = new THREE.MeshStandardMaterial({
                color: this.lunaColor,
                emissive: this.lunaColor,
                emissiveIntensity: 0.3
            });
            this.lunaMesh = new THREE.Mesh(lunaGeometry, lunaMaterial);
            this.scene.add(this.lunaMesh);
            
            // Aplicar fase lunar inicial
            this.updateLunaPhase();
        } catch (error) {
            debugLogger.error('CelestialRenderer', 'Error creando meshes', { error });
        }
    }
    
    /**
     * Actualizar posición y apariencia del sol y luna
     * @param {number} [interpolationFactor] - Factor de interpolación para movimiento suave
     */
    update(interpolationFactor = 0.0) {
        if (!this.solMesh || !this.lunaMesh) {
            if (!this.solMesh) {
                debugLogger.warn('CelestialRenderer', 'Sol mesh no existe');
            }
            if (!this.lunaMesh) {
                debugLogger.warn('CelestialRenderer', 'Luna mesh no existe');
            }
            return;
        }
        
        try {
            // Obtener centro del mundo para ajustar posiciones
            const worldCenter = this.celestialSystem.worldCenter || { x: 0.0, y: 0.0 };
            
            // Actualizar posición del sol
            try {
                const solPos = this.celestialSystem.getSunPosition(interpolationFactor);
                // En Three.js: X es horizontal, Y es vertical (altura), Z es profundidad
                // El sistema celestial devuelve: x (horizontal relativo al centro), y (horizontal relativo al centro), z (altura)
                // Ajustar al centro del mundo
                const finalSolPos = {
                    x: solPos.x + worldCenter.x,
                    y: solPos.z, // Altura (Z del backend) es Y en Three.js
                    z: solPos.y + worldCenter.y
                };
                this.solMesh.position.set(finalSolPos.x, finalSolPos.y, finalSolPos.z);
            } catch (error) {
                debugLogger.warn('CelestialRenderer', 'Error obteniendo posición del sol', { error });
            }
            
            // Actualizar posición de la luna
            try {
                const lunaPos = this.celestialSystem.getLunaPosition(interpolationFactor);
                const finalLunaPos = {
                    x: lunaPos.x + worldCenter.x,
                    y: lunaPos.z, // Altura (Z del backend) es Y en Three.js
                    z: lunaPos.y + worldCenter.y
                };
                this.lunaMesh.position.set(finalLunaPos.x, finalLunaPos.y, finalLunaPos.z);
            } catch (error) {
                debugLogger.warn('CelestialRenderer', 'Error obteniendo posición de la luna', { error });
            }
            
            // Actualizar fase lunar (apariencia)
            this.updateLunaPhase();
        } catch (error) {
            debugLogger.error('CelestialRenderer', 'Error actualizando renderizador celestial', { error });
        }
    }
    
    /**
     * Actualizar apariencia de la luna según su fase
     */
    updateLunaPhase() {
        if (!this.lunaMesh) {
            return;
        }
        
        const phase = this.celestialSystem.getLunaPhase();
        
        // Crear textura o material que muestre la fase lunar
        // Simplificado: ajustar opacidad o crear geometría que muestre la fase
        // Para implementación completa, se podría usar una textura o shader personalizado
        
        // Por ahora, ajustar intensidad emisiva según fase
        // Fase 0.0 = nueva (mínima), 0.5 = llena (máxima), 1.0 = nueva (mínima)
        const intensity = phase < 0.5 
            ? phase * 2.0  // Creciente: 0.0 a 1.0
            : (1.0 - phase) * 2.0; // Menguante: 1.0 a 0.0
        
        this.lunaMesh.material.emissiveIntensity = intensity * 0.3;
    }
    
    /**
     * Remover meshes de la escena
     */
    dispose() {
        if (this.solMesh) {
            this.scene.remove(this.solMesh);
            this.solMesh.geometry.dispose();
            this.solMesh.material.dispose();
            this.solMesh = null;
        }
        
        if (this.lunaMesh) {
            this.scene.remove(this.lunaMesh);
            this.lunaMesh.geometry.dispose();
            this.lunaMesh.material.dispose();
            this.lunaMesh = null;
        }
    }
}

