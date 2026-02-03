/**
 * Sistema de Combos
 * 
 * Gestiona detección y ejecución de combos basados en inputs del usuario.
 * Se ejecuta antes de AnimationStateSystem para procesar combos y actualizar el estado de animación.
 */
import { System } from '../../../core/system.js';
import { ComboManager } from '../combos/combo-manager.js';
import { COMBO_CHAINS } from '../../../../../config/combo-config.js';
import { ECS_CONSTANTS } from '../../../../../config/ecs-constants.js';
import { COMBAT_CONSTANTS } from '../../../../../config/combat-constants.js';
import { ANIMATION_CONSTANTS } from '../../../../../config/animation-constants.js';

export class ComboSystem extends System {
    constructor(inputManager) {
        super();
        this.inputManager = inputManager;
        this.requiredComponents = [
            ECS_CONSTANTS.COMPONENT_NAMES.INPUT,
            ECS_CONSTANTS.COMPONENT_NAMES.COMBO
        ];
        this.priority = 1.5; // Después de InputSystem (0) y PhysicsSystem (1), antes de AnimationStateSystem (2)

        /**
         * Mapa de entityId -> ComboManager
         * Cada entidad tiene su propio ComboManager
         * @type {Map<number, ComboManager>}
         */
        this.comboManagers = new Map();
    }

    /**
     * Obtener o crear ComboManager para una entidad
     * @param {number} entityId - ID de la entidad
     * @returns {ComboManager}
     */
    getComboManager(entityId) {
        if (!this.comboManagers.has(entityId)) {
            const manager = new ComboManager(COMBO_CHAINS);
            this.comboManagers.set(entityId, manager);
        }
        return this.comboManagers.get(entityId);
    }

    /**
     * Actualizar sistema de combos
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame
     */
    update(_deltaTime) {
        const entities = this.getEntities();
        const currentTime = performance.now();

        for (const entityId of entities) {
            const input = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.INPUT);
            const combo = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.COMBO);

            if (!input || !combo) continue;

            // Obtener tipo de arma (si existe el componente Weapon)
            let weaponType = null;
            if (this.ecs.hasComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.WEAPON)) {
                const weapon = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.WEAPON);
                weaponType = weapon ? weapon.weaponType : null;
            }

            // Obtener ComboManager para esta entidad
            const comboManager = this.getComboManager(entityId);

            // Determinar tipo de input basado en las intenciones del InputComponent
            // Esto asegura consistencia con el InputSystem
            let inputType = null;

            if (input.wantsToHeavyAttack) {
                inputType = COMBAT_CONSTANTS.ACTION_IDS.HEAVY_ATTACK;
            } else if (input.wantsToChargedAttack) {
                inputType = COMBAT_CONSTANTS.ACTION_IDS.CHARGED_ATTACK;
            } else if (input.wantsToSpecialAttack) {
                inputType = COMBAT_CONSTANTS.ACTION_IDS.SPECIAL_ATTACK;
            } else if (input.wantsToAttack) {
                inputType = COMBAT_CONSTANTS.ACTION_IDS.ATTACK;
            }

            // Procesar input en el ComboManager solo si hay un input nuevo
            if (inputType) {
                const comboResult = comboManager.processInput(inputType, currentTime, weaponType);

                if (comboResult) {
                    // Actualizar ComboComponent con resultado
                    combo.activeComboId = comboResult.comboId;
                    combo.comboStep = comboResult.step;
                    combo.comboAnimation = comboResult.animation;
                    combo.comboComplete = comboResult.isComplete;
                    combo.lastComboInputTime = currentTime;
                } else if (combo.activeComboId) {
                    // Si había un combo activo pero no se procesó correctamente, resetear
                    combo.reset();
                    comboManager.resetCombo();
                }
            } else if (combo.activeComboId) {
                // Si no hay input pero hay un combo activo, verificar si expiró por tiempo
                const timeSinceLastInput = currentTime - combo.lastComboInputTime;
                const comboConfig = COMBO_CHAINS.find(c => c.id === combo.activeComboId);

                if (comboConfig && combo.comboStep < comboConfig.steps.length) {
                    const currentStep = comboConfig.steps[combo.comboStep];
                    if (currentStep && timeSinceLastInput > currentStep.timing * ANIMATION_CONSTANTS.COMBO.TIMING_MULTIPLIER) {
                        // Combo expirado (timing window excedido), resetear
                        combo.reset();
                        comboManager.resetCombo();
                    }
                } else if (combo.comboComplete) {
                    // Combo completado, resetear después de un tiempo si es necesario
                    // (por ahora, mantenemos el estado hasta que se resetee manualmente o se inicie otro combo)
                }
            }
        }
    }
}

