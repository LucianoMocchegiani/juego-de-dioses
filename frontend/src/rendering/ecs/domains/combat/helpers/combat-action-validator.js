/**
 * Helper para Validación de Condiciones de Ejecución
 * 
 * Verifica si una acción puede ejecutarse (arma requerida, tipo de arma, etc.).
 */
import { COMBAT_CONSTANTS } from '../../../../../config/combat-constants.js';

export class CombatActionValidator {
    constructor(combatConstants = COMBAT_CONSTANTS) {
        this.combatConstants = combatConstants;
    }

    /**
     * Verificar si se puede ejecutar una acción (condiciones como tipo de arma requerida)
     * @param {Object} actionConfig - Configuración de la acción
     * @param {Object|null} weapon - WeaponComponent o null
     * @param {string} weaponType - Tipo de arma ('sword', 'axe', 'generic', etc.)
     * @returns {boolean} True si se puede ejecutar la acción
     */
    canExecuteAction(actionConfig, weapon, weaponType) {
        if (!actionConfig) {
            return false;
        }

        // Por ahora, solo verificamos parry que requiere arma
        if (actionConfig.id === this.combatConstants.ACTION_IDS.PARRY && !weapon) {
            return false;
        }
        
        // Verificaciones específicas por acción (pueden extenderse en el futuro)
        if (actionConfig.id === this.combatConstants.ACTION_IDS.SPECIAL_ATTACK && 
            weaponType !== this.combatConstants.WEAPON_TYPES.SWORD) {
            // Special attack solo funciona con espada
            return false;
        }
        
        return true;
    }
}
