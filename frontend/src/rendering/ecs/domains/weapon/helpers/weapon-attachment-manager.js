/**
 * Helper para Adjuntar y Desequipar Armas
 * 
 * Maneja la adjuntación y desequipamiento de armas al personaje usando bones del esqueleto.
 */
import { attachWeaponToCharacter, detachWeaponFromCharacter } from '../../../../../utils/weapon-attachment.js';
import { debugLogger } from '../../../../../debug/logger.js';

export class WeaponAttachmentManager {
    /**
     * Adjuntar arma al personaje
     * @param {THREE.Object3D} weaponModel - Modelo del arma
     * @param {THREE.Object3D} characterMesh - Mesh del personaje
     * @param {Object} weaponConfig - Configuración del arma desde WEAPON_MODELS
     * @returns {boolean} True si se adjuntó correctamente
     */
    attachWeapon(weaponModel, characterMesh, weaponConfig) {
        debugLogger.debug('WeaponAttachmentManager', `Adjuntando arma a personaje`, {
            weaponType: weaponConfig.path,
            hasWeaponModel: !!weaponModel,
            hasCharacterMesh: !!characterMesh,
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
        
        debugLogger.debug('WeaponAttachmentManager', `Configuración de attachment`, {
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
        
        debugLogger.debug('WeaponAttachmentManager', `Modelo preparado`, {
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
                debugLogger.debug('WeaponAttachmentManager', `Mesh desplazado detectado, compensando con offset`, {
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
                
                debugLogger.debug('WeaponAttachmentManager', `Offset ajustado`, {
                    newOffset: attachmentConfig.offset
                });
            }
        }
        
        const attachResult = attachWeaponToCharacter(weaponModel, characterMesh, attachmentConfig);
        
        debugLogger.debug('WeaponAttachmentManager', `Resultado de attachWeaponToCharacter`, {
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
            debugLogger.info('WeaponAttachmentManager', `Arma "${weaponConfig.path}" adjuntada exitosamente`, {
                attachmentPoint: attachmentConfig.point
            });
        } else {
            debugLogger.error('WeaponAttachmentManager', `No se pudo adjuntar arma "${weaponConfig.path}"`, {
                attachmentPoint: attachmentConfig.point,
                hasCharacterMesh: !!characterMesh,
                characterMeshType: characterMesh?.constructor?.name,
                hasSkeleton: !!characterMesh?.skeleton
            });
        }
        
        return attachResult;
    }

    /**
     * Desequipar arma del personaje
     * @param {THREE.Object3D} weaponModel - Modelo del arma a desequipar
     * @param {THREE.Scene} scene - Escena Three.js (para remover de escena si es necesario)
     */
    unequipWeapon(weaponModel, scene) {
        if (!weaponModel) {
            return;
        }
        
        detachWeaponFromCharacter(weaponModel);
        
        // Remover de la escena si está directamente en ella
        if (scene && weaponModel.parent === scene) {
            scene.remove(weaponModel);
        }
    }
}
