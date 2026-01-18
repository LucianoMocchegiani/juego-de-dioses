/**
 * Helper para Aplicación de Movimiento de Acciones de Combate
 * 
 * Aplica impulso de movimiento basado en configuración de acciones de combate.
 */
import { COMBAT_ACTIONS } from '../../../config/combat-actions-config.js';

export class CombatMovementApplier {
    constructor(combatActions = COMBAT_ACTIONS) {
        this.combatActions = combatActions;
    }

    /**
     * Aplicar movimiento de acciones de combate
     * @param {Object} physics - PhysicsComponent (se modifica)
     * @param {Object} input - InputComponent
     * @param {Object} combat - CombatComponent
     * @param {Object} render - RenderComponent
     * @param {Object} actionConfig - Configuración de la acción desde COMBAT_ACTIONS
     * @returns {boolean} True si se aplicó movimiento
     */
    applyCombatMovement(physics, input, combat, render, actionConfig) {
        if (!input || !combat || !combat.activeAction || !actionConfig) {
            // Si no hay acción activa, resetear flag
            if (render && render.mesh && render.mesh.userData) {
                render.mesh.userData.movementApplied = false;
            }
            return false;
        }

        if (!actionConfig.hasMovement) {
            // Si no hay movimiento en la acción, resetear flag
            if (render && render.mesh && render.mesh.userData) {
                render.mesh.userData.movementApplied = false;
            }
            return false;
        }

        const movementSpeed = actionConfig.movementSpeed;

        // Inicializar flag si no existe
        if (!render || !render.mesh || !render.mesh.userData) {
            // Si no hay render/mesh, no podemos aplicar movimiento
            // Esto no debería pasar normalmente
            return false;
        }

        // Inicializar flag si no existe
        if (render.mesh.userData.movementApplied === undefined) {
            render.mesh.userData.movementApplied = false;
        }

        // Calcular dirección según configuración (solo una vez al inicio)
        if (!render.mesh.userData.movementApplied) {
            let dirX = 0, dirY = 0;

            if (actionConfig.useMovementInput && 
                (input.moveDirection.x !== 0 || input.moveDirection.y !== 0)) {
                // Usar dirección de input
                dirX = input.moveDirection.x;
                dirY = input.moveDirection.y;
            } else {
                // Usar dirección de cámara (hacia adelante)
                const cameraRotation = render?.rotationY || 0;
                const cos = Math.cos(cameraRotation);
                const sin = Math.sin(cameraRotation);
                dirX = -sin;
                dirY = -cos;
            }

            // Aplicar impulso solo una vez al inicio
            physics.velocity.x = dirX * movementSpeed;
            physics.velocity.y = dirY * movementSpeed;
            render.mesh.userData.movementApplied = true;
            return true;
        }

        return false;
    }
}
