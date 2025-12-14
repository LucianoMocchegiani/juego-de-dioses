/**
 * Sistema de Combate
 * 
 * Procesa combinaciones de input y determina tipo de ataque/defensa usando configuración centralizada.
 * Se ejecuta después de InputSystem pero antes de ComboSystem y AnimationStateSystem.
 */
import { System } from '../system.js';
import { COMBAT_ACTIONS } from '../../config/combat-actions-config.js';
import { ANIMATION_STATES } from '../../config/animation-config.js';
import { COMBAT_CONSTANTS } from '../../config/combat-constants.js';
import { ECS_CONSTANTS } from '../../config/ecs-constants.js';
import { debugLogger } from '../../debug/logger.js';
import { stateValidator } from '../../debug/validator.js';
import { debugEvents } from '../../debug/events.js';

export class CombatSystem extends System {
    constructor(inputManager) {
        super();
        this.inputManager = inputManager;
        this.requiredComponents = [
            ECS_CONSTANTS.COMPONENT_NAMES.INPUT,
            ECS_CONSTANTS.COMPONENT_NAMES.COMBAT
        ];
        this.priority = 1.4; // Después de InputSystem (0) y PhysicsSystem (1), antes de ComboSystem (1.5)
        
        // Cachear mapeo de animationStateId → AnimationState (O(1) lookup)
        this.animationStateCache = new Map();
        for (const state of ANIMATION_STATES) {
            this.animationStateCache.set(state.id, state);
        }
    }

    /**
     * Actualizar sistema de combate
     * @param {number} deltaTime - Tiempo transcurrido
     */
    update(deltaTime) {
        const entities = this.getEntities();

        for (const entityId of entities) {
            const input = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.INPUT);
            const combat = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.COMBAT);

            if (!input || !combat) continue;

