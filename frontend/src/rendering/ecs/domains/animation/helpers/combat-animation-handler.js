/**
 * Helper para Gestión de Combate en Animaciones
 * 
 * Maneja i-frames, cleanup temprano y final de acciones de combate durante animaciones.
 */
import { COMBAT_ACTIONS } from '../../../../../config/combat-actions-config.js';
import { COMBAT_CONSTANTS } from '../../../../../config/combat-constants.js';
import { ANIMATION_CONSTANTS } from '../../../../../config/animation-constants.js';

export class CombatAnimationHandler {
    /**
     * Actualizar acciones de combate en progreso (i-frames, limpieza temprana, limpieza final)
     * 
     * @param {Object} combat - CombatComponent
     * @param {Object|null} input - InputComponent o null
     * @param {Object} anim - AnimationComponent
     * @param {THREE.Object3D} mesh - Mesh del modelo
     * @param {THREE.AnimationAction} action - Acción de combate activa
     * @returns {Object} { finished: boolean, finishedActionId: string|null }
     */
    updateCombatAction(combat, input, anim, mesh, action) {
        const actionDuration = action.getClip().duration;
        const progress = actionDuration > 0 ? action.time / actionDuration : 1.0;

        if (!combat || !combat.activeAction) {
            return { finished: false, finishedActionId: null };
        }

        const combatConfig = COMBAT_ACTIONS[combat.activeAction];
        const finishedActionId = combat.activeAction;

        // Actualizar i-frames si corresponde
        if (combatConfig && combatConfig.hasIFrames) {
            combat.hasIFrames = progress >= combatConfig.iFrameStart &&
                progress <= combatConfig.iFrameEnd;
        }

        // Early cleanup: Limpiar defenseType antes de que termine completamente
        const shouldEarlyCleanup = progress >= COMBAT_CONSTANTS.EARLY_CLEANUP_THRESHOLD && progress < 1.0;
        if (shouldEarlyCleanup && (finishedActionId === COMBAT_CONSTANTS.ACTION_IDS.PARRY ||
            finishedActionId === COMBAT_CONSTANTS.ACTION_IDS.DODGE)) {
            combat.cleanupDefenseType(finishedActionId, input);
        }

        // Verificar si la animación terminó completamente
        const animationFinished = progress >= ANIMATION_CONSTANTS.NUMERIC.PROGRESS_COMPLETE || 
                                  (!action.isRunning() && action.time >= actionDuration);

        if (animationFinished) {
            this.cleanupFinishedCombatAction(finishedActionId, combat, input, anim, mesh);
            return { finished: true, finishedActionId };
        }

        return { finished: false, finishedActionId: null };
    }

    /**
     * Limpiar estado cuando termina una animación de combate
     * 
     * @param {string} finishedActionId - ID de la acción que terminó
     * @param {Object} combat - CombatComponent
     * @param {Object|null} input - InputComponent o null
     * @param {Object} anim - AnimationComponent
     * @param {THREE.Object3D} mesh - Mesh del modelo
     */
    cleanupFinishedCombatAction(finishedActionId, combat, input, anim, mesh) {
        // Guardar si parry todavía se quiere (para reactivación)
        const parryStillWanted = finishedActionId === COMBAT_CONSTANTS.ACTION_IDS.PARRY &&
            input && input.wantsToParry;

        // Limpiar todo el estado de combate
        combat.clearCombatState();

        // Lógica especial por tipo de acción usando el helper centralizado
        if (parryStillWanted) {
            // Mantener defenseType para reactivación
            combat.defenseType = COMBAT_CONSTANTS.ACTION_IDS.PARRY;
        } else {
            // Limpiar defenseType según tipo de acción (usando helper)
            combat.cleanupDefenseType(finishedActionId, input);
        }

        // Resetear wantsToDodge para evitar reactivación
        if (finishedActionId === COMBAT_CONSTANTS.ACTION_IDS.DODGE && input) {
            input.wantsToDodge = false;
        }

        // Cambiar estado de animación a idle
        if (anim) {
            anim.currentState = ANIMATION_CONSTANTS.STATE_IDS.IDLE;
        }

        // Limpiar referencias en mesh
        mesh.userData.combatAction = null;
        mesh.userData.isAttacking = false;

        // Resetear flag de movimiento aplicado
        if (mesh.userData.movementApplied !== undefined) {
            mesh.userData.movementApplied = false;
        }
    }
}
