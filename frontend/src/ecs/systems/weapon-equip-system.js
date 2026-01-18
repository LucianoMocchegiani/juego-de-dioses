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
import { WeaponModelInspector } from '../helpers/weapon/weapon-model-inspector.js';
import { WeaponModelLoader } from '../helpers/weapon/weapon-model-loader.js';
import { WeaponAttachmentManager } from '../helpers/weapon/weapon-attachment-manager.js';
import { debugLogger } from '../../debug/logger.js';

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
        this.priority = 2.8; // Ejecutar después de AnimationMixerSystem (2.5) pero antes de RenderSystem (3)
        
        // Crear helpers especializados
        const modelLoader = new ModelLoader();
        const weaponCache = ModelCache.getInstance(); // Reutilizar cache global
        const weaponInspector = new WeaponModelInspector();
        this.weaponModelLoader = new WeaponModelLoader(modelLoader, weaponCache, weaponInspector);
        this.weaponAttachmentManager = new WeaponAttachmentManager();
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
            
            // Si ya tiene la arma correcta equipada, no hacer nada
            if (weapon.modelInstance && weapon.modelPath === weaponConfig.path) {
                continue;
            }
            
            // Si hay un arma diferente equipada, desequiparla primero
            if (weapon.modelInstance && weapon.modelPath !== weaponConfig.path) {
                this.unequipWeapon(entityId, weapon);
                // Después de desequipar, modelInstance y modelPath se ponen en null
                // Continuar para equipar la nueva arma en el mismo frame
            }
            
            // Equipar nueva arma si no hay ninguna equipada o si se acaba de desequipar
            // Verificar tanto modelInstance como modelPath para asegurar que se equipa cuando cambia el weaponType
            if (!weapon.modelInstance || weapon.modelPath !== weaponConfig.path) {
                this.equipWeapon(entityId, weapon, render, weaponConfig);
            }
        }
    }
    
    /**
     * Equipar arma a una entidad
     * Delega a WeaponModelLoader y WeaponAttachmentManager
     * @param {number} entityId - ID de la entidad
     * @param {WeaponComponent} weapon - Componente de arma
     * @param {RenderComponent} render - Componente de render
     * @param {Object} weaponConfig - Configuración del arma desde WEAPON_MODELS
     */
    async equipWeapon(entityId, weapon, render, weaponConfig) {
        try {
            debugLogger.debug('WeaponEquipSystem', `Intentando equipar arma en entidad ${entityId}`, {
                weaponType: weapon.weaponType,
                weaponConfig: weaponConfig
            });
            
            // Obtener object pool si está disponible (optimización JDG-047)
            const objectPool = (typeof window !== 'undefined' && window.app?.objectPool) || 
                              (this.scene && this.scene.userData?.app?.objectPool) || 
                              null;
            
            // Cargar modelo usando WeaponModelLoader
            const weaponModel = await this.weaponModelLoader.loadWeaponModel(weaponConfig.path, objectPool);
            
            // Adjuntar arma usando WeaponAttachmentManager
            const attachResult = this.weaponAttachmentManager.attachWeapon(weaponModel, render.mesh, weaponConfig);
            
            if (attachResult) {
                // Actualizar WeaponComponent con información del arma equipada
                weapon.modelPath = weaponConfig.path;
                weapon.modelInstance = weaponModel;
                weapon.attachmentPoint = weaponConfig.attachmentPoint;
                weapon.offset = weaponConfig.offset;
                weapon.rotation = weaponConfig.rotation;
                weapon.scale = weaponConfig.scale;
                
                debugLogger.info('WeaponEquipSystem', `Arma "${weaponConfig.path}" equipada exitosamente en entidad ${entityId}`, {
                    attachmentPoint: weaponConfig.attachmentPoint,
                    weaponType: weapon.weaponType
                });
            } else {
                debugLogger.error('WeaponEquipSystem', `No se pudo adjuntar arma "${weaponConfig.path}" a entidad ${entityId}`, {
                    attachmentPoint: weaponConfig.attachmentPoint,
                    weaponType: weapon.weaponType,
                    hasRenderMesh: !!render?.mesh,
                    renderMeshType: render?.mesh?.constructor?.name,
                    hasSkeleton: !!render?.mesh?.skeleton
                });
            }
        } catch (error) {
            debugLogger.error('WeaponEquipSystem', `Error equipando arma "${weaponConfig.path}" en entidad ${entityId}:`, {
                error: error.message,
                stack: error.stack,
                weaponType: weapon.weaponType,
                weaponConfig: weaponConfig
            });
        }
    }
    
    
    /**
     * Desequipar arma de una entidad
     * Delega a WeaponAttachmentManager
     * @param {number} entityId - ID de la entidad
     * @param {WeaponComponent} weapon - Componente de arma
     */
    unequipWeapon(entityId, weapon) {
        if (weapon.modelInstance) {
            // Desequipar usando WeaponAttachmentManager
            this.weaponAttachmentManager.unequipWeapon(weapon.modelInstance, this.scene);
            
            // Limpiar referencia en WeaponComponent
            weapon.modelInstance = null;
            weapon.modelPath = null;
        }
    }
    
    /**
     * Limpiar recursos del sistema
     */
    destroy() {
        // Limpiar recursos de helpers
        if (this.weaponModelLoader) {
            this.weaponModelLoader.destroy();
        }
    }
}
