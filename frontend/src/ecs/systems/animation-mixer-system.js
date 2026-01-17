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
import { mapBonesToBodyParts } from '../models/bones-utils.js';
import { ANIMATION_FILES, ANIMATION_STATES, ANIMATION_MIXER } from '../../config/animation-config.js';
import { AnimationState } from '../states/animation-state.js';
import { COMBAT_ACTIONS } from '../../config/combat-actions-config.js';
import { COMBAT_CONSTANTS } from '../../config/combat-constants.js';
import { ECS_CONSTANTS } from '../../config/ecs-constants.js';
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';
import { debugLogger } from '../../debug/logger.js';
import { stateValidator } from '../../debug/validator.js';

const gltfLoader = new GLTFLoader();

export class AnimationMixerSystem extends System {
    constructor(lodManager = null) {
        super();
        this.requiredComponents = [
            ECS_CONSTANTS.COMPONENT_NAMES.RENDER,
            ECS_CONSTANTS.COMPONENT_NAMES.ANIMATION
        ];
        this.priority = 2.5; // Entre AnimationStateSystem (2) y RenderSystem (3)
        this.lodManager = lodManager;
        this.frameCounter = 0; // Para LOD update frequency

        // Cache de animaciones cargadas
        this.animationCache = new Map();

        // Prevenir múltiples inicializaciones simultáneas
        this.initializingMixers = new Set();

        // Crear mapa de estado → AnimationState para acceder a propiedades de configuración
        // (como interruptOnInputRelease, animation) de forma escalable
        this.stateConfigMap = new Map(
            ANIMATION_STATES.map(config => [
                config.id,
                new AnimationState(config)
            ])
        );
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
        debugLogger.debug('AnimationMixer', 'Using default animation state', {
            stateId,
            defaultState: ANIMATION_MIXER.defaultState
        });
        return ANIMATION_MIXER.defaultState;
    }

    /**
     * Resolver nombre de animación desde componentes fuente según prioridad
     * Prioridad: Combo > Combate > Normal (config)
     * 
     * @param {number} entityId - ID de la entidad
     * @param {string} stateId - ID del estado actual
     * @returns {string|null} Nombre de la animación o null si no se encuentra
     */
    resolveAnimationName(entityId, stateId, combo = null, combat = null) {
        // Validar estado antes de procesar
        if (!stateValidator.validateAnimationState(
            stateId,
            this.stateConfigMap,
            `AnimationMixer.resolveAnimationName(${entityId})`
        )) {
            return null;
        }

        // Prioridad 1: Combo (si hay combo activo)
        // Usar componente cacheado si está disponible, sino buscarlo
        const comboComp = combo || this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.COMBO);
        if (comboComp?.activeComboId && comboComp?.comboAnimation) {
            debugLogger.debug('AnimationMixer', 'Resolved animation from combo', {
                entityId,
                comboId: comboComp.activeComboId,
                animationName: comboComp.comboAnimation
            });
            return comboComp.comboAnimation;
        }

