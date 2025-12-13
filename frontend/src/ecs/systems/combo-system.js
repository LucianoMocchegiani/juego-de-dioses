/**
 * Sistema de Combos
 * 
 * Gestiona detección y ejecución de combos basados en inputs del usuario.
 * Se ejecuta antes de AnimationStateSystem para procesar combos y actualizar el estado de animación.
 */
import { System } from '../system.js';
import { ComboManager } from '../animation/combos/combo-manager.js';
import { COMBO_CHAINS } from '../../config/combo-config.js';

export class ComboSystem extends System {
    constructor(inputManager) {
        super();
        this.inputManager = inputManager;
        this.requiredComponents = ['Input', 'Combo'];
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
            const input = this.ecs.getComponent(entityId, 'Input');
            const combo = this.ecs.getComponent(entityId, 'Combo');

            if (!input || !combo) continue;

            // Obtener tipo de arma (si existe el componente Weapon)
            let weaponType = null;
            if (this.ecs.hasComponent(entityId, 'Weapon')) {
                const weapon = this.ecs.getComponent(entityId, 'Weapon');
                weaponType = weapon ? weapon.weaponType : null;
            }

            // Obtener ComboManager para esta entidad
            const comboManager = this.getComboManager(entityId);

            // Determinar tipo de input basado en las intenciones del InputComponent
            // Esto asegura consistencia con el InputSystem
            let inputType = null;

            if (input.wantsToHeavyAttack) {
                inputType = 'heavyAttack';
            } else if (input.wantsToChargedAttack) {
                inputType = 'chargedAttack';
            } else if (input.wantsToSpecialAttack) {
                inputType = 'specialAttack';
            } else if (input.wantsToAttack) {
                inputType = 'attack';
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
                    if (currentStep && timeSinceLastInput > currentStep.timing * 1.5) {
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

