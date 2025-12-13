/**
 * Sistema de Combate
 * 
 * Procesa combinaciones de input y determina tipo de ataque/defensa.
 * Se ejecuta después de InputSystem pero antes de ComboSystem y AnimationStateSystem.
 */
import { System } from '../system.js';


export class CombatSystem extends System {
    constructor(inputManager) {
        super();
        this.inputManager = inputManager;
        this.requiredComponents = ['Input', 'Combat'];
        this.priority = 1.4; // Después de InputSystem (0) y PhysicsSystem (1), antes de ComboSystem (1.5)
    }

    /**
     * Actualizar sistema de combate
     * @param {number} _deltaTime - Tiempo transcurrido
     */
    update(_deltaTime) {
        const entities = this.getEntities();

        for (const entityId of entities) {
            const input = this.ecs.getComponent(entityId, 'Input');
            const combat = this.ecs.getComponent(entityId, 'Combat');

            if (!input || !combat) continue;

            // Obtener tipo de arma (si existe el componente Weapon)
            let weapon = null;
            let weaponType = 'generic';
            if (this.ecs.hasComponent(entityId, 'Weapon')) {
                weapon = this.ecs.getComponent(entityId, 'Weapon');
                weaponType = weapon.weaponType;
            }

            // Resetear estado de combate antes de verificar nuevas combinaciones
            // (solo si no hay un combo activo, para evitar conflictos)
            const combo = this.ecs.getComponent(entityId, 'Combo');
            if (combo && combo.activeComboId) {
                continue; // Si hay combo activo, no procesar inputs de combate aquí (ComboSystem lo hará)
            }

            // Si no hay combo, resetear para frame actual
            combat.reset();

            // Mapear intenciones de input a acciones de combate
            // Esta lógica reemplaza a INPUT_COMBINATIONS y checkCombination

            // 1. Parry (Defensa)
            if (input.wantsToParry && weapon) {
                combat.combatAnimation = 'sword_parry_backward';
                combat.defenseType = 'parry';
                combat.isAttacking = false;
                combat.canCancel = true;
                return; // Prioridad alta
            }

            // 2. Dodge (Defensa) - Puede usarse con o sin movimiento
            if (input.wantsToDodge) {
                combat.combatAnimation = 'roll_dodge';
                combat.defenseType = 'dodge';
                combat.isAttacking = false;
                combat.canCancel = true;
                return; // Prioridad alta
            }

            // 3. Special Attack (Ataque Especial) - Espada
            if (input.wantsToSpecialAttack) {
                if (weaponType === 'sword') {
                    combat.combatAnimation = 'sword_judgment';
                    combat.attackType = 'special';
                    combat.isAttacking = true;
                    combat.canCancel = false;
                    return;
                } else {
                    // Fallback: Si no tiene espada, tratar como intento de ataque normal (o fallido)
                    // Por ahora, permitimos que caiga al bloque de ataque normal abajo
                    // Para eso NO hacemos return aquí si falla la condición de arma.
                }
            }

            // 4. Charged Attack (Ataque Cargado) - Hacha o Generico
            if (input.wantsToChargedAttack && (weaponType === 'axe' || weaponType === 'generic')) {
                combat.combatAnimation = 'charged_axe_chop';
                combat.attackType = 'charged';
                combat.isAttacking = true;
                combat.canCancel = false;
                return;
            }

            // 5. Heavy Attack (Ataque Pesado) - Martillo, Hacha o Generico
            if (input.wantsToHeavyAttack && (weaponType === 'hammer' || weaponType === 'axe' || weaponType === 'generic')) {
                combat.combatAnimation = 'heavy_hammer_swing';
                combat.attackType = 'heavy';
                combat.isAttacking = true;
                combat.canCancel = false;
                return;
            }

            // 6. Grab (Interacción)
            if (input.wantsToGrab) {
                combat.combatAnimation = 'collect_object';
                // Grab no es ataque ni defensa, es acción especial
                combat.isAttacking = false;
                combat.canCancel = true;
                return;
            }

            // 7. Ataque Normal
            // Si el sistema de Combos no lo atrapó (o si queremos redundancia),
            // configuramos el ataque básico aquí.
            if (input.wantsToAttack) {
                combat.combatAnimation = 'attack';
                combat.attackType = 'light';
                combat.isAttacking = true;
                combat.canCancel = false; // Generalmente no cancelable al inicio
                // No retornamos aquí para permitir que lógica posterior (si la hubiera) se ejecute,
                // aunque es el último paso.
            }
        }
    }
}

