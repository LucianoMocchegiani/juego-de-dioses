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
import { ECS_CONSTANTS } from '../../config/ecs-constants.js';
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';
import { AnimationLoader } from '../helpers/animation/animation-loader.js';
import { AnimationResolver } from '../helpers/animation/animation-resolver.js';
import { AnimationPlayer } from '../helpers/animation/animation-player.js';
import { CombatAnimationHandler } from '../helpers/animation/combat-animation-handler.js';

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

        // Crear helpers especializados
        this.animationLoader = new AnimationLoader();
        this.animationResolver = new AnimationResolver(this.stateConfigMap);
        // Nota: animationPlayer y combatHandler se inicializarán después de que ecs esté disponible
        this.animationPlayer = null;
        this.combatHandler = new CombatAnimationHandler();
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

            // Cargar todas las animaciones usando AnimationLoader
            const animations = {};
            for (const [animName, file] of Object.entries(ANIMATION_FILES)) {
                // Cargar solo si es un string válido (ruta de archivo)
                // Excluir comentarios o valores que no sean rutas (ej: strings que indican que no existe)
                if (typeof file === 'string' && file.startsWith('biped/male/animations/')) {
                    const clips = await this.animationLoader.loadAnimation(file);
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
     * Inicializar helpers que requieren ECS (después de que ecs esté disponible)
     * Se llama automáticamente cuando el sistema se registra en el ECS
     */
    setECSManager(ecs) {
        super.setECSManager(ecs);
        // Inicializar animationPlayer después de que ecs esté disponible
        if (ecs && !this.animationPlayer) {
            this.animationPlayer = new AnimationPlayer(this.animationResolver, ecs);
        }
    }

    /**
     * Reproducir animación según estado
     * Delega a AnimationPlayer helper
     * @param {THREE.AnimationMixer} mixer - AnimationMixer
     * @param {Object} clips - Objeto con clips de animación por estado
     * @param {string} state - Estado actual de animación
     * @param {THREE.Object3D} mesh - Mesh del modelo
     */
    playAnimation(mixer, clips, state, mesh) {
        if (!this.animationPlayer) {
            return; // ECS aún no está disponible
        }

        // Obtener componentes necesarios para el resolver
        const entityId = mesh.userData.entityId;
        const combo = entityId ? this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.COMBO) : null;
        const combat = entityId ? this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.COMBAT) : null;

        // Delegar a AnimationPlayer
        this.animationPlayer.playAnimation(mixer, clips, state, mesh, this.stateConfigMap, combo, combat);
    }

    /**
     * Reproducir animación directamente por nombre
     * 
     * Método público para reproducir animaciones por nombre desde interfaces externas
     * (ej: interfaz de prueba de animaciones).
     * Delega a AnimationPlayer helper.
     * 
     * @param {number} entityId - ID de la entidad
     * @param {string} animationName - Nombre de la animación (key de ANIMATION_FILES)
     * @returns {boolean} True si se reprodujo correctamente, False si hubo error
     */
    playAnimationByName(entityId, animationName) {
        if (!this.animationPlayer) {
            return false; // ECS aún no está disponible
        }
        return this.animationPlayer.playAnimationByName(entityId, animationName);
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

            // Verificar si acciones de combate terminaron (usando CombatAnimationHandler)
            if (mesh.userData.combatAction) {
                const action = mesh.userData.combatAction;
                // Usar componentes ya cacheados - delegar a CombatAnimationHandler
                const result = this.combatHandler.updateCombatAction(combat, input, animation, mesh, action);
                // El helper maneja cleanup internamente si finished = true
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
                // Resolver nombre de animación usando AnimationResolver con componentes cacheados
                // Obtener input si es necesario para direcciones (walk, crouch_walk, swim)
                let inputForResolver = null;
                if (animation.currentState === 'walk' || animation.currentState === 'crouch_walk' || animation.currentState === 'swim') {
                    inputForResolver = input;
                }
                const animationName = this.animationResolver.resolveAnimationName(
                    animation.currentState,
                    combo,
                    combat,
                    inputForResolver
                );

                // Si la animación existe en los clips cargados, reproducirla
                // IMPORTANTE: Pasar animation.currentState (ID del estado) para tracking, no animationName
                // El helper playAnimation manejará la resolución del nombre si es necesario
                if (animationName && clips[animationName]) {
                    // Si el nombre de animación resuelto existe en clips, pasarlo directamente
                    // Pero el helper necesita el stateId para tracking, así que usamos animation.currentState
                    this.playAnimation(mixer, clips, animation.currentState, mesh);
                } else if (clips[ANIMATION_MIXER.defaultState]) {
                    // Fallback: usar combat_stance si no hay animación específica
                    this.playAnimation(mixer, clips, ANIMATION_MIXER.defaultState, mesh);
                }
            }
        }
    }
}

