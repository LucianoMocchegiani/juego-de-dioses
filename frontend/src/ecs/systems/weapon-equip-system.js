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
     * Inspeccionar estructura completa de un modelo de arma
     * @param {THREE.Object3D} model - Modelo a inspeccionar
     * @param {string} modelUrl - URL del modelo (para contexto)
     * @returns {Object} Estructura detallada del modelo
     */
    inspectWeaponModel(model, modelUrl) {
        const structure = {
            url: modelUrl,
            root: {
                name: model.name || 'unnamed',
                type: model.type,
                uuid: model.uuid,
                position: {
                    x: model.position.x,
                    y: model.position.y,
                    z: model.position.z
                },
                rotation: {
                    x: model.rotation.x,
                    y: model.rotation.y,
                    z: model.rotation.z
                },
                scale: {
                    x: model.scale.x,
                    y: model.scale.y,
                    z: model.scale.z
                },
                visible: model.visible,
                childrenCount: model.children.length
            },
            hierarchy: [], // Jerarquía completa del árbol
            meshes: [],
            groups: [],
            other: [],
            analysis: {
                hasIntermediateGroups: false,
                meshPathToRoot: [],
                totalTransformations: []
            }
        };
        
        // Obtener referencia al object pool (optimización JDG-047)
        // Intenta obtener desde window.app primero, luego desde el scene si está disponible
        const objectPool = (typeof window !== 'undefined' && window.app?.objectPool) || 
                          (this.scene && this.scene.userData?.app?.objectPool) || 
                          null;
        
        // Función recursiva para construir la jerarquía
        const buildHierarchy = (object, parent = null, depth = 0, path = []) => {
            const currentPath = [...path, object.name || object.type || 'unnamed'];
            
            // Obtener objetos del pool o crear nuevos si el pool no está disponible (optimización JDG-047)
            const worldPos = objectPool?.vector3?.acquire() || new THREE.Vector3();
            const worldQuat = objectPool?.quaternion?.acquire() || new THREE.Quaternion();
            const worldRot = objectPool?.euler?.acquire() || new THREE.Euler();
            const worldScale = objectPool?.vector3?.acquire() || new THREE.Vector3();
            
            try {
                // Calcular posición mundial acumulada
                object.getWorldPosition(worldPos);
                object.getWorldQuaternion(worldQuat);
                worldRot.setFromQuaternion(worldQuat); // Convertir quaternion a euler
                object.getWorldScale(worldScale);
            
            const objInfo = {
                depth: depth,
                path: currentPath,
                name: object.name || 'unnamed',
                type: object.type,
                uuid: object.uuid,
                localTransform: {
                    position: {
                        x: object.position.x,
                        y: object.position.y,
                        z: object.position.z
                    },
                    rotation: {
                        x: object.rotation.x,
                        y: object.rotation.y,
                        z: object.rotation.z
                    },
                    scale: {
                        x: object.scale.x,
                        y: object.scale.y,
                        z: object.scale.z
                    }
                },
                worldTransform: {
                    position: {
                        x: worldPos.x,
                        y: worldPos.y,
                        z: worldPos.z
                    },
                    rotation: {
                        x: worldRot.x,
                        y: worldRot.y,
                        z: worldRot.z
                    },
                    scale: {
                        x: worldScale.x,
                        y: worldScale.y,
                        z: worldScale.z
                    }
                },
                visible: object.visible,
                parent: parent?.name || parent?.type || 'root',
                childrenCount: object.children.length,
                hasTransform: !(
                    object.position.x === 0 && object.position.y === 0 && object.position.z === 0 &&
                    object.rotation.x === 0 && object.rotation.y === 0 && object.rotation.z === 0 &&
                    object.scale.x === 1 && object.scale.y === 1 && object.scale.z === 1
                )
            };
            
            if (object.isMesh) {
                objInfo.material = {
                    type: object.material?.constructor?.name || 'none',
                    name: object.material?.name || 'unnamed',
                    color: object.material?.color?.getHexString() || 'none',
                    metalness: object.material?.metalness,
                    roughness: object.material?.roughness,
                    transparent: object.material?.transparent,
                    opacity: object.material?.opacity
                };
                
                objInfo.geometry = {
                    type: object.geometry?.constructor?.name || 'none',
                    vertices: object.geometry?.attributes?.position?.count || 0,
                    faces: object.geometry?.attributes?.position?.count ? 
                        Math.floor(object.geometry.attributes.position.count / 3) : 0
                };
                
                structure.meshes.push(objInfo);
                structure.analysis.meshPathToRoot.push({
                    meshName: object.name || 'unnamed',
                    path: currentPath,
                    depth: depth,
                    localPosition: objInfo.localTransform.position,
                    worldPosition: objInfo.worldTransform.position,
                    distanceFromOrigin: Math.sqrt(
                        Math.pow(objInfo.localTransform.position.x, 2) + 
                        Math.pow(objInfo.localTransform.position.y, 2) + 
                        Math.pow(objInfo.localTransform.position.z, 2)
                    )
                });
            } else if (object.isGroup) {
                // Verificar si es un Group intermedio (no es el root)
                if (depth > 0) {
                    structure.analysis.hasIntermediateGroups = true;
                }
                
                // Si el Group tiene transformación, puede afectar el origen
                if (objInfo.hasTransform) {
                    structure.analysis.totalTransformations.push({
                        type: 'Group',
                        name: object.name || 'unnamed',
                        path: currentPath,
                        transform: objInfo.localTransform,
                        note: 'Este Group tiene transformación que puede afectar la posición del mesh'
                    });
                }
                
                structure.groups.push(objInfo);
            } else {
                structure.other.push(objInfo);
            }
            
            structure.hierarchy.push(objInfo);
            
                // Recursión para hijos
                object.children.forEach(child => {
                    buildHierarchy(child, object, depth + 1, currentPath);
                });
            } finally {
                // SIEMPRE devolver objetos al pool después de usarlos (optimización JDG-047)
                // Esto garantiza que los objetos se liberen incluso si hay errores
                if (objectPool) {
                    objectPool.vector3?.release(worldPos);
                    objectPool.quaternion?.release(worldQuat);
                    objectPool.euler?.release(worldRot);
                    objectPool.vector3?.release(worldScale);
                }
            }
        };
        
        // Construir jerarquía completa
        buildHierarchy(model);
        
        // Análisis final
        structure.analysis.summary = {
            totalObjects: structure.hierarchy.length,
            totalMeshes: structure.meshes.length,
            totalGroups: structure.groups.length,
            maxDepth: Math.max(...structure.hierarchy.map(o => o.depth)),
            hasIntermediateGroups: structure.analysis.hasIntermediateGroups,
            meshesWithTransform: structure.meshes.filter(m => m.hasTransform).length,
            groupsWithTransform: structure.groups.filter(g => g.hasTransform).length,
            warning: structure.analysis.hasIntermediateGroups ? 
                '⚠️ El modelo tiene Groups intermedios que pueden afectar el origen. Verifica las transformaciones.' :
                '✅ El modelo tiene estructura simple (solo root + mesh)'
        };
        
        return structure;
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
            
            debugLogger.debug('WeaponEquipSystem', `Intentando equipar arma en entidad ${entityId}`, {
                weaponType: weapon.weaponType,
                weaponConfig: weaponConfig,
                modelUrl: modelUrl,
                backendBase: backendBase
            });
            
            // Verificar si ya se está cargando este modelo
            if (this.loadingPromises.has(modelUrl)) {
                debugLogger.debug('WeaponEquipSystem', `Modelo ya está cargando, esperando...`, {
                    modelUrl: modelUrl,
                    entityId: entityId
                });
                // Esperar a que termine la carga en curso
                const weaponModel = await this.loadingPromises.get(modelUrl);
                debugLogger.debug('WeaponEquipSystem', `Modelo terminó de cargar (desde promesa)`, {
                    modelUrl: modelUrl,
                    modelType: weaponModel?.constructor?.name,
                    hasChildren: weaponModel?.children?.length
                });
                this.attachWeaponToEntity(entityId, weapon, render, weaponConfig, weaponModel);
                return;
            }
            
            // Verificar cache
            let weaponModel = null;
            if (this.weaponCache.has(modelUrl)) {
                debugLogger.debug('WeaponEquipSystem', `Modelo encontrado en cache`, {
                    modelUrl: modelUrl,
                    entityId: entityId
                });
                weaponModel = this.weaponCache.get(modelUrl); // Ya clona internamente
                debugLogger.debug('WeaponEquipSystem', `Modelo clonado desde cache`, {
                    modelUrl: modelUrl,
                    modelType: weaponModel?.constructor?.name,
                    hasChildren: weaponModel?.children?.length
                });
                this.attachWeaponToEntity(entityId, weapon, render, weaponConfig, weaponModel);
            } else {
                debugLogger.debug('WeaponEquipSystem', `Modelo NO está en cache, iniciando carga...`, {
                    modelUrl: modelUrl,
                    entityId: entityId
                });
                // Cargar modelo (crear promesa para evitar cargas duplicadas)
                const loadPromise = this.modelLoader.loadModel(modelUrl, 'glb')
                    .then(loadedModel => {
                        // Inspeccionar estructura completa del modelo
                        const modelStructure = this.inspectWeaponModel(loadedModel, modelUrl);
                        
                        debugLogger.debug('WeaponEquipSystem', `Modelo cargado exitosamente`, {
                            modelUrl: modelUrl,
                            modelType: loadedModel?.constructor?.name,
                            hasChildren: loadedModel?.children?.length,
                            childrenNames: loadedModel?.children?.map(c => c.name || c.type)
                        });
                        
                        // Log resumen de la estructura
                        debugLogger.info('WeaponEquipSystem', `Análisis de estructura del modelo de arma`, {
                            url: modelStructure.url,
                            summary: modelStructure.analysis.summary,
                            hasIntermediateGroups: modelStructure.analysis.hasIntermediateGroups,
                            warning: modelStructure.analysis.summary.warning
                        });
                        
                        // Log detallado de la jerarquía completa
                        debugLogger.info('WeaponEquipSystem', `Jerarquía completa del modelo`, {
                            url: modelStructure.url,
                            hierarchy: modelStructure.hierarchy.map(obj => ({
                                depth: obj.depth,
                                path: obj.path.join(' → '),
                                type: obj.type,
                                name: obj.name,
                                hasTransform: obj.hasTransform,
                                localPosition: obj.localTransform.position,
                                worldPosition: obj.worldTransform.position
                            }))
                        });
                        
                        // Log de paths desde meshes hasta root
                        debugLogger.info('WeaponEquipSystem', `Paths desde meshes hasta root`, {
                            url: modelStructure.url,
                            meshPaths: modelStructure.analysis.meshPathToRoot.map(m => ({
                                meshName: m.meshName,
                                path: m.path.join(' → '),
                                depth: m.depth,
                                localPosition: m.localPosition,
                                worldPosition: m.worldPosition,
                                distanceFromOrigin: m.distanceFromOrigin.toFixed(3)
                            }))
                        });
                        
                        // Log de transformaciones que pueden afectar el origen
                        if (modelStructure.analysis.totalTransformations.length > 0) {
                            debugLogger.warn('WeaponEquipSystem', `⚠️ Transformaciones detectadas que pueden afectar el origen`, {
                                url: modelStructure.url,
                                transformations: modelStructure.analysis.totalTransformations.map(t => ({
                                    type: t.type,
                                    name: t.name,
                                    path: t.path.join(' → '),
                                    transform: t.transform,
                                    note: t.note
                                }))
                            });
                        }
                        
                        // Log completo de estructura (para debugging detallado)
                        debugLogger.debug('WeaponEquipSystem', `Estructura completa detallada del modelo`, {
                            url: modelStructure.url,
                            root: modelStructure.root,
                            totalMeshes: modelStructure.meshes.length,
                            totalGroups: modelStructure.groups.length,
                            totalOther: modelStructure.other.length,
                            meshes: modelStructure.meshes,
                            groups: modelStructure.groups,
                            other: modelStructure.other,
                            analysis: modelStructure.analysis
                        });
                        
                        const originalClone = loadedModel.clone();
                        originalClone.scale.set(1, 1, 1);
                        this.weaponCache.set(modelUrl, originalClone);
                        this.loadingPromises.delete(modelUrl);
                        debugLogger.debug('WeaponEquipSystem', `Modelo clonado y cacheado`, {
                            modelUrl: modelUrl
                        });
                        return loadedModel;
                    })
                    .catch(error => {
                        debugLogger.error('WeaponEquipSystem', `Error en promesa de carga`, {
                            modelUrl: modelUrl,
                            error: error.message,
                            stack: error.stack
                        });
                        // Remover promesa del cache en caso de error
                        this.loadingPromises.delete(modelUrl);
                        throw error;
                    });
                
                this.loadingPromises.set(modelUrl, loadPromise);
                weaponModel = await loadPromise;
                debugLogger.debug('WeaponEquipSystem', `Modelo listo para adjuntar`, {
                    modelUrl: modelUrl,
                    modelType: weaponModel?.constructor?.name,
                    hasChildren: weaponModel?.children?.length
                });
                this.attachWeaponToEntity(entityId, weapon, render, weaponConfig, weaponModel);
            }
        } catch (error) {
            debugLogger.error('WeaponEquipSystem', `Error equipando arma "${weaponConfig.path}" en entidad ${entityId}:`, {
                error: error.message,
                stack: error.stack,
                modelUrl: `${getBackendBaseUrl()}/static/models/${weaponConfig.path}`,
                weaponType: weapon.weaponType,
                weaponConfig: weaponConfig
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
        debugLogger.debug('WeaponEquipSystem', `Adjuntando arma a entidad`, {
            entityId: entityId,
            weaponType: weapon.weaponType,
            modelPath: weaponConfig.path,
            hasWeaponModel: !!weaponModel,
            hasRenderMesh: !!render?.mesh,
            weaponModelType: weaponModel?.constructor?.name,
            weaponModelChildren: weaponModel?.children?.length
        });
        
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
        
        debugLogger.debug('WeaponEquipSystem', `Configuración de attachment`, {
            attachmentConfig: attachmentConfig,
            weaponConfig: weaponConfig
        });
        
        // Asegurar que el arma sea visible
        weaponModel.visible = true;
        let meshCount = 0;
        let firstMesh = null;
        weaponModel.traverse((child) => {
            if (child.isMesh) {
                child.visible = true;
                child.castShadow = true;
                child.receiveShadow = true;
                meshCount++;
                if (!firstMesh) {
                    firstMesh = child;
                }
            }
        });
        
        debugLogger.debug('WeaponEquipSystem', `Modelo preparado`, {
            visible: weaponModel.visible,
            meshCount: meshCount,
            totalChildren: weaponModel.children.length,
            firstMeshPosition: firstMesh ? {
                x: firstMesh.position.x,
                y: firstMesh.position.y,
                z: firstMesh.position.z
            } : null
        });
        
        // Si el modelo es un Group y el mesh está desplazado, compensar con offset
        // El offset se aplica al Group, pero necesitamos compensar la posición del mesh dentro
        if (weaponModel.isGroup && firstMesh) {
            const meshOffset = {
                x: -firstMesh.position.x,
                y: -firstMesh.position.y,
                z: -firstMesh.position.z
            };
            
            // Solo compensar si el mesh está significativamente desplazado (> 0.01 unidades)
            const significantOffset = Math.abs(meshOffset.x) > 0.01 || 
                                    Math.abs(meshOffset.y) > 0.01 || 
                                    Math.abs(meshOffset.z) > 0.01;
            
            if (significantOffset) {
                debugLogger.debug('WeaponEquipSystem', `Mesh desplazado detectado, compensando con offset`, {
                    meshPosition: {
                        x: firstMesh.position.x,
                        y: firstMesh.position.y,
                        z: firstMesh.position.z
                    },
                    calculatedOffset: meshOffset,
                    originalOffset: attachmentConfig.offset
                });
                
                // Ajustar el offset para compensar la posición del mesh
                attachmentConfig.offset = {
                    x: (attachmentConfig.offset.x || 0) + meshOffset.x,
                    y: (attachmentConfig.offset.y || 0) + meshOffset.y,
                    z: (attachmentConfig.offset.z || 0) + meshOffset.z
                };
                
                debugLogger.debug('WeaponEquipSystem', `Offset ajustado`, {
                    newOffset: attachmentConfig.offset
                });
            }
        }
        
        const attachResult = attachWeaponToCharacter(weaponModel, render.mesh, attachmentConfig);
        
        debugLogger.debug('WeaponEquipSystem', `Resultado de attachWeaponToCharacter`, {
            success: attachResult,
            weaponModelParent: weaponModel?.parent?.name || weaponModel?.parent?.type,
            weaponModelPosition: {
                x: weaponModel?.position?.x,
                y: weaponModel?.position?.y,
                z: weaponModel?.position?.z
            },
            weaponModelScale: {
                x: weaponModel?.scale?.x,
                y: weaponModel?.scale?.y,
                z: weaponModel?.scale?.z
            }
        });
        
        if (attachResult) {
            // Actualizar WeaponComponent con información del arma equipada
            weapon.modelPath = weaponConfig.path;
            weapon.modelInstance = weaponModel;
            weapon.attachmentPoint = weaponConfig.attachmentPoint;
            weapon.offset = weaponConfig.offset;
            weapon.rotation = weaponConfig.rotation;
            weapon.scale = weaponConfig.scale;
            
            debugLogger.info('WeaponEquipSystem', `Arma "${weaponConfig.path}" equipada exitosamente en entidad ${entityId}`, {
                attachmentPoint: attachmentConfig.point,
                weaponType: weapon.weaponType
            });
        } else {
            debugLogger.error('WeaponEquipSystem', `No se pudo adjuntar arma "${weaponConfig.path}" a entidad ${entityId}`, {
                attachmentPoint: attachmentConfig.point,
                weaponType: weapon.weaponType,
                hasRenderMesh: !!render?.mesh,
                renderMeshType: render?.mesh?.constructor?.name,
                hasSkeleton: !!render?.mesh?.skeleton
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
