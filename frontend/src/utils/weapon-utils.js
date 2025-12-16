/**
 * Utilidades para equipar/desequipar armas
 * 
 * Funciones helper para facilitar el equipamiento/desequipamiento de armas
 * durante el desarrollo y testing. Pueden ser llamadas desde la consola del navegador.
 * 
 * @example
 * // Equipar espada al jugador
 * equipWeapon(app.ecs, app.playerId, 'sword');
 * 
 * // Equipar hacha
 * equipWeapon(app.ecs, app.playerId, 'axe');
 * 
 * // Desequipar arma
 * equipWeapon(app.ecs, app.playerId, null);
 * 
 * // Obtener arma equipada
 * const weaponType = getEquippedWeapon(app.ecs, app.playerId);
 */
import { ECS_CONSTANTS } from '../config/ecs-constants.js';
import { WeaponComponent } from '../ecs/components/weapon.js';
import { WEAPON_MODELS } from '../config/weapon-models-config.js';
import { detachWeaponFromCharacter } from './weapon-attachment.js';
import { debugLogger } from '../debug/logger.js';

/**
 * Equipar arma a una entidad
 * 
 * Actualiza o crea el WeaponComponent de la entidad con el tipo de arma especificado.
 * El WeaponEquipSystem se encargará automáticamente de cargar y visualizar el arma.
 * 
 * @param {ECSManager} ecs - ECS Manager
 * @param {number} entityId - ID de la entidad
 * @param {string|null} weaponType - Tipo de arma ('sword', 'axe', 'hammer', etc.) o null para desequipar
 * @returns {boolean} True si se equipó/desequipó correctamente, False si hubo error
 * 
 * @example
 * // Equipar espada
 * equipWeapon(ecs, playerId, 'sword');
 * 
 * // Equipar hacha
 * equipWeapon(ecs, playerId, 'axe');
 * 
 * // Desequipar arma
 * equipWeapon(ecs, playerId, null);
 */
export function equipWeapon(ecs, entityId, weaponType) {
    if (!ecs || entityId === undefined || entityId === null) {
        debugLogger.error('WeaponUtils', 'equipWeapon: ecs y entityId son requeridos');
        return false;
    }
    
    // Verificar que el tipo de arma existe
    if (weaponType && !WEAPON_MODELS[weaponType]) {
        debugLogger.error('WeaponUtils', `Tipo de arma "${weaponType}" no existe`, {
            tipoSolicitado: weaponType,
            tiposDisponibles: Object.keys(WEAPON_MODELS)
        });
        return false;
    }
    
    // Obtener o crear WeaponComponent
    let weapon = ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.WEAPON);
    
    if (weaponType) {
        // Equipar arma
        const weaponConfig = WEAPON_MODELS[weaponType];
        
        if (!weapon) {
            // Crear nuevo componente
            weapon = new WeaponComponent({
                weaponType: weaponType,
                modelPath: weaponConfig.path,
                attachmentPoint: weaponConfig.attachmentPoint,
                offset: weaponConfig.offset,
                rotation: weaponConfig.rotation,
                scale: weaponConfig.scale
            });
            ecs.addComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.WEAPON, weapon);
            debugLogger.info('WeaponUtils', `Arma "${weaponType}" agregada a entidad ${entityId}`);
        } else {
            // Actualizar componente existente
            // Primero remover el modelo anterior si existe
            if (weapon.modelInstance) {
                detachWeaponFromCharacter(weapon.modelInstance);
            }
            
            // Actualizar weaponType, el WeaponEquipSystem se encargará de cargar el nuevo modelo
            weapon.weaponType = weaponType;
            // Limpiar referencias del modelo anterior para forzar recarga
            weapon.modelPath = null;
            weapon.modelInstance = null;
            debugLogger.info('WeaponUtils', `Arma actualizada a "${weaponType}" para entidad ${entityId}`);
        }
        return true;
    } else {
        // Desequipar arma (establecer tipo genérico que no tiene modelo)
        if (weapon) {
            // Remover el modelo anterior si existe
            if (weapon.modelInstance) {
                detachWeaponFromCharacter(weapon.modelInstance);
            }
            
            weapon.weaponType = 'generic';
            weapon.modelPath = null;
            weapon.modelInstance = null;
            debugLogger.info('WeaponUtils', `Arma desequipada de entidad ${entityId}`);
            return true;
        } else {
            debugLogger.warn('WeaponUtils', `Entidad ${entityId} no tiene WeaponComponent para desequipar`);
            return false;
        }
    }
}

/**
 * Obtener tipo de arma equipada en una entidad
 * 
 * @param {ECSManager} ecs - ECS Manager
 * @param {number} entityId - ID de la entidad
 * @returns {string|null} Tipo de arma equipada o null si no tiene WeaponComponent o es 'generic'
 * 
 * @example
 * const weaponType = getEquippedWeapon(ecs, playerId);
 * if (weaponType) {
 *     console.log(`Arma equipada: ${weaponType}`);
 * } else {
 *     console.log('No hay arma equipada');
 * }
 */
export function getEquippedWeapon(ecs, entityId) {
    if (!ecs || entityId === undefined || entityId === null) {
        debugLogger.error('WeaponUtils', 'getEquippedWeapon: ecs y entityId son requeridos');
        return null;
    }
    
    const weapon = ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.WEAPON);
    if (!weapon) {
        return null;
    }
    
    // Retornar null si es 'generic' (no tiene modelo visual)
    return weapon.weaponType === 'generic' ? null : weapon.weaponType;
}

/**
 * Listar todos los tipos de armas disponibles
 * 
 * @returns {string[]} Array con los nombres de todos los tipos de armas disponibles
 * 
 * @example
 * const weapons = listAvailableWeapons();
 * console.log('Armas disponibles:', weapons);
 * // ['sword', 'axe', 'hammer', 'two-handed-axe', ...]
 */
export function listAvailableWeapons() {
    return Object.keys(WEAPON_MODELS);
}
