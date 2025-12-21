/**
 * Sistema de Equipamiento de Armas
 * 
 * Gestiona la carga, equipamiento y desequipamiento de armas para entidades con WeaponComponent.
 * Carga modelos de armas desde archivos GLB y los adjunta al personaje usando bones del esqueleto.
 * 
 * IMPORTANTE: El personaje debe tener esqueleto (skeleton) para que el sistema funcione.
 */
import { System } from '../system.js';
import { ECS_CONSTANTS } from '../../config/ecs-constants.js';
import { WEAPON_MODELS } from '../../config/weapon-models-config.js';
import { ModelLoader } from '../models/model-loader.js';
import { ModelCache } from '../models/model-cache.js';
import { attachWeaponToCharacter, detachWeaponFromCharacter } from '../../utils/weapon-attachment.js';
import { getBackendBaseUrl } from '../../utils/config.js';
import { debugLogger } from '../../debug/logger.js';
import * as THREE from 'three';

export class WeaponEquipSystem extends System {
    /**
     * Crear sistema de equipamiento de armas
     * @param {THREE.Scene} scene - Escena Three.js donde se renderizan las armas
     */
    constructor(scene) {
        super();
        this.requiredComponents = [
            ECS_CONSTANTS.COMPONENT_NAMES.RENDER,
            ECS_CONSTANTS.COMPONENT_NAMES.WEAPON
        ];
        this.scene = scene;
        this.modelLoader = new ModelLoader();
        this.weaponCache = ModelCache.getInstance(); // Reutilizar cache global
        this.priority = 2.8; // Ejecutar después de AnimationMixerSystem (2.5) pero antes de RenderSystem (3)
        
        // Cache de promesas de carga para evitar cargas duplicadas
        this.loadingPromises = new Map();
    }
    
    /**
     * Actualizar sistema de equipamiento de armas
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame
     */
    update(_deltaTime) {
        const entities = this.getEntities();
        
        for (const entityId of entities) {
            const weapon = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.WEAPON);
            const render = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.RENDER);
            
            if (!weapon || !render || !render.mesh) {
                continue;
            }
            
            // Obtener configuración del arma
            const weaponConfig = WEAPON_MODELS[weapon.weaponType];
            if (!weaponConfig) {
                debugLogger.warn('WeaponEquipSystem', `No hay configuración para tipo de arma "${weapon.weaponType}" en entidad ${entityId}`);
                // Si no hay configuración, desequipar arma si existe
                if (weapon.modelInstance) {
                    this.unequipWeapon(entityId, weapon);
                }
                continue;
            }
            
            if (weapon.modelInstance && weapon.modelPath === weaponConfig.path) {
                continue;
            }
            
            // Si hay un arma diferente equipada, desequiparla primero
            if (weapon.modelInstance && weapon.modelPath !== weaponConfig.path) {
                this.unequipWeapon(entityId, weapon);
            }
            
