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
import { StateConfig } from '../animation/states/state-config.js';

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

        // Crear mapa de estado → StateConfig para acceder a propiedades de configuración
        // (como interruptOnInputRelease) de forma escalable
        this.stateConfigMap = new Map();

        for (const stateConfigData of ANIMATION_STATES) {
            const stateConfig = new StateConfig(stateConfigData);
            this.stateToAnimationMap.set(stateConfig.id, stateConfig.animation);
            this.stateConfigMap.set(stateConfig.id, stateConfig);
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
        // Si el estado no tiene animación, no hacer nada
        if (!clips[state]) {
            return;
        }

        const clip = clips[state];
        const currentAction = mesh.userData.currentAction;
        const currentState = mesh.userData.currentAnimationState;

        // Verificar si el estado cambió
        const stateChanged = currentState !== state;

        // Si ya está reproduciendo esta misma animación Y el estado no cambió, no hacer nada
        if (currentAction && !stateChanged && currentAction.isRunning()) {
            return;
        }

        // LÓGICA DE PROTECCIÓN DE INTERRUPCIÓN GENERALIZADA
        // Si el estado actual tiene preventInterruption (ej: ataques), no permitir NINGÚN cambio de estado
        // hasta que la animación termine (isAttacking sea false).
        if (stateChanged && currentState && mesh.userData.isAttacking) {
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
        const stateConfig = this.stateConfigMap.get(state);
        const isOneShot = stateConfig ? stateConfig.isOneShot : false;

        if (isOneShot) {
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = false;
            mesh.userData.attackAction = action;
            mesh.userData.isAttacking = true;
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

            // Verificar si la animación de ataque terminó y transicionar a combat_stance
            if (mesh.userData.attackAction) {
                const attackAction = mesh.userData.attackAction;
                const attackDuration = attackAction.getClip().duration;

                // Cuando el ataque esté cerca de terminar (último 15%), iniciar transición a combat_stance
                if (attackAction.isRunning() && attackAction.time >= attackDuration * ANIMATION_MIXER.attackCompletionThreshold) {
                    const clips = mesh.userData.animationClips;
                    if (clips && clips[ANIMATION_MIXER.defaultState]) {
                        // Transicionar directamente a combat_stance sin cambiar el estado del componente
                        this.playAnimation(mixer, clips, ANIMATION_MIXER.defaultState, mesh);
                    }
                }

                // Cuando el ataque termine completamente, limpiar flags y cambiar estado
                if (!attackAction.isRunning() && attackAction.time >= attackDuration) {
                    mesh.userData.isAttacking = false;
                    mesh.userData.attackAction = null;

                    // Cambiar estado del componente a idle para que combat_stance se mantenga
                    const entityId = mesh.userData.entityId;
                    if (entityId) {
                        const anim = this.ecs.getComponent(entityId, 'Animation');
                        if (anim) {
                            anim.currentState = 'idle';
                        }
                    }
                }
            }

            // Reproducir animación según estado
            const clips = mesh.userData.animationClips;
            if (clips) {
                // Prioridad 1: Animación de combo (si hay combo activo)
                // Prioridad 2: Animación de combate (si hay acción de combate)
                // Prioridad 3: Resolver por estado normal
                let animationName = null;
                if (animation.comboAnimationName) {
                    animationName = animation.comboAnimationName;
                } else if (animation.combatAnimationName) {
                    animationName = animation.combatAnimationName;
                } else {
                    // Obtener nombre de animación desde configuración
                    animationName = this.getAnimationNameForState(animation.currentState);
                }

                // Si la animación existe en los clips cargados, reproducirla
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

