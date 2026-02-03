/**
 * Sistema de Combate
 * 
 * Procesa combinaciones de input y determina tipo de ataque/defensa usando configuración centralizada.
 * Se ejecuta después de InputSystem pero antes de ComboSystem y AnimationStateSystem.
 */
import { System } from '../../../core/system.js';
import { COMBAT_ACTIONS } from '../../../../../config/combat-actions-config.js';
import { ANIMATION_STATES } from '../../../../../config/animation-config.js';
import { COMBAT_CONSTANTS } from '../../../../../config/combat-constants.js';
import { ECS_CONSTANTS } from '../../../../../config/ecs-constants.js';
import { debugLogger } from '../../../../../debug/logger.js';
import { debugEvents } from '../../../../../debug/events.js';
import { CombatAnimationStateCache } from '../helpers/combat-animation-state-cache.js';
import { CombatActionInputChecker } from '../helpers/combat-action-input-checker.js';
import { CombatActionValidator } from '../helpers/combat-action-validator.js';
import { CombatActionConfigApplier } from '../helpers/combat-action-config-applier.js';

export class CombatSystem extends System {
    constructor(inputManager) {
        super();
        this.inputManager = inputManager;
        this.requiredComponents = [
            ECS_CONSTANTS.COMPONENT_NAMES.INPUT,
            ECS_CONSTANTS.COMPONENT_NAMES.COMBAT
        ];
        this.priority = 1.4; // Después de InputSystem (0) y PhysicsSystem (1), antes de ComboSystem (1.5)
        
        // Instanciar helpers
        this.animationStateCache = new CombatAnimationStateCache(ANIMATION_STATES);
        this.actionInputChecker = new CombatActionInputChecker(COMBAT_CONSTANTS);
        this.actionValidator = new CombatActionValidator(COMBAT_CONSTANTS);
        this.actionConfigApplier = new CombatActionConfigApplier(this.animationStateCache, COMBAT_ACTIONS);
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
                // Verificar input usando helper
                const wantsAction = this.actionInputChecker.checkActionInput(input, actionConfig.inputAction);
                
                // Verificar condiciones adicionales (arma, etc.) usando helper
                const canExecute = this.actionValidator.canExecuteAction(actionConfig, weapon, weaponType);
                
                if (wantsAction && canExecute && !combat.isOnCooldown(actionId)) {
                    // Iniciar acción
                    combat.startAction(actionId);
                    this.actionConfigApplier.applyActionConfig(combat, actionConfig);
                    
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
}