            // Equipar nueva arma (asíncrono, se ejecutará progresivamente)
            if (!weapon.modelInstance) {
                this.equipWeapon(entityId, weapon, render, weaponConfig);
            }
        }
    }
    
    /**
     * Equipar arma a una entidad
     * @param {number} entityId - ID de la entidad
     * @param {WeaponComponent} weapon - Componente de arma
     * @param {RenderComponent} render - Componente de render
     * @param {Object} weaponConfig - Configuración del arma desde WEAPON_MODELS
     */
    async equipWeapon(entityId, weapon, render, weaponConfig) {
        try {
            // Construir URL del modelo
            const backendBase = getBackendBaseUrl();
            const modelUrl = `${backendBase}/static/models/${weaponConfig.path}`;
            
            // Verificar si ya se está cargando este modelo
            if (this.loadingPromises.has(modelUrl)) {
                // Esperar a que termine la carga en curso
                const weaponModel = await this.loadingPromises.get(modelUrl);
                this.attachWeaponToEntity(entityId, weapon, render, weaponConfig, weaponModel);
                return;
            }
            
            // Verificar cache
            let weaponModel = null;
            if (this.weaponCache.has(modelUrl)) {
                weaponModel = this.weaponCache.get(modelUrl); // Ya clona internamente
                this.attachWeaponToEntity(entityId, weapon, render, weaponConfig, weaponModel);
            } else {
                // Cargar modelo (crear promesa para evitar cargas duplicadas)
                const loadPromise = this.modelLoader.loadModel(modelUrl, 'glb')
                    .then(loadedModel => {
                        const originalClone = loadedModel.clone();
                        originalClone.scale.set(1, 1, 1);
                        this.weaponCache.set(modelUrl, originalClone);
                        this.loadingPromises.delete(modelUrl);
                        return loadedModel;
                    })
                    .catch(error => {
                        // Remover promesa del cache en caso de error
                        this.loadingPromises.delete(modelUrl);
                        throw error;
                    });
                
                this.loadingPromises.set(modelUrl, loadPromise);
                weaponModel = await loadPromise;
                this.attachWeaponToEntity(entityId, weapon, render, weaponConfig, weaponModel);
            }
        } catch (error) {
            debugLogger.error('WeaponEquipSystem', `Error equipando arma "${weaponConfig.path}" en entidad ${entityId}:`, {
                error: error.message,
                stack: error.stack,
                modelUrl: `${getBackendBaseUrl()}/static/models/${weaponConfig.path}`
            });
        }
    }
    
    /**
     * Adjuntar arma al personaje
     * @param {number} entityId - ID de la entidad
     * @param {WeaponComponent} weapon - Componente de arma
     * @param {RenderComponent} render - Componente de render
     * @param {Object} weaponConfig - Configuración del arma
     * @param {THREE.Mesh} weaponModel - Modelo del arma cargado
     */
    attachWeaponToEntity(entityId, weapon, render, weaponConfig, weaponModel) {
        // Preparar configuración de attachment
        const attachmentConfig = {
            point: weaponConfig.attachmentPoint,
            offset: weaponConfig.offset,
            rotation: {
                x: (weaponConfig.rotation.x || 0) * Math.PI / 180,
                y: (weaponConfig.rotation.y || 0) * Math.PI / 180,
                z: (weaponConfig.rotation.z || 0) * Math.PI / 180
            },
            scale: weaponConfig.scale
        };
        
        // Asegurar que el arma sea visible
        weaponModel.visible = true;
        weaponModel.traverse((child) => {
            if (child.isMesh) {
                child.visible = true;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        if (attachWeaponToCharacter(weaponModel, render.mesh, attachmentConfig)) {
            // Actualizar WeaponComponent con información del arma equipada
            weapon.modelPath = weaponConfig.path;
            weapon.modelInstance = weaponModel;
            weapon.attachmentPoint = weaponConfig.attachmentPoint;
            weapon.offset = weaponConfig.offset;
            weapon.rotation = weaponConfig.rotation;
            weapon.scale = weaponConfig.scale;
            
            debugLogger.info('WeaponEquipSystem', `Arma "${weaponConfig.path}" equipada exitosamente en entidad ${entityId}`, {
                attachmentPoint: attachmentConfig.point
            });
        } else {
            debugLogger.error('WeaponEquipSystem', `No se pudo adjuntar arma "${weaponConfig.path}" a entidad ${entityId}`, {
                attachmentPoint: attachmentConfig.point
            });
        }
    }
    
    /**
     * Desequipar arma de una entidad
     * @param {number} entityId - ID de la entidad
     * @param {WeaponComponent} weapon - Componente de arma
     */
    unequipWeapon(entityId, weapon) {
        if (weapon.modelInstance) {
            detachWeaponFromCharacter(weapon.modelInstance);
            
            // Remover de la escena si está directamente en ella
            if (weapon.modelInstance.parent === this.scene) {
                this.scene.remove(weapon.modelInstance);
            }
            
            // Limpiar referencia
            weapon.modelInstance = null;
            weapon.modelPath = null;
        }
    }
    
    /**
     * Limpiar recursos del sistema
     */
    destroy() {
        // Limpiar cache de promesas
        this.loadingPromises.clear();
    }
}