            // Verificar si hay combo activo (prioridad sobre acciones individuales)
            const combo = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.COMBO);
            if (combo && combo.activeComboId) {
                continue; // ComboSystem maneja esto
            }

            // Actualizar cooldowns
            combat.updateCooldowns(deltaTime);

            // Si hay una acción activa, NO procesar nuevos inputs (incluyendo parry)
            // Parry solo puede reactivarse cuando activeAction es null (animación terminó)
            // Esto previene que parry se reactive en cada frame mientras la animación está en progreso
            if (combat.activeAction) {
                continue;
            }

            // Si no hay acción activa, procesar nuevos inputs
            // Parry puede reactivarse aquí si wantsToParry es true y no hay cooldown
            combat.reset(); // Esto solo resetea si no hay activeAction (siempre true aquí)

            // Obtener tipo de arma (si existe el componente Weapon)
            let weapon = null;
            let weaponType = COMBAT_CONSTANTS.WEAPON_TYPES.GENERIC;
            if (this.ecs.hasComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.WEAPON)) {
                weapon = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.WEAPON);
                weaponType = weapon.weaponType;
            }

            // Procesar acciones según configuración (en orden de prioridad)
            for (const [actionId, actionConfig] of Object.entries(COMBAT_ACTIONS)) {
                // Verificar input usando checkActionInput con el inputAction configurado
                const wantsAction = this.checkActionInput(input, actionConfig.inputAction);
                
                // Verificar condiciones adicionales (arma, etc.)
                const canExecute = this.canExecuteAction(entityId, actionConfig, weapon, weaponType);
                
                if (wantsAction && canExecute && !combat.isOnCooldown(actionId)) {
                    // Iniciar acción
                    combat.startAction(actionId);
                    this.applyActionConfig(combat, actionConfig);
                    
                    // Aplicar cooldown
                    combat.actionCooldowns.set(actionId, actionConfig.cooldown);
                    
                    debugLogger.info('CombatSystem', 'Action started', {
                        entityId,
                        actionId,
                        cooldown: actionConfig.cooldown
                    });
                    
                    // Emitir evento
                    debugEvents.emit('combat:action:started', {
                        entityId,
                        actionId,
                        actionConfig: {
                            id: actionConfig.id,
                            animationStateId: actionConfig.animationStateId
                        }
                    });
                    
                    // IMPORTANTE: Resetear wantsToDodge después de procesarlo para evitar reactivación
                    // Dodge solo se activa una vez por press
                    if (actionId === COMBAT_CONSTANTS.ACTION_IDS.DODGE) {
                        input.wantsToDodge = false;
                    }
                    
                    return; // Una acción por frame
                }
            }
            // Nota: Attack ahora está procesado dentro del loop de COMBAT_ACTIONS arriba
        }
    }
    
    /**
     * Verificar si el input corresponde a la acción
     * @param {Object} input - InputComponent
     * @param {string} inputAction - Nombre de la acción de input (de INPUT_MAP, ej: 'attack', 'dodge', 'parry')
     * @returns {boolean}
     */
    checkActionInput(input, inputAction) {
        switch (inputAction) {
            case COMBAT_CONSTANTS.ACTION_IDS.DODGE:
                return input.wantsToDodge;
            case COMBAT_CONSTANTS.ACTION_IDS.SPECIAL_ATTACK:
                return input.wantsToSpecialAttack;
            case COMBAT_CONSTANTS.ACTION_IDS.PARRY:
                return input.wantsToParry;
            case COMBAT_CONSTANTS.ACTION_IDS.HEAVY_ATTACK:
                return input.wantsToHeavyAttack;
            case COMBAT_CONSTANTS.ACTION_IDS.CHARGED_ATTACK:
                return input.wantsToChargedAttack;
            case COMBAT_CONSTANTS.ACTION_IDS.ATTACK:
                return input.wantsToAttack;
            default:
                return false;
        }
    }
    
    /**
     * Verificar si se puede ejecutar una acción (condiciones como tipo de arma requerida)
     * @param {string} entityId - ID de la entidad
     * @param {Object} actionConfig - Configuración de la acción
     * @param {Object|null} weapon - WeaponComponent o null
     * @param {string} weaponType - Tipo de arma ('sword', 'axe', 'generic', etc.)
     * @returns {boolean}
     */
    canExecuteAction(entityId, actionConfig, weapon, weaponType) {
        // Por ahora, solo verificamos parry que requiere arma
        if (actionConfig.id === COMBAT_CONSTANTS.ACTION_IDS.PARRY && !weapon) {
            return false;
        }
        
        // Verificaciones específicas por acción (pueden extenderse en el futuro)
        if (actionConfig.id === COMBAT_CONSTANTS.ACTION_IDS.SPECIAL_ATTACK && 
            weaponType !== COMBAT_CONSTANTS.WEAPON_TYPES.SWORD) {
            // Special attack solo funciona con espada
            return false;
        }
        
        return true;
    }
    
    /**
     * Aplicar configuración de acción al componente de combate
     * @param {Object} combat - CombatComponent
     * @param {Object} actionConfig - Configuración de la acción desde COMBAT_ACTIONS
     */
    applyActionConfig(combat, actionConfig) {
        // Validar que la acción existe
        if (!stateValidator.validateCombatAction(
            actionConfig.id,
            COMBAT_ACTIONS,
            `CombatSystem.applyActionConfig(${actionConfig.id})`
        )) {
            return;
        }
        
        // Buscar estado de animación correspondiente (O(1) lookup usando cache)
        const animationState = this.animationStateCache.get(actionConfig.animationStateId);
        if (!animationState) {
            debugLogger.warn('CombatSystem', 'Animation state not found for action', {
                actionId: actionConfig.id,
                animationStateId: actionConfig.animationStateId,
                availableStates: Array.from(this.animationStateCache.keys())
            });
            return;
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
        
        debugLogger.info('CombatSystem', 'Action config applied', {
            actionId: actionConfig.id,
            animationStateId: actionConfig.animationStateId,
            attackType: actionConfig.attackType,
            defenseType: actionConfig.defenseType
        });
    }
}