        // Prioridad 2: Combate (si hay acción activa)
        // Usar componente cacheado si está disponible, sino buscarlo
        const combatComp = combat || this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.COMBAT);
        if (combatComp?.activeAction && combatComp?.combatAnimation) {
            debugLogger.debug('AnimationMixer', 'Resolved animation from combat', {
                entityId,
                actionId: combatComp.activeAction,
                animationName: combatComp.combatAnimation
            });
            return combatComp.combatAnimation;
        }

        // Prioridad 3: Resolver desde configuración (estado normal)
        // Si es estado 'walk' o 'crouch_walk', pasar input para determinar dirección
        let input = null;
        if (stateId === 'walk' || stateId === 'crouch_walk') {
            input = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.INPUT);
        }
        const animationName = this.getAnimationNameForState(stateId, input);
        debugLogger.debug('AnimationMixer', 'Resolved animation from state', {
            entityId,
            stateId,
            animationName,
            hasInput: input !== null
        });
        return animationName;
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
                debugLogger.debug('AnimationMixer', 'Animation loaded successfully', {
                    animationFile,
                    animationCount: gltf.animations.length
                });
                return gltf.animations;
            } else {
                debugLogger.warn('AnimationMixer', 'Animation file has no animations', {
                    animationFile,
                    url
                });
                return [];
            }
        } catch (error) {
            // Error cargando animación, retornar array vacío
            debugLogger.error('AnimationMixer', 'Error loading animation', {
                animationFile,
                url,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Inicializar AnimationMixer para una entidad
     * @param {number} entityId - ID de la entidad
     * @param {THREE.Object3D} mesh - Mesh del modelo (debe ser biped_male.glb con esqueleto)
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
            const baseModelPath = 'biped/male/characters/biped_male.glb';
            const baseModelUrl = `${backendBase}/static/models/${baseModelPath}`;

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
            animatedModel.userData.modelOffset = originalUserData.modelOffset || {
                x: ANIMATION_CONSTANTS.NUMERIC.DEFAULT_OFFSET_X,
                y: ANIMATION_CONSTANTS.NUMERIC.DEFAULT_OFFSET_Y,
                z: ANIMATION_CONSTANTS.NUMERIC.DEFAULT_OFFSET_Z
            };
            animatedModel.userData.modelRotation = originalUserData.modelRotation || {
                x: ANIMATION_CONSTANTS.NUMERIC.DEFAULT_ROTATION_X,
                y: ANIMATION_CONSTANTS.NUMERIC.DEFAULT_ROTATION_Y,
                z: ANIMATION_CONSTANTS.NUMERIC.DEFAULT_ROTATION_Z
            };

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
            const render = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.RENDER);
            if (render) {
                render.setMesh(animatedModel);
            }

            // Cargar todas las animaciones
            const animations = {};
            for (const [animName, file] of Object.entries(ANIMATION_FILES)) {
                // Cargar solo si es un string válido (ruta de archivo)
                // Excluir comentarios o valores que no sean rutas (ej: strings que indican que no existe)
                if (typeof file === 'string' && file.startsWith('biped/male/animations/')) {
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
            animatedModel.userData.currentAnimationName = null; // Inicializar para tracking de animaciones direccionales

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
            // Si es estado 'walk', pasar input para determinar dirección
            let input = null;
            if (state === 'walk') {
                const entityId = mesh.userData.entityId;
                if (entityId) {
                    input = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.INPUT);
                }
            }
            animationName = this.getAnimationNameForState(state, input);

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
        
        // Para estado 'walk' o 'crouch_walk', también verificar si la animación direccional cambió
        // (porque el estado puede ser 'walk' o 'crouch_walk' pero la animación puede ser walk_forward, walk_left, crouch_walk_backward, etc.)
        const animationChanged = ((state === 'walk' && currentState === 'walk') || 
                                 (state === 'crouch_walk' && currentState === 'crouch_walk')) ? 
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
            // Usar clampWhenFinished = true (igual que playAnimationByName)
            // Esto mantiene la animación en el último frame, evitando saltos visuales
            action.clampWhenFinished = true;

            // Verificar si es acción de combate (del nuevo sistema)
            // Todas las acciones de combate (attack, parry, dodge, etc.) ahora usan activeAction
            const entityId = mesh.userData.entityId;
            const combat = entityId ? this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.COMBAT) : null;

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
            debugLogger.warn('AnimationMixer', 'playAnimationByName: entityId y animationName son requeridos', {
                entityId,
                animationName
            });
            return false;
        }

        // Obtener componentes necesarios
        const render = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.RENDER);
        if (!render || !render.mesh) {
            debugLogger.warn('AnimationMixer', 'playAnimationByName: Entidad no tiene RenderComponent o mesh', {
                entityId
            });
            return false;
        }

        const mesh = render.mesh;
        const mixer = mesh.userData.animationMixer;
        const clips = mesh.userData.animationClips;

        // Verificar que el mixer esté inicializado
        if (!mixer || !clips) {
            debugLogger.warn('AnimationMixer', 'playAnimationByName: Mixer no inicializado para entidad', {
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
            debugLogger.warn('AnimationMixer', 'playAnimationByName: Animación no encontrada en clips', {
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

        debugLogger.debug('AnimationMixer', 'playAnimationByName: Animación reproducida', {
            entityId,
            animationName
        });

        return true;
    }

    /**
     * @private
     * Actualizar acciones de combate en progreso (i-frames, limpieza temprana, limpieza final)
     * 
     * @param {number} entityId - ID de la entidad
     * @param {Object} combat - CombatComponent
     * @param {Object|null} input - InputComponent o null
     * @param {Object} anim - AnimationComponent
     * @param {THREE.Object3D} mesh - Mesh del modelo
     * @param {THREE.AnimationAction} action - Acción de combate activa
     * @returns {boolean} true si la animación terminó completamente
     */
    updateCombatAction(entityId, combat, input, anim, mesh, action) {
        const actionDuration = action.getClip().duration;
        const progress = actionDuration > 0 ? action.time / actionDuration : 1.0;

        if (!combat || !combat.activeAction) return false;

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
        const animationFinished = progress >= ANIMATION_CONSTANTS.NUMERIC.PROGRESS_COMPLETE || (!action.isRunning() && action.time >= actionDuration);

        if (animationFinished) {
            this.cleanupFinishedCombatAction(entityId, finishedActionId, combat, input, anim, mesh);
            return true;
        }

        return false;
    }

    /**
     * @private
     * Limpiar estado cuando termina una animación de combate
     * 
     * @param {number} entityId - ID de la entidad
     * @param {string} finishedActionId - ID de la acción que terminó
     * @param {Object} combat - CombatComponent
     * @param {Object|null} input - InputComponent o null
     * @param {Object} anim - AnimationComponent
     * @param {THREE.Object3D} mesh - Mesh del modelo
     */
    cleanupFinishedCombatAction(entityId, finishedActionId, combat, input, anim, mesh) {
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

    /**
     * Actualizar sistema de animaciones
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame
     */
    update(deltaTime) {
        this.frameCounter++;
        const entities = this.getEntities();

        for (const entityId of entities) {
            // Cachear componentes una sola vez al inicio del loop
            const render = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.RENDER);
            const animation = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.ANIMATION);
            const combat = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.COMBAT);
            const input = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.INPUT);
            const combo = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.COMBO);

            if (!render || !render.mesh || !animation) continue;

            const mesh = render.mesh;

            // Actualizar LOD si está disponible
            if (this.lodManager) {
                this.lodManager.updateLOD(entityId, render, animation);
            }

            // Verificar LOD update frequency si está configurado
            let shouldUpdate = true;
            if (this.lodManager && animation) {
                animation.updateFrequency = animation.updateFrequency || 1;
                shouldUpdate = (this.frameCounter % animation.updateFrequency === 0);
            }

            if (!shouldUpdate) continue;

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

            // Verificar si acciones de combate terminaron (usando método extraído)
            if (mesh.userData.combatAction) {
                const action = mesh.userData.combatAction;
                // Usar componentes ya cacheados
                this.updateCombatAction(entityId, combat, input, animation, mesh, action);
            }

            // Verificar si estamos en modo de prueba y si la animación terminó
            if (mesh.userData.isTestingAnimation) {
                const testAction = mesh.userData.currentAction;
                if (testAction) {
                    const testClip = testAction.getClip();
                    const progress = testClip.duration > 0 ? testAction.time / testClip.duration : 1.0;

                    // Si la animación terminó, limpiar el flag y volver al estado normal
                    if (progress >= 1.0 || !testAction.isRunning()) {
                        mesh.userData.isTestingAnimation = false;
                        mesh.userData.testAnimationName = null;

                        // Volver al estado idle para que el sistema normal retome
                        if (animation) {
                            animation.currentState = ANIMATION_MIXER.defaultState;
                        }
                    } else {
                        // Aún se está reproduciendo, no interrumpir
                        continue;
                    }
                } else {
                    // No hay acción, limpiar flag
                    mesh.userData.isTestingAnimation = false;
                    mesh.userData.testAnimationName = null;
                }
            }

            // Reproducir animación según estado
            const clips = mesh.userData.animationClips;
            if (clips) {
                // Resolver nombre de animación usando componentes cacheados cuando sea posible
                const animationName = this.resolveAnimationName(entityId, animation.currentState, combo, combat);
                const stateToUse = animation.currentState;

                // Si la animación existe en los clips cargados, reproducirla
                // IMPORTANTE: Usar animationName (resuelto) para que funcione con animaciones direccionales
                if (animationName && clips[animationName]) {
                    this.playAnimation(mixer, clips, animationName, mesh);
                } else if (clips[ANIMATION_MIXER.defaultState]) {
                    // Fallback: usar combat_stance si no hay animación específica
                    this.playAnimation(mixer, clips, ANIMATION_MIXER.defaultState, mesh);
                }
            }
        }
    }
}

