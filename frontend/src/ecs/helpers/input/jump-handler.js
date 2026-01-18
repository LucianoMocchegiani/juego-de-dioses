/**
 * Helper para Sistema de Saltos y Activación de Vuelo
 * 
 * Maneja el sistema de saltos (normal, doble salto) y activación de vuelo
 * mediante triple salto consecutivo.
 */
import { INPUT_MAP } from '../../../config/input-map-config.js';

export class JumpHandler {
    constructor(inputManager) {
        this.inputManager = inputManager;
        this.JUMP_COMBO_TIMEOUT = 1000; // 1 segundo para mantener el combo
    }

    /**
     * Procesar input de salto y actualizar estado de salto/vuelo
     * @param {Object} input - InputComponent
     * @param {Object} physics - PhysicsComponent
     * @param {number} currentTime - Tiempo actual (performance.now())
     * @returns {Object} Estado actualizado: { wantsToJump: boolean, isFlying: boolean, consecutiveJumps: number }
     */
    processJump(input, physics, currentTime) {
        // Verificar si se presionó la tecla de salto
        const jumpKeys = INPUT_MAP['jump'];
        let jumpJustPressed = false;
        for (const key of jumpKeys) {
            if (this.inputManager.isKeyDown(key)) {
                jumpJustPressed = true;
                break;
            }
        }

        // Resetear contador si pasó mucho tiempo desde el último salto
        if (currentTime - physics.lastJumpTime > this.JUMP_COMBO_TIMEOUT) {
            physics.consecutiveJumps = 0;
        }

        if (jumpJustPressed) {
            if (physics.isGrounded) {
                // Salto normal desde el suelo
                input.wantsToJump = true;
                physics.consecutiveJumps = 1;
                physics.lastJumpTime = currentTime;
            } else if (!physics.isFlying) {
                // Salto en el aire (aéreo) - solo si no está volando
                physics.consecutiveJumps++;
                physics.lastJumpTime = currentTime;
                
                // Si llegamos a 3 saltos consecutivos, activar vuelo
                if (physics.consecutiveJumps >= 3) {
                    physics.isFlying = true;
                    physics.useGravity = false;
                    physics.consecutiveJumps = 0; // Resetear contador
                    return {
                        wantsToJump: false,
                        isFlying: true,
                        consecutiveJumps: 0
                    };
                } else {
                    // Salto aéreo normal (doble salto)
                    input.wantsToJump = true;
                }
            }
        }

        return {
            wantsToJump: input.wantsToJump || false,
            isFlying: physics.isFlying || false,
            consecutiveJumps: physics.consecutiveJumps || 0
        };
    }
}
