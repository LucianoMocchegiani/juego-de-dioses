/**
 * Helper para Carga de Animaciones
 * 
 * Maneja la carga de animaciones desde archivos GLB y el cache de animaciones.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getBackendBaseUrl } from '../../../utils/config.js';
import { debugLogger } from '../../../debug/logger.js';

const gltfLoader = new GLTFLoader();

export class AnimationLoader {
    constructor() {
        // Cache de animaciones cargadas
        this.animationCache = new Map();
    }

    /**
     * Cargar animación desde archivo GLB
     * @param {string} animationFile - Ruta del archivo de animación
     * @returns {Promise<THREE.AnimationClip[]>} Array de clips de animación
     */
    async loadAnimation(animationFile) {
        // Verificar cache
        if (this.animationCache.has(animationFile)) {
            return this.animationCache.get(animationFile);
        }

        const backendBase = getBackendBaseUrl();
        const url = `${backendBase}/static/models/${animationFile}`;

        try {
            const gltf = await gltfLoader.loadAsync(url);

            if (gltf.animations && gltf.animations.length > 0) {
                this.animationCache.set(animationFile, gltf.animations);
                debugLogger.debug('AnimationLoader', 'Animation loaded successfully', {
                    animationFile,
                    animationCount: gltf.animations.length
                });
                return gltf.animations;
            } else {
                debugLogger.warn('AnimationLoader', 'Animation file has no animations', {
                    animationFile,
                    url
                });
                return [];
            }
        } catch (error) {
            // Error cargando animación, retornar array vacío
            debugLogger.error('AnimationLoader', 'Error loading animation', {
                animationFile,
                url,
                error: error.message
            });
            return [];
        }
    }
}
