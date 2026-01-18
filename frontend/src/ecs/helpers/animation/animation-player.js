/**
 * Helper para Reproducción de Animaciones
 * 
 * Maneja la reproducción de animaciones, transiciones (fade in/out), detección de cambios
 * direccionales y lógica de interrupción.
 */
import * as THREE from 'three';
import { ANIMATION_MIXER } from '../../../config/animation-config.js';
import { ECS_CONSTANTS } from '../../../config/ecs-constants.js';
import { debugLogger } from '../../../debug/logger.js';

export class AnimationPlayer {
    constructor(animationResolver, ecs) {
        this.animationResolver = animationResolver;
        this.ecs = ecs; // Necesario para obtener InputComponent en playAnimation y componentes en playAnimationByName
    }

    /**
     * Reproducir animación según estado
     * @param {THREE.AnimationMixer} mixer - AnimationMixer
     * @param {Object} clips - Objeto con clips de animación por estado
     * @param {string} state - Estado actual de animación
     * @param {THREE.Object3D} mesh - Mesh del modelo
     * @param {Map} stateConfigMap - Mapa de configuración de estados
     * @param {Object} combo - ComboComponent opcional
     * @param {Object} combat - CombatComponent opcional
     */
    playAnimation(mixer, clips, state, mesh, stateConfigMap, combo = null, combat = null) {
        // IMPORTANTE: 'state' puede ser el ID del estado (ej: 'parry') o el nombre de la animación (ej: 'sword_parry_backward')
        // Si es un ID de estado, obtener el nombre de animación desde la configuración
        // Si no encuentra en clips con el ID, asumir que 'state' es directamente el nombre de la animación

        let animationName = null;
        if (clips[state]) {
            // Si existe en clips con el ID del estado, usarlo directamente
            animationName = state;
        } else {
            // Si no existe, 'state' podría ser un ID de estado, obtener nombre de animación
            // Resolver usando resolveAnimationName para considerar combo/combate y direcciones
            let input = null;
            if (state === 'walk' || state === 'crouch_walk' || state === 'swim') {
                const entityId = mesh.userData.entityId;
                if (entityId) {
                    input = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.INPUT);
                }
            }
            // Usar resolveAnimationName para considerar prioridad: Combo > Combate > Normal
            animationName = this.animationResolver.resolveAnimationName(state, combo, combat, input);

            // Si todavía no existe, intentar usar 'state' como nombre de animación directamente
            if (!animationName || !clips[animationName]) {
                animationName = state;
            }
        }

        // Si la animación no existe en los clips, no hacer nada
        if (!clips[animationName]) {
            return;
        }

        const clip = clips[animationName];
        const currentAction = mesh.userData.currentAction;
        const currentState = mesh.userData.currentAnimationState;
        const currentAnimationName = mesh.userData.currentAnimationName;

        // Verificar si el estado cambió
        // Usar 'state' (ID del estado) para comparar con currentState
        const stateChanged = currentState !== state;
        
        // Para estado 'walk', 'crouch_walk' o 'swim', también verificar si la animación direccional cambió
        // (porque el estado puede ser 'walk', 'crouch_walk' o 'swim' pero la animación puede ser walk_forward, walk_left, crouch_walk_backward, swim_forward, swim_idle, etc.)
        const animationChanged = ((state === 'walk' && currentState === 'walk') || 
                                 (state === 'crouch_walk' && currentState === 'crouch_walk') ||
                                 (state === 'swim' && currentState === 'swim')) ? 
            (currentAnimationName !== animationName) : false;

        // Si ya está reproduciendo esta misma animación Y el estado no cambió Y la animación direccional no cambió, no hacer nada
        if (currentAction && !stateChanged && !animationChanged && currentAction.isRunning()) {
            return;
        }

        // LÓGICA DE PROTECCIÓN DE INTERRUPCIÓN GENERALIZADA
        // Si el estado actual tiene preventInterruption (ej: ataques), no permitir NINGÚN cambio de estado
        // hasta que la animación termine (combatAction sea null).
        const hasActiveCombatAction = mesh.userData.combatAction && mesh.userData.combatAction.isRunning();

        if (stateChanged && currentState && hasActiveCombatAction) {
            const currentStateConfig = stateConfigMap.get(currentState);
            if (currentStateConfig && currentStateConfig.preventInterruption) {
                return;
            }
        }

        // LÓGICA DE INTERRUPCIÓN POR SOLTAR INPUT (para combat_stance)
        // Si estamos volviendo a idle/combat_stance, verificar si podemos interrumpir animaciones de movimiento
        if (state === ANIMATION_MIXER.defaultState && currentAction && currentState !== ANIMATION_MIXER.defaultState && currentAction.isRunning()) {
            // Obtener configuración del estado actual
            const currentStateConfig = stateConfigMap.get(currentState);

            if (currentStateConfig) {
                // Si el estado actual tiene interruptOnInputRelease = true, permitir interrupción
                // (ej: walk, run, swim, fly, etc. - animaciones de movimiento continuo)
                if (currentStateConfig.interruptOnInputRelease) {
                    // Continuar con la transición - permitir que se interrumpa
                }
                // Nota: La lógica de preventInterruption ya se manejó arriba, así que no necesitamos repetirla aquí
            }
        }

