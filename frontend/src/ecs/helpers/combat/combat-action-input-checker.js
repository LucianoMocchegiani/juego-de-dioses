/**
 * Helper para Verificación de Input de Acción
 * 
 * Verifica si el InputComponent tiene el input necesario para una acción específica.
 */
import { COMBAT_CONSTANTS } from '../../../config/combat-constants.js';

export class CombatActionInputChecker {
    constructor(combatConstants = COMBAT_CONSTANTS) {
        this.combatConstants = combatConstants;
    }

    /**
     * Verificar si el input corresponde a la acción
     * @param {Object} input - InputComponent
     * @param {string} inputAction - Nombre de la acción de input (de ACTION_IDS, ej: 'attack', 'dodge', 'parry')
     * @returns {boolean} True si el input corresponde a la acción
     */
    checkActionInput(input, inputAction) {
        if (!input || !inputAction) {
            return false;
        }

        switch (inputAction) {
            case this.combatConstants.ACTION_IDS.DODGE:
                return input.wantsToDodge;
            case this.combatConstants.ACTION_IDS.SPECIAL_ATTACK:
                return input.wantsToSpecialAttack;
            case this.combatConstants.ACTION_IDS.PARRY:
                return input.wantsToParry;
            case this.combatConstants.ACTION_IDS.HEAVY_ATTACK:
                return input.wantsToHeavyAttack;
            case this.combatConstants.ACTION_IDS.CHARGED_ATTACK:
                return input.wantsToChargedAttack;
            case this.combatConstants.ACTION_IDS.ATTACK:
                return input.wantsToAttack;
            default:
                return false;
        }
    }
}
