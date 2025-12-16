/**
 * Utilidades para adjuntar armas al personaje usando bones del esqueleto
 * 
 * El sistema requiere que el personaje tenga esqueleto (skeleton) para funcionar.
 * Las armas se adjuntan directamente a los bones del personaje, lo que permite
 * que sigan automáticamente las animaciones del personaje.
 */

import * as THREE from 'three';
import { findBone, hasSkeleton, listBones } from '../renderers/models/bones-utils.js';
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
    if (!weaponModel || !characterMesh || !attachmentConfig) {
        debugLogger.error('WeaponAttachment', 'Parámetros inválidos');
        return false;
    }
    
    // Aplicar escala al mesh
    if (attachmentConfig.scale !== undefined) {
        weaponModel.scale.setScalar(attachmentConfig.scale);
    }
    
    if (!hasSkeleton(characterMesh)) {
        debugLogger.error('WeaponAttachment', 'El personaje debe tener esqueleto (skeleton) para adjuntar armas');
        return false;
    }
    
    const bone = findBone(characterMesh, attachmentConfig.point);
    if (!bone) {
        const allBones = listBones(characterMesh);
        debugLogger.error('WeaponAttachment', `No se encontró el bone "${attachmentConfig.point}" en el personaje`, {
            requestedBone: attachmentConfig.point,
            availableBones: allBones.map(b => b.name)
        });
        return false;
    }
    
    // Remover el arma de su parent actual si tiene uno
    if (weaponModel.parent) {
        weaponModel.parent.remove(weaponModel);
    }
    
    // Adjuntar el mesh directamente al bone
    bone.add(weaponModel);
    
    // Aplicar posición y rotación relativas al bone
    weaponModel.position.set(
        attachmentConfig.offset?.x || 0,
        attachmentConfig.offset?.y || 0,
        attachmentConfig.offset?.z || 0
    );
    
    weaponModel.rotation.set(
        attachmentConfig.rotation?.x || 0,
        attachmentConfig.rotation?.y || 0,
        attachmentConfig.rotation?.z || 0
    );
    
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