        // Detener animación actual si existe y es diferente (excepto si la nueva es combat_stance)
        if (currentAction && currentState !== state && state !== ANIMATION_MIXER.defaultState) {
            currentAction.fadeOut(ANIMATION_MIXER.defaultTransitionDuration);
        } else if (currentAction && currentState !== state && state === ANIMATION_MIXER.defaultState) {
            // Si se transiciona a combat_stance, hacer fadeOut suave
            currentAction.fadeOut(ANIMATION_MIXER.defaultTransitionDuration);
        }
        // Crear y reproducir nueva animación
        const action = mixer.clipAction(clip);
        action.reset();

        // Obtener configuración del nuevo estado
        // IMPORTANTE: Usar 'state' (ID del estado como 'parry') NO 'animationName' (nombre de animación como 'sword_parry_backward')
        // porque stateConfigMap está indexado por ID de estado
        const stateConfig = stateConfigMap.get(state);
        const isOneShot = stateConfig ? stateConfig.isOneShot : false;

        if (isOneShot) {
            action.setLoop(THREE.LoopOnce);
            // Usar clampWhenFinished = true (igual que playAnimationByName)
            // Esto mantiene la animación en el último frame, evitando saltos visuales
            action.clampWhenFinished = true;

            // Verificar si es acción de combate (del nuevo sistema)
            // Todas las acciones de combate (attack, parry, dodge, etc.) ahora usan activeAction
            const entityId = mesh.userData.entityId;
            const combatComp = entityId ? this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.COMBAT) : null;

            if (combatComp && combatComp.activeAction) {
                // Acción del nuevo sistema (attack, parry, dodge, heavy, charged, special)
                mesh.userData.combatAction = action;
            } else {
                // Animación one-shot que NO es de combate
                // (útil para futuras expansiones como habilidades especiales)
                mesh.userData.isAttacking = true; // Mantener flag por compatibilidad
            }
        } else {
            // Todas las demás animaciones (combat_stance, walk, run) en loop
            action.setLoop(THREE.LoopRepeat);
        }

        action.fadeIn(ANIMATION_MIXER.defaultTransitionDuration);
        action.play();
        // Guardar referencia a la acción y estado actual
        mesh.userData.currentAction = action;
        mesh.userData.currentAnimationState = state;
        mesh.userData.currentAnimationName = animationName; // Guardar nombre de animación para detectar cambios direccionales
    }

    /**
     * Reproducir animación directamente por nombre
     * 
     * Método público para reproducir animaciones por nombre desde interfaces externas
     * (ej: interfaz de prueba de animaciones).
     * 
     * @param {number} entityId - ID de la entidad
     * @param {string} animationName - Nombre de la animación (key de ANIMATION_FILES)
     * @returns {boolean} True si se reprodujo correctamente, False si hubo error
     */
    playAnimationByName(entityId, animationName) {
        // Validar parámetros
        if (entityId === undefined || entityId === null || !animationName) {
            debugLogger.warn('AnimationPlayer', 'playAnimationByName: entityId y animationName son requeridos', {
                entityId,
                animationName
            });
            return false;
        }

        // Obtener componentes necesarios
        const render = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.RENDER);
        if (!render || !render.mesh) {
            debugLogger.warn('AnimationPlayer', 'playAnimationByName: Entidad no tiene RenderComponent o mesh', {
                entityId
            });
            return false;
        }

        const mesh = render.mesh;
        const mixer = mesh.userData.animationMixer;
        const clips = mesh.userData.animationClips;

        // Verificar que el mixer esté inicializado
        if (!mixer || !clips) {
            debugLogger.warn('AnimationPlayer', 'playAnimationByName: Mixer no inicializado para entidad', {
                entityId,
                hasMixer: !!mixer,
                hasClips: !!clips
            });
            return false;
        }

        // Buscar clip por nombre
        let clip = clips[animationName];

        // Si no existe, la animación no está cargada
        if (!clip) {
            debugLogger.warn('AnimationPlayer', 'playAnimationByName: Animación no encontrada en clips', {
                entityId,
                animationName,
                availableAnimations: Object.keys(clips)
            });
            return false;
        }

        // Detener animación actual si existe
        const currentAction = mesh.userData.currentAction;
        if (currentAction && currentAction.isRunning()) {
            currentAction.fadeOut(ANIMATION_MIXER.defaultTransitionDuration);
        }

        // Limpiar referencias de combate si existen
        if (mesh.userData.combatAction) {
            mesh.userData.combatAction = null;
        }
        mesh.userData.isAttacking = false;

        // Crear y reproducir nueva animación
        const action = mixer.clipAction(clip);
        action.reset();
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
        action.fadeIn(ANIMATION_MIXER.defaultTransitionDuration);
        action.play();

        // Marcar que estamos en modo de prueba para evitar que el sistema automático interrumpa
        mesh.userData.isTestingAnimation = true;
        mesh.userData.testAnimationName = animationName;

        // El flag se limpiará automáticamente en el método update() cuando la animación termine

        // Guardar referencias
        mesh.userData.currentAction = action;
        mesh.userData.currentAnimationState = animationName;
        mesh.userData.currentAnimationName = animationName; // Guardar nombre de animación para detectar cambios direccionales

        debugLogger.debug('AnimationPlayer', 'playAnimationByName: Animación reproducida', {
            entityId,
            animationName
        });

        return true;
    }
}
