/**
 * Helper para Aplicación de Configuración de Acción
 * 
 * Aplica la configuración de acción al CombatComponent, incluyendo mapeo de animation states.
 */
import { stateValidator } from '../../../debug/validator.js';
import { debugLogger } from '../../../debug/logger.js';
import { COMBAT_ACTIONS } from '../../../config/combat-actions-config.js';

export class CombatActionConfigApplier {
    constructor(animationStateCache, combatActions = COMBAT_ACTIONS) {
        this.animationStateCache = animationStateCache;
        this.combatActions = combatActions;
    }

    /**
     * Aplicar configuración de acción al componente de combate
     * @param {Object} combat - CombatComponent (se modifica)
     * @param {Object} actionConfig - Configuración de la acción desde COMBAT_ACTIONS
     * @returns {boolean} True si la configuración se aplicó correctamente
     */
    applyActionConfig(combat, actionConfig) {
        if (!combat || !actionConfig) {
            return false;
        }

        // Validar que la acción existe
        if (!stateValidator.validateCombatAction(
            actionConfig.id,
            this.combatActions,
            `CombatActionConfigApplier.applyActionConfig(${actionConfig.id})`
        )) {
            return false;
        }
        
        // Buscar estado de animación correspondiente (O(1) lookup usando cache)
        const animationState = this.animationStateCache.getAnimationState(actionConfig.animationStateId);
        if (!animationState) {
            debugLogger.warn('CombatActionConfigApplier', 'Animation state not found for action', {
                actionId: actionConfig.id,
                animationStateId: actionConfig.animationStateId,
                availableStates: this.animationStateCache.getAvailableStateIds()
            });
            return false;
        }
        
        // Setear tipo de ataque/defensa (solo de combat config, no de animation)
        if (actionConfig.defenseType) {
            combat.defenseType = actionConfig.defenseType;
        }
        if (actionConfig.attackType) {
            combat.attackType = actionConfig.attackType;
        }
        
        // Setear animación desde animation state
        combat.combatAnimation = animationState.animation;
        
        // Setear flags de protección desde animation state
        // (preventInterruption ya está en animation state, se maneja automáticamente)
        combat.isAttacking = actionConfig.attackType !== null;
        
        debugLogger.info('CombatActionConfigApplier', 'Action config applied', {
            actionId: actionConfig.id,
            animationStateId: actionConfig.animationStateId,
            attackType: actionConfig.attackType,
            defenseType: actionConfig.defenseType
        });

        return true;
    }
}
