/**
 * Helper para Resolución de Nombres de Animación
 * 
 * Maneja la resolución de nombres de animación según estado, dirección y prioridad.
 * Prioridad: Combo > Combate > Normal (config)
 */
import { ANIMATION_FILES, ANIMATION_STATES, ANIMATION_MIXER } from '../../../../../config/animation-config.js';
import { debugLogger } from '../../../../../debug/logger.js';
import { stateValidator } from '../../../../../debug/validator.js';

export class AnimationResolver {
    constructor(stateConfigMap) {
        // Mapa de estado → AnimationState (pasado desde el sistema)
        this.stateConfigMap = stateConfigMap;
    }

    /**
     * Obtener nombre de animación para un estado
     * @param {string} stateId - ID del estado
     * @param {Object} input - InputComponent opcional para determinar dirección de caminar
     * @returns {string|null} Nombre de la animación o null si no hay
     */
    getAnimationNameForState(stateId, input = null) {
        // Si es estado 'walk' y tenemos input, determinar dirección directamente desde teclas
        if (stateId === 'walk' && input) {
            // Verificar teclas directamente (más simple y confiable)
            // IMPORTANTE: Solo una dirección a la vez - verificar en orden de prioridad
            const isW = input.isKeyPressed('KeyW');
            const isS = input.isKeyPressed('KeyS');
            const isA = input.isKeyPressed('KeyA');
            const isD = input.isKeyPressed('KeyD');

            // Prioridad: W (adelante) > S (atrás) > A (izquierda) > D (derecha)
            // Solo usar la primera tecla que encuentre presionada (una a la vez)
            if (isW) {
                return 'walk_forward';
            } else if (isS) {
                return 'walk_backward';
            } else if (isA) {
                return 'walk_left';
            } else if (isD) {
                return 'walk_right';
            }
            // Si no hay ninguna tecla presionada, usar fallback
        }
        
        // Si es estado 'crouch_walk' y tenemos input, determinar dirección directamente desde teclas
        if (stateId === 'crouch_walk' && input) {
            // Verificar teclas directamente (más simple y confiable)
            // IMPORTANTE: Solo una dirección a la vez - verificar en orden de prioridad
            const isW = input.isKeyPressed('KeyW');
            const isS = input.isKeyPressed('KeyS');
            const isA = input.isKeyPressed('KeyA');
            const isD = input.isKeyPressed('KeyD');

            // Prioridad: W (adelante) > S (atrás) > A (izquierda) > D (derecha)
            // Solo usar la primera tecla que encuentre presionada (una a la vez)
            if (isW) {
                return 'crouch_walk_forward';
            } else if (isS) {
                return 'crouch_walk_backward';
            } else if (isA) {
                return 'crouch_walk_left';
            } else if (isD) {
                return 'crouch_walk_right';
            }
            // Si no hay ninguna tecla presionada, usar fallback
        }
        
        // Si es estado 'swim' y tenemos input, determinar dirección directamente desde teclas
        if (stateId === 'swim' && input) {
            // Verificar teclas directamente (más simple y confiable)
            // IMPORTANTE: Solo una dirección a la vez - verificar en orden de prioridad
            const isW = input.isKeyPressed('KeyW');
            const isS = input.isKeyPressed('KeyS');
            const isA = input.isKeyPressed('KeyA');
            const isD = input.isKeyPressed('KeyD');

            // Prioridad: W (adelante) > S (atrás) > A (izquierda) > D (derecha)
            // Solo usar la primera tecla que encuentre presionada (una a la vez)
            if (isW) {
                return 'swim_forward';
            } else if (isS) {
                return 'swim_idle'; // Fallback: no existe swim_backward
            } else if (isA) {
                return 'swim_idle'; // Fallback: no existe swim_left
            } else if (isD) {
                return 'swim_idle'; // Fallback: no existe swim_right
            }
            // Si no hay ninguna tecla presionada, usar fallback
        }

        // Buscar en el mapa de configuración
        const stateConfig = this.stateConfigMap.get(stateId);
        if (stateConfig && stateConfig.animation) {
            return stateConfig.animation;
        }

        // Fallback: si el estado es el mismo que la animación, usar directamente
        if (ANIMATION_FILES[stateId]) {
            return stateId;
        }

        // Fallback final
        debugLogger.debug('AnimationResolver', 'Using default animation state', {
            stateId,
            defaultState: ANIMATION_MIXER.defaultState
        });
        return ANIMATION_MIXER.defaultState;
    }

    /**
     * Resolver nombre de animación desde componentes fuente según prioridad
     * Prioridad: Combo > Combate > Normal (config)
     * 
     * @param {string} stateId - ID del estado actual
     * @param {Object} combo - ComboComponent opcional
     * @param {Object} combat - CombatComponent opcional
     * @param {Object} input - InputComponent opcional
     * @returns {string|null} Nombre de la animación o null si no se encuentra
     */
    resolveAnimationName(stateId, combo = null, combat = null, input = null) {
        // Validar estado antes de procesar
        if (!stateValidator.validateAnimationState(
            stateId,
            this.stateConfigMap,
            `AnimationResolver.resolveAnimationName(${stateId})`
        )) {
            return null;
        }

        // Prioridad 1: Combo (si hay combo activo)
        if (combo?.activeComboId && combo?.comboAnimation) {
            debugLogger.debug('AnimationResolver', 'Resolved animation from combo', {
                comboId: combo.activeComboId,
                animationName: combo.comboAnimation
            });
            return combo.comboAnimation;
        }

        // Prioridad 2: Combate (si hay acción activa)
        if (combat?.activeAction && combat?.combatAnimation) {
            debugLogger.debug('AnimationResolver', 'Resolved animation from combat', {
                actionId: combat.activeAction,
                animationName: combat.combatAnimation
            });
            return combat.combatAnimation;
        }

        // Prioridad 3: Resolver desde configuración (estado normal)
        const animationName = this.getAnimationNameForState(stateId, input);
        debugLogger.debug('AnimationResolver', 'Resolved animation from state', {
            stateId,
            animationName,
            hasInput: input !== null
        });
        return animationName;
    }
}
