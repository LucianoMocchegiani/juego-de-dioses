/**
 * Sistema de Animación con AnimationMixer
 * 
 * Reproduce animaciones de modelos GLB usando AnimationMixer de Three.js.
 * Carga animaciones desde archivos separados y las aplica al modelo base.
 */
import { System } from '../system.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getBackendBaseUrl } from '../../utils/config.js';
import { mapBonesToBodyParts } from '../../renderers/models/bones-utils.js';
import { ANIMATION_FILES, ANIMATION_STATES, ANIMATION_MIXER } from '../../config/animation-config.js';
import { AnimationState } from '../animation/states/animation-state.js';
import { COMBAT_ACTIONS } from '../../config/combat-actions-config.js';

const gltfLoader = new GLTFLoader();

export class AnimationMixerSystem extends System {
    constructor() {
        super();
        this.requiredComponents = ['Render', 'Animation'];
        this.priority = 2.5; // Entre AnimationStateSystem (2) y RenderSystem (3)

        // Cache de animaciones cargadas
        this.animationCache = new Map();

        // Prevenir múltiples inicializaciones simultáneas
        this.initializingMixers = new Set();

        // Crear mapa de estado → nombre de animación desde configuración
        this.stateToAnimationMap = new Map();

        // Crear mapa de estado → AnimationState para acceder a propiedades de configuración
        // (como interruptOnInputRelease) de forma escalable
        this.stateConfigMap = new Map();

        for (const stateConfigData of ANIMATION_STATES) {
            const animationState = new AnimationState(stateConfigData);
            this.stateToAnimationMap.set(animationState.id, animationState.animation);
            this.stateConfigMap.set(animationState.id, animationState);
        }
    }

    /**
     * Obtener nombre de animación para un estado
     * @param {string} stateId - ID del estado
     * @returns {string|null} Nombre de la animación o null si no hay
     */
    getAnimationNameForState(stateId) {
        // Buscar en el mapa de configuración
        const animationName = this.stateToAnimationMap.get(stateId);
        if (animationName) {
            return animationName;
        }

        // Fallback: si el estado es el mismo que la animación, usar directamente
        if (ANIMATION_FILES[stateId]) {
            return stateId;
        }

        // Fallback final
        return ANIMATION_MIXER.defaultState;
    }

    /**
     * Cargar animación desde archivo GLB
     * @param {string} animationFile - Ruta del archivo de animación
     * @returns {Promise<THREE.AnimationClip[]>} Array de clips de animación
     */
    async loadAnimation(animationFile) {
        // Verificar cache
        if (this.animationCache.has(animationFile)) {
            return this.animationCache.get(animationFile);
        }

        const backendBase = getBackendBaseUrl();
        const url = `${backendBase}/static/models/${animationFile}`;

        try {
            const gltf = await gltfLoader.loadAsync(url);

            if (gltf.animations && gltf.animations.length > 0) {
                this.animationCache.set(animationFile, gltf.animations);
                return gltf.animations;
            } else {
                return [];
            }
        } catch (error) {
            // Error cargando animación, retornar array vacío
            return [];
        }
    }

