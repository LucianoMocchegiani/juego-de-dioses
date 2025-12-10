/**
 * Sistema de Combate
 * 
 * Procesa combinaciones de input y determina tipo de ataque/defensa.
 * Se ejecuta después de InputSystem pero antes de ComboSystem y AnimationStateSystem.
 */
import { System } from '../system.js';
import { INPUT_COMBINATIONS } from '../animation/config/input-combinations-config.js';

export class CombatSystem extends System {
    constructor(inputManager) {
        super();
        this.inputManager = inputManager;
        this.requiredComponents = ['Input', 'Combat'];
        this.priority = 1.4; // Después de InputSystem (0) y PhysicsSystem (1), antes de ComboSystem (1.5)
    }
    
    /**
     * Verificar si una combinación de input está activa
     * @param {Object} combination - Configuración de combinación
     * @param {Object} input - InputComponent
     * @returns {boolean}
     */
    checkCombination(combination, input) {
        const triggers = combination.triggers;
        
        for (const trigger of triggers) {
            if (trigger === 'click') {
                // Verificar click izquierdo del mouse
                if (!this.inputManager.isMouseButtonDown(0)) {
                    return false;
                }
            } else if (trigger === 'shift') {
                if (!input.isKeyPressed('ShiftLeft') && !input.isKeyPressed('ShiftRight')) {
                    return false;
                }
            } else if (trigger === 'ctrl') {
                if (!input.isKeyPressed('ControlLeft') && !input.isKeyPressed('ControlRight')) {
                    return false;
                }
            } else if (trigger === 'alt') {
                if (!input.isKeyPressed('AltLeft') && !input.isKeyPressed('AltRight')) {
                    return false;
                }
            } else if (trigger === 'keyE') {
                if (!input.isKeyPressed('KeyE')) {
                    return false;
                }
            } else if (trigger === 'keyF') {
                if (!input.isKeyPressed('KeyF')) {
                    return false;
                }
            } else if (trigger === 'keyQ') {
                if (!input.isKeyPressed('KeyQ')) {
                    return false;
                }
            }
        }
        return true;
    }
    
    /**
     * Verificar condiciones de una combinación
     * @param {Object} combination - Configuración de combinación
     * @param {Object} context - Contexto (input, weapon, etc.)
     * @returns {boolean}
     */
    checkConditions(combination, context) {
        const { conditions } = combination;
        if (!conditions) return true;
        
        // Verificar weaponType
        if (conditions.weaponType) {
            const weaponType = context.weapon ? context.weapon.weaponType : 'generic';
            if (!conditions.weaponType.includes(weaponType)) {
                return false;
            }
        }
        
        // Verificar hasMovement
        if (conditions.hasMovement !== undefined) {
            const hasMovement = context.input.moveDirection.x !== 0 || context.input.moveDirection.y !== 0;
            if (conditions.hasMovement !== hasMovement) {
                return false;
            }
        }
        
        // Verificar requiresWeapon
        if (combination.requiresWeapon && !context.weapon) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Actualizar sistema de combate
     * @param {number} deltaTime - Tiempo transcurrido
     */
    update(_deltaTime) {
        const entities = this.getEntities();
        
        for (const entityId of entities) {
            const input = this.ecs.getComponent(entityId, 'Input');
            const combat = this.ecs.getComponent(entityId, 'Combat');
            
            if (!input || !combat) continue;
            
            // Obtener tipo de arma (si existe el componente Weapon)
            let weapon = null;
            if (this.ecs.hasComponent(entityId, 'Weapon')) {
                weapon = this.ecs.getComponent(entityId, 'Weapon');
            }
            
            const context = { input, weapon };
            
            // Resetear estado de combate antes de verificar nuevas combinaciones
            // (solo si no hay un combo activo, para evitar conflictos)
            const combo = this.ecs.getComponent(entityId, 'Combo');
            if (!combo || !combo.activeComboId) {
                // Si no hay combo activo, resetear combate para verificar nuevas combinaciones
                combat.reset();
            }
            
            // Verificar cada combinación de input
            for (const combination of INPUT_COMBINATIONS) {
                if (this.checkCombination(combination, input) && this.checkConditions(combination, context)) {
                    // Combinación detectada
                    combat.combatAnimation = combination.animation;
                    
                    if (combination.attackType) {
                        combat.isAttacking = true;
                        combat.attackType = combination.attackType;
                        combat.defenseType = null;
                        combat.canCancel = combination.cancelable !== undefined ? combination.cancelable : false;
                    } else if (combination.defenseType) {
                        combat.defenseType = combination.defenseType;
                        combat.isAttacking = false;
                        combat.attackType = null;
                        combat.canCancel = combination.cancelable !== undefined ? combination.cancelable : true;
                    } else if (combination.actionType) {
                        // Acciones especiales como grab
                        combat.isAttacking = false;
                        combat.attackType = null;
                        combat.defenseType = null;
                        combat.canCancel = true;
                    }
                    
                    // Salir del loop después de encontrar la primera combinación válida
                    break;
                }
            }
        }
    }
}

