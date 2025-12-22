/**
 * Utilidades para adjuntar armas al personaje usando bones del esqueleto
 * 
 * El sistema requiere que el personaje tenga esqueleto (skeleton) para funcionar.
 * Las armas se adjuntan directamente a los bones del personaje, lo que permite
 * que sigan automáticamente las animaciones del personaje.
 */

import * as THREE from 'three';
import { findBone, hasSkeleton, listBones } from '../ecs/models/bones-utils.js';
import { debugLogger } from '../debug/logger.js';


/**
 * Adjuntar arma al personaje usando un bone del esqueleto
 * 
 * @param {THREE.Mesh} weaponModel - Modelo del arma a adjuntar (directamente un Mesh)
 * @param {THREE.Group} characterMesh - Mesh del personaje con esqueleto
 * @param {Object} attachmentConfig - Configuración de attachment
 * @param {string} attachmentConfig.point - Nombre del bone de attachment (ej: 'RightHand', 'LeftHand', 'Spine', etc.)
 * @param {Object} attachmentConfig.offset - Offset {x, y, z} relativo al bone (en coordenadas locales)
 * @param {Object} attachmentConfig.rotation - Rotación {x, y, z} en radianes
 * @param {number} attachmentConfig.scale - Escala del modelo
 * @returns {boolean} True si se adjuntó correctamente, False si hubo error
 */
export function attachWeaponToCharacter(weaponModel, characterMesh, attachmentConfig) {
    debugLogger.debug('WeaponAttachment', `Iniciando attachWeaponToCharacter`, {
        hasWeaponModel: !!weaponModel,
        hasCharacterMesh: !!characterMesh,
        hasAttachmentConfig: !!attachmentConfig,
        attachmentPoint: attachmentConfig?.point,
        weaponModelType: weaponModel?.constructor?.name,
        characterMeshType: characterMesh?.constructor?.name
    });
    
    if (!weaponModel || !characterMesh || !attachmentConfig) {
        debugLogger.error('WeaponAttachment', 'Parámetros inválidos', {
            weaponModel: !!weaponModel,
            characterMesh: !!characterMesh,
            attachmentConfig: !!attachmentConfig
        });
        return false;
    }
    
    // Aplicar escala al mesh
    if (attachmentConfig.scale !== undefined) {
        debugLogger.debug('WeaponAttachment', `Aplicando escala: ${attachmentConfig.scale}`, {
            scale: attachmentConfig.scale
        });
        weaponModel.scale.setScalar(attachmentConfig.scale);
    }
    
    const hasSkel = hasSkeleton(characterMesh);
    debugLogger.debug('WeaponAttachment', `Verificando esqueleto: ${hasSkel}`, {
        hasSkeleton: hasSkel
    });
    
    if (!hasSkel) {
        debugLogger.error('WeaponAttachment', 'El personaje debe tener esqueleto (skeleton) para adjuntar armas');
        return false;
    }
    
    const allBones = listBones(characterMesh);
    debugLogger.debug('WeaponAttachment', `Bones disponibles`, {
        bones: allBones.map(b => b.name),
        totalBones: allBones.length
    });
    
    const bone = findBone(characterMesh, attachmentConfig.point);
    debugLogger.debug('WeaponAttachment', `Buscando bone "${attachmentConfig.point}"`, {
        found: !!bone,
        boneName: bone?.name,
        requestedBone: attachmentConfig.point
    });
    
    if (!bone) {
        debugLogger.error('WeaponAttachment', `No se encontró el bone "${attachmentConfig.point}" en el personaje`, {
            requestedBone: attachmentConfig.point,
            availableBones: allBones.map(b => b.name)
        });
        return false;
    }
    
    // Remover el arma de su parent actual si tiene uno
    if (weaponModel.parent) {
        debugLogger.debug('WeaponAttachment', `Removiendo arma de parent anterior`, {
            parentName: weaponModel.parent.name || weaponModel.parent.type
        });
        weaponModel.parent.remove(weaponModel);
    }
    
    // Adjuntar el mesh directamente al bone
    debugLogger.debug('WeaponAttachment', `Adjuntando arma al bone "${bone.name}"`, {
        boneName: bone.name
    });
    bone.add(weaponModel);
    
    // Aplicar posición y rotación relativas al bone
    const offset = {
        x: attachmentConfig.offset?.x || 0,
        y: attachmentConfig.offset?.y || 0,
        z: attachmentConfig.offset?.z || 0
    };
    const rotation = {
        x: attachmentConfig.rotation?.x || 0,
        y: attachmentConfig.rotation?.y || 0,
        z: attachmentConfig.rotation?.z || 0
    };
    
    debugLogger.debug('WeaponAttachment', `Aplicando offset y rotación`, {
        offset: offset,
        rotation: rotation
    });
    
    weaponModel.position.set(offset.x, offset.y, offset.z);
    weaponModel.rotation.set(rotation.x, rotation.y, rotation.z);
    
    debugLogger.debug('WeaponAttachment', `Arma adjuntada exitosamente`, {
        boneName: bone.name,
        weaponModelParent: weaponModel.parent?.name || weaponModel.parent?.type,
        weaponModelPosition: {
            x: weaponModel.position.x,
            y: weaponModel.position.y,
            z: weaponModel.position.z
        },
        weaponModelRotation: {
            x: weaponModel.rotation.x,
            y: weaponModel.rotation.y,
            z: weaponModel.rotation.z
        },
        weaponModelScale: {
            x: weaponModel.scale.x,
            y: weaponModel.scale.y,
            z: weaponModel.scale.z
        }
    });
    
    return true;
}

/**
 * Desadjuntar arma del personaje
 * 
 * @param {THREE.Mesh} weaponModel - Modelo del arma a desadjuntar
 */
export function detachWeaponFromCharacter(weaponModel) {
    if (!weaponModel || !weaponModel.parent) {
        return;
    }
    
    weaponModel.parent.remove(weaponModel);
}