    /**
     * Inicializar AnimationMixer para una entidad
     * @param {number} entityId - ID de la entidad
     * @param {THREE.Object3D} mesh - Mesh del modelo (debe ser Character_output.glb con esqueleto)
     */
    async initializeMixer(entityId, mesh) {
        // Verificar si ya tiene mixer
        if (mesh.userData.animationMixer) {
            return mesh.userData.animationMixer;
        }

        // Prevenir múltiples inicializaciones simultáneas
        if (this.initializingMixers.has(entityId)) {
            return null; // Ya se está inicializando
        }
        this.initializingMixers.add(entityId);

        try {
            // Las animaciones de Meshy requieren el modelo que viene con ellas
            const backendBase = getBackendBaseUrl();
            const baseModelFile = ANIMATION_FILES[ANIMATION_MIXER.baseModel];
            const baseModelUrl = `${backendBase}/static/models/${baseModelFile}`;

            const gltf = await gltfLoader.loadAsync(baseModelUrl);
            const animatedModel = gltf.scene;

            // Buscar el SkinnedMesh en el modelo animado
            let skinnedMesh = null;
            animatedModel.traverse((child) => {
                if (child.isSkinnedMesh && child.skeleton) {
                    skinnedMesh = child;
                }
            });

            if (!skinnedMesh) {
                this.initializingMixers.delete(entityId);
                return null;
            }

            // Reemplazar el mesh actual con el modelo animado, preservando transformaciones
            const parent = mesh.parent;
            const originalPosition = mesh.position.clone();
            const originalRotation = mesh.rotation.clone();
            const originalScale = mesh.scale.clone();
            const originalUserData = { ...mesh.userData };

            // Remover mesh antiguo
            if (parent) {
                parent.remove(mesh);
            }

            // Aplicar transformaciones al nuevo modelo
            animatedModel.position.copy(originalPosition);
            animatedModel.rotation.copy(originalRotation);
            animatedModel.scale.copy(originalScale);

            // Preservar userData importante
            animatedModel.userData.modelOffset = originalUserData.modelOffset || { x: 0, y: 0, z: 0 };
            animatedModel.userData.modelRotation = originalUserData.modelRotation || { x: 0, y: 0, z: 0 };

            // Re-mapear bones del nuevo modelo (importante para sistema de daño)
            const bodyPartsMap = mapBonesToBodyParts(animatedModel);
            if (Object.keys(bodyPartsMap).length > 0) {
                animatedModel.userData.bodyPartsMap = bodyPartsMap;
            }

            // Agregar nuevo modelo a la escena
            if (parent) {
                parent.add(animatedModel);
            }

            // Actualizar referencia en Render component
            const render = this.ecs.getComponent(entityId, 'Render');
            if (render) {
                render.setMesh(animatedModel);
            }

            // Cargar todas las animaciones
            const animations = {};
            for (const [animName, file] of Object.entries(ANIMATION_FILES)) {
                // Si el valor es un string que apunta a otra animación (ej: 'jump': 'combat_stance'),
                // no cargar, se resolverá más tarde
                if (typeof file === 'string' && file.startsWith('animations/')) {
                    const clips = await this.loadAnimation(file);
                    if (clips.length > 0) {
                        animations[animName] = clips[0];
                    }
                }
            }

            if (Object.keys(animations).length === 0) {
                this.initializingMixers.delete(entityId);
                return null;
            }

            // Crear AnimationMixer con el nuevo modelo que tiene el esqueleto correcto
            const mixer = new THREE.AnimationMixer(animatedModel);
            animatedModel.userData.animationMixer = mixer;
            animatedModel.userData.animationClips = animations;
            animatedModel.userData.currentAction = null;

            this.initializingMixers.delete(entityId);
            return mixer;
        } catch (error) {
            this.initializingMixers.delete(entityId);
            return null;
        }
    }

