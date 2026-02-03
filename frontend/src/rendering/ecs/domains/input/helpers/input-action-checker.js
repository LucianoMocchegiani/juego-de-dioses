/**
 * Helper para Verificación de Acciones de Input
 * 
 * Verifica si una acción está activa basada en el mapa de input, manejando
 * combinaciones de teclas, clicks de mouse y mapeo de acciones.
 */
import { INPUT_MAP } from '../../../../../config/input-map-config.js';
import { ANIMATION_CONSTANTS } from '../../../../../config/animation-constants.js';

export class InputActionChecker {
    constructor(inputManager, animationConstants = ANIMATION_CONSTANTS) {
        this.inputManager = inputManager;
        this.animationConstants = animationConstants;
    }

    /**
     * Verificar si una acción está activa basada en el mapa de input
     * @param {string} actionName - Nombre de la acción en INPUT_MAP
     * @param {Object} input - Componente de input (opcional, para verificar teclas ya procesadas)
     * @returns {boolean}
     */
    checkAction(actionName, input) {
        const mappings = INPUT_MAP[actionName];
        if (!mappings) return false;

        for (const mapping of mappings) {
            // Verificar combinaciones (ej: "Control+ClickLeft")
            if (mapping.includes('+')) {
                const keys = mapping.split('+');
                let allPressed = true;

                for (const key of keys) {
                    if (key === 'ClickLeft') {
                        if (!this.inputManager.isMouseButtonDown(this.animationConstants.INPUT.MOUSE_BUTTONS.LEFT)) allPressed = false;
                    } else if (key === 'ClickRight') {
                        if (!this.inputManager.isMouseButtonDown(this.animationConstants.INPUT.MOUSE_BUTTONS.RIGHT)) allPressed = false;
                    } else if (key === 'Control') {
                        const isCtrl = this.inputManager.isKeyPressed('ControlLeft') || this.inputManager.isKeyPressed('ControlRight');
                        if (actionName === 'specialAttack' && !isCtrl) {
                            // console.log('DEBUG: Control check FAILED. Keys:', Array.from(this.inputManager.keysPressed));
                        }
                        if (!isCtrl) {
                            allPressed = false;
                        } else if (actionName === 'specialAttack') {
                            // console.log('DEBUG: Control check PASSED');
                        }
                    } else if (key === 'Shift') {
                        if (!this.inputManager.isKeyPressed('ShiftLeft') && !this.inputManager.isKeyPressed('ShiftRight')) allPressed = false;
                    } else if (key === 'Alt') {
                        if (!this.inputManager.isKeyPressed('AltLeft') && !this.inputManager.isKeyPressed('AltRight')) allPressed = false;
                    } else {
                        // Tecla normal
                        if (!this.inputManager.isKeyPressed(key)) allPressed = false;
                    }
                }

                if (allPressed) {
                    return true;
                }
            }
            // Verificar clicks simples
            else if (mapping === 'ClickLeft') {
                if (this.inputManager.isMouseButtonDown(this.animationConstants.INPUT.MOUSE_BUTTONS.LEFT)) return true;
            } else if (mapping === 'ClickRight') {
                if (this.inputManager.isMouseButtonDown(this.animationConstants.INPUT.MOUSE_BUTTONS.RIGHT)) return true;
            }
            // Verificar teclas normales
            else {
                if (this.inputManager.isKeyPressed(mapping)) return true;
            }
        }

        return false;
    }
}
