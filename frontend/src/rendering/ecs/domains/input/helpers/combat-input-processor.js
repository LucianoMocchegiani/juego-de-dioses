/**
 * Helper para Procesamiento de Inputs de Combate
 * 
 * Procesa inputs relacionados con combate: defensas (parry, dodge),
 * ataques (attack, heavyAttack, chargedAttack, specialAttack) y acciones (grab).
 */
import { INPUT_MAP } from '../../../../../config/input-map-config.js';

export class CombatInputProcessor {
    constructor(inputManager, inputActionChecker) {
        this.inputManager = inputManager;
        this.inputActionChecker = inputActionChecker;
    }

    /**
     * Procesar inputs de combate y actualizar flags en InputComponent
     * @param {Object} input - InputComponent
     */
    processCombatInputs(input) {
        // Combate y Acciones
        // Importante: Orden de prioridad para evitar solapamiento de teclas

        // 1. Defensas
        this.processDefenses(input);

        // 2. Ataques Especiales / Combinados
        // Verificar antes que el ataque normal porque usan modificadores (Shift, Ctrl, Alt)
        this.processAttacks(input);

        // 3. Acciones (grab, etc.)
        this.processActions(input);
    }

    /**
     * Procesar inputs de defensas (parry, dodge)
     * @param {Object} input - InputComponent
     */
    processDefenses(input) {
        // Parry: mantener presionado
        if (this.inputActionChecker.checkAction('parry')) {
            input.wantsToParry = true;
        } else {
            input.wantsToParry = false;
        }
        
        // Dodge: solo un press (isKeyDown), no mantener presionado
        const dodgeKeys = INPUT_MAP['dodge'];
        let dodgeJustPressed = false;
        const keysDownThisFrame = typeof this.inputManager.isKeyDown === 'function'
            ? (code) => this.inputManager.isKeyDown(code)
            : (code) => Array.from(this.inputManager.getKeysDown()).includes(code);
        for (const key of dodgeKeys) {
            if (keysDownThisFrame(key)) {
                dodgeJustPressed = true;
                break;
            }
        }
        // IMPORTANTE: Resetear wantsToDodge si no se presiona en este frame
        // Esto asegura que solo se active una vez por press
        input.wantsToDodge = dodgeJustPressed;
    }

    /**
     * Procesar inputs de ataques (attack, heavyAttack, chargedAttack, specialAttack)
     * @param {Object} input - InputComponent
     */
    processAttacks(input) {
        // Resetear flags de ataque primero
        input.wantsToAttack = false;
        input.wantsToHeavyAttack = false;
        input.wantsToChargedAttack = false;
        input.wantsToSpecialAttack = false;

        // Verificar en orden de prioridad: specialAttack > chargedAttack > heavyAttack > attack
        if (this.inputActionChecker.checkAction('specialAttack')) {
            input.wantsToSpecialAttack = true;
        } else if (this.inputActionChecker.checkAction('chargedAttack')) {
            input.wantsToChargedAttack = true;
        } else if (this.inputActionChecker.checkAction('heavyAttack')) {
            input.wantsToHeavyAttack = true;
        } else if (this.inputActionChecker.checkAction('attack')) {
            // Solo si no hay ninguno de los anteriores
            input.wantsToAttack = true;
        }
    }

    /**
     * Procesar inputs de acciones (grab, etc.)
     * @param {Object} input - InputComponent
     */
    processActions(input) {
        // Agarrar
        if (this.inputActionChecker.checkAction('grab')) {
            input.wantsToGrab = true;
        } else {
            input.wantsToGrab = false;
        }
    }
}