    /**
     * Reproducir animación según estado
     * @param {THREE.AnimationMixer} mixer - AnimationMixer
     * @param {Object} clips - Objeto con clips de animación por estado
     * @param {string} state - Estado actual de animación
     * @param {THREE.Object3D} mesh - Mesh del modelo
     */
    playAnimation(mixer, clips, state, mesh) {
        // IMPORTANTE: 'state' puede ser el ID del estado (ej: 'parry') o el nombre de la animación (ej: 'sword_parry_backward')
        // Si es un ID de estado, obtener el nombre de animación desde la configuración
        // Si no encuentra en clips con el ID, asumir que 'state' es directamente el nombre de la animación
        
        let animationName = null;
        if (clips[state]) {
            // Si existe en clips con el ID del estado, usarlo directamente
            animationName = state;
        } else {
            // Si no existe, 'state' podría ser un ID de estado, obtener nombre de animación
            animationName = this.getAnimationNameForState(state);
            
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

        // Verificar si el estado cambió
        // Usar 'state' (ID del estado) para comparar con currentState
        const stateChanged = currentState !== state;

        // Si ya está reproduciendo esta misma animación Y el estado no cambió, no hacer nada
        if (currentAction && !stateChanged && currentAction.isRunning()) {
            return;
        }

        // LÓGICA DE PROTECCIÓN DE INTERRUPCIÓN GENERALIZADA
        // Si el estado actual tiene preventInterruption (ej: ataques), no permitir NINGÚN cambio de estado
        // hasta que la animación termine (combatAction sea null).
        const hasActiveCombatAction = mesh.userData.combatAction && mesh.userData.combatAction.isRunning();
        
        if (stateChanged && currentState && hasActiveCombatAction) {
            const currentStateConfig = this.stateConfigMap.get(currentState);
            if (currentStateConfig && currentStateConfig.preventInterruption) {
                return;
            }
        }

        // LÓGICA DE INTERRUPCIÓN POR SOLTAR INPUT (para combat_stance)
        // Si estamos volviendo a idle/combat_stance, verificar si podemos interrumpir animaciones de movimiento
        if (state === ANIMATION_MIXER.defaultState && currentAction && currentState !== ANIMATION_MIXER.defaultState && currentAction.isRunning()) {
            // Obtener configuración del estado actual
            const currentStateConfig = this.stateConfigMap.get(currentState);

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
        const stateConfig = this.stateConfigMap.get(state);
        const isOneShot = stateConfig ? stateConfig.isOneShot : false;

        if (isOneShot) {
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = false;
            
            // Verificar si es acción de combate (del nuevo sistema)
            // Todas las acciones de combate (attack, parry, dodge, etc.) ahora usan activeAction
            const entityId = mesh.userData.entityId;
            const combat = entityId ? this.ecs.getComponent(entityId, 'Combat') : null;
            
            if (combat && combat.activeAction) {
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
    }

    /**
     * Actualizar sistema de animaciones
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame
     */
    update(deltaTime) {
        const entities = this.getEntities();

        for (const entityId of entities) {
            const render = this.ecs.getComponent(entityId, 'Render');
            const animation = this.ecs.getComponent(entityId, 'Animation');

            if (!render || !render.mesh || !animation) continue;

            const mesh = render.mesh;

            // Guardar referencia a la entidad en el mesh para uso posterior
            mesh.userData.entityId = entityId;

            // Inicializar mixer si no existe
            if (!mesh.userData.animationMixer) {
                this.initializeMixer(entityId, mesh).then(() => {
                    if (mesh.userData.animationMixer && mesh.userData.animationClips) {
                        this.playAnimation(
                            mesh.userData.animationMixer,
                            mesh.userData.animationClips,
                            animation.currentState,
                            mesh
                        );
                    }
                });
                continue;
            }

            // Actualizar mixer
            const mixer = mesh.userData.animationMixer;
            mixer.update(deltaTime);

            // Verificar si acciones de combate terminaron
            if (mesh.userData.combatAction) {
                const action = mesh.userData.combatAction;
                const actionDuration = action.getClip().duration;
                const progress = actionDuration > 0 ? action.time / actionDuration : 1.0;
                
                // Obtener configuración de la acción
                const entityId = mesh.userData.entityId;
                if (entityId) {
                    const combat = this.ecs.getComponent(entityId, 'Combat');
                    if (combat && combat.activeAction) {
                        const combatConfig = COMBAT_ACTIONS[combat.activeAction];
                        const finishedActionId = combat.activeAction;
                        
                        // Constante para threshold de limpieza temprana (95% de progreso)
                        const EARLY_CLEANUP_THRESHOLD = 0.95;
                        
                        // Actualizar i-frames si corresponde (propiedad específica de combate)
                        if (combatConfig && combatConfig.hasIFrames) {
                            combat.hasIFrames = progress >= combatConfig.iFrameStart && 
                                               progress <= combatConfig.iFrameEnd;
                        }
                        
                        // LIMPIEZA TEMPRANA: Limpiar defenseType antes de que termine completamente
                        // Esto previene que AnimationStateSystem (prioridad 2) vea defenseType con valor
                        // cuando AnimationMixerSystem (prioridad 2.5) todavía no ha limpiado
                        // Solo para acciones que usan defenseType (parry, dodge)
                        const shouldEarlyCleanup = progress >= EARLY_CLEANUP_THRESHOLD && progress < 1.0;
                        if (shouldEarlyCleanup && (finishedActionId === 'parry' || finishedActionId === 'dodge')) {
                            // Limpiar defenseType antes de que termine para prevenir race condition
                            // Pero mantener activeAction hasta que termine completamente
                            const input = this.ecs.getComponent(entityId, 'Input');
                            
                            // Para parry: solo limpiar si la tecla NO está presionada
                            // Si está presionada, mantener defenseType para reactivación
                            if (finishedActionId === 'parry') {
                                if (!input || !input.wantsToParry) {
                                    combat.defenseType = null;
                                }
                            } else if (finishedActionId === 'dodge') {
                                // Para dodge: siempre limpiar (no debe reactivarse)
                                combat.defenseType = null;
                            }
                        }
                    }
                }
                
                // Cuando la animación termine completamente
                // Verificar si terminó: ha alcanzado o superado la duración O ya no está corriendo
                // Para LoopOnce con clampWhenFinished=false, la animación debería terminar cuando time >= duration
                // También verificar si la animación ya terminó pero aún está en el mixer
                const animationFinished = progress >= 1.0 || (!action.isRunning() && action.time >= actionDuration);
                
                if (animationFinished) {
                    const entityId = mesh.userData.entityId;
                    if (!entityId) {
                        mesh.userData.combatAction = null;
                        return;
                    }
                    
                    const combat = this.ecs.getComponent(entityId, 'Combat');
                    const input = this.ecs.getComponent(entityId, 'Input');
                    const anim = this.ecs.getComponent(entityId, 'Animation');
                    
                    if (!combat) {
                        mesh.userData.combatAction = null;
                        return;
                    }
                    
                    // Guardar qué acción terminó para lógica especial
                    const finishedActionId = combat.activeAction;
                    
                    // CRÍTICO: Limpiar activeAction PRIMERO antes que cualquier otra cosa
                    // Esto previene que AnimationStateSystem active el estado en el siguiente frame
                    combat.endAction(); // Esto limpia activeAction a null
                    
                    // Ahora limpiar el resto de flags
                    combat.attackType = null;
                    combat.combatAnimation = null;
                    combat.isAttacking = false;
                    
                    // LÓGICA ESPECIAL POR TIPO DE ACCIÓN:
                    // - Parry: Si la tecla sigue presionada, permitir que se reactive (CombatSystem lo manejará)
                    // - Dodge: Limpiar completamente y asegurar que no se reactive
                    if (finishedActionId === 'parry') {
                        // Para parry, solo limpiar si la tecla NO está presionada
                        // Si la tecla sigue presionada, CombatSystem lo reactivará en el siguiente frame
                        if (!input || !input.wantsToParry) {
                            combat.defenseType = null;
                            if (anim) {
                                anim.currentState = 'idle';
                                anim.combatAnimationName = null;
                            }
                        } else {
                            // La tecla sigue presionada, mantener defenseType para que se reactive
                            // CombatSystem verificará wantsToParry y lo reactivará
                        }
                    } else if (finishedActionId === 'dodge') {
                        // Para dodge, limpiar completamente - no debe reactivarse automáticamente
                        combat.defenseType = null;
                        if (anim) {
                            anim.currentState = 'idle';
                            anim.combatAnimationName = null;
                        }
                        // Resetear wantsToDodge si existe para evitar reactivación
                        if (input) {
                            input.wantsToDodge = false;
                        }
                    } else {
                        // Otras acciones (ataques): limpiar normalmente
                        combat.defenseType = null;
                        if (anim) {
                            anim.currentState = 'idle';
                            anim.combatAnimationName = null;
                        }
                    }
                    
                    // Limpiar referencia a la acción de combate
                    mesh.userData.combatAction = null;
                    mesh.userData.isAttacking = false;
                    
                    // Resetear flag de movimiento aplicado
                    if (mesh.userData.movementApplied !== undefined) {
                        mesh.userData.movementApplied = false;
                    }
                }
            }
            // Nota: El código legacy de attackAction fue eliminado - todas las acciones de combate
            // (incluyendo attack) ahora usan combatAction y se manejan en la sección de arriba

            // Reproducir animación según estado
            const clips = mesh.userData.animationClips;
            if (clips) {
                // Prioridad 1: Animación de combo (si hay combo activo)
                // Prioridad 2: Animación de combate (si hay acción de combate)
                // Prioridad 3: Resolver por estado normal
                let animationName = null;
                let stateToUse = animation.currentState; // Estado a usar para configuración
                
                if (animation.comboAnimationName) {
                    animationName = animation.comboAnimationName;
                    // Para combos, el estado ya está en currentState
                } else if (animation.combatAnimationName) {
                    animationName = animation.combatAnimationName;
                    // IMPORTANTE: Para animaciones de combate, usar currentState (ej: 'parry', 'dodge')
                    // NO usar animationName como estado porque es el nombre de la animación (ej: 'sword_parry_backward')
                    // currentState tiene el ID del estado (ej: 'parry') que tiene la configuración correcta
                    stateToUse = animation.currentState; // Ya está configurado por AnimationStateSystem
                } else {
                    // Obtener nombre de animación desde configuración
                    animationName = this.getAnimationNameForState(animation.currentState);
                    stateToUse = animation.currentState;
                }

                // Si la animación existe en los clips cargados, reproducirla
                // Pasar stateToUse para que playAnimation pueda encontrar la configuración correcta
                if (animationName && clips[animationName]) {
                    this.playAnimation(mixer, clips, stateToUse, mesh);
                } else if (clips[ANIMATION_MIXER.defaultState]) {
                    // Fallback: usar combat_stance si no hay animación específica
                    this.playAnimation(mixer, clips, ANIMATION_MIXER.defaultState, mesh);
                }
            }
        }
    }
}

