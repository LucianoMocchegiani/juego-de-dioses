/**
 * Sistema de Input
 * 
 * Procesa input del teclado y mouse y actualiza componentes de Input.
 */
import { System } from '../system.js';
import { ECS_CONSTANTS } from '../../config/ecs-constants.js';
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';
import { COMBAT_ACTIONS } from '../../config/combat-actions-config.js';
import { InputActionChecker } from '../helpers/input/input-action-checker.js';
import { MovementDirectionCalculator } from '../helpers/input/movement-direction-calculator.js';
import { JumpHandler } from '../helpers/input/jump-handler.js';
import { CombatInputProcessor } from '../helpers/input/combat-input-processor.js';

export class InputSystem extends System {
    constructor(inputManager, cameraController = null) {
        super();
        this.inputManager = inputManager;
        this.cameraController = cameraController; // Referencia al CameraController para obtener rotación vertical
        this.requiredComponents = [
            ECS_CONSTANTS.COMPONENT_NAMES.INPUT,
            ECS_CONSTANTS.COMPONENT_NAMES.PHYSICS
        ];
        this.priority = 0; // Ejecutar primero
        
        // Crear helpers especializados
        this.inputActionChecker = new InputActionChecker(inputManager, ANIMATION_CONSTANTS);
        this.movementDirectionCalculator = new MovementDirectionCalculator(cameraController, ANIMATION_CONSTANTS);
        this.jumpHandler = new JumpHandler(inputManager);
        this.combatInputProcessor = new CombatInputProcessor(inputManager, this.inputActionChecker);
    }

    /**
     * Verificar si una acción está activa basada en el mapa de input
     * Delega a InputActionChecker helper
     * @param {string} actionName - Nombre de la acción en INPUT_MAP
     * @param {Object} input - Componente de input (opcional, para verificar teclas ya procesadas)
     * @returns {boolean}
     */
    checkAction(actionName, input) {
        return this.inputActionChecker.checkAction(actionName, input);
    }

    /**
     * Actualizar sistema de input
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame
     */
    update(_deltaTime) {
        const entities = this.getEntities();

        for (const entityId of entities) {
            const input = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.INPUT);
            const physics = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.PHYSICS);
            const combat = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.COMBAT);

            if (!input || !physics) continue;

            // Limpiar estados de frame anterior
            input.clearFrame();

            // Actualizar desde InputManager
            const keys = this.inputManager.getKeysPressed();
            const keysDown = this.inputManager.getKeysDown();
            const keysUp = this.inputManager.getKeysUp();

            // Actualizar teclas presionadas en el componente
            for (const key of keys) {
                input.pressKey(key);
            }

            // Actualizar teclas down/up
            for (const key of keysDown) {
                input.pressKey(key);
            }

            for (const key of keysUp) {
                input.releaseKey(key);
            }

            // Verificar si hay acción activa que bloquea movimiento
            let shouldBlockMovement = false;
            if (combat && combat.activeAction) {
                const actionConfig = COMBAT_ACTIONS[combat.activeAction];
                // Bloquear movimiento si la acción NO tiene hasMovement: true
                if (!actionConfig || !actionConfig.hasMovement) {
                    shouldBlockMovement = true;
                }
            }

            // Obtener rotación de la cámara desde RenderComponent
            const render = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.RENDER);
            const cameraRotation = render && render.rotationY !== undefined ? render.rotationY : 0;

            // Calcular dirección de movimiento solo si no está bloqueado
            if (!shouldBlockMovement) {
                // Usar MovementDirectionCalculator para calcular dirección
                const moveDirection = this.movementDirectionCalculator.calculateMovementDirection(
                    input, physics, this.inputActionChecker, cameraRotation
                );
                input.moveDirection.x = moveDirection.x;
                input.moveDirection.y = moveDirection.y;
                input.moveDirection.z = moveDirection.z;
            } else {
                // Bloquear movimiento: dejar moveDirection en 0
                input.moveDirection.x = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;
                input.moveDirection.y = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;
                if (!physics.isFlying) {
                    input.moveDirection.z = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;
                } else {
                    input.moveDirection.z = 0;
                }
            }

            // Agacharse (verificar antes de correr para que no pueda correr agachado)
            input.wantsToCrouch = this.checkAction('crouch');
            
            // Correr: solo funciona hacia adelante (W) y NO cuando está agachado
            // Si se presiona Shift + S/A/D, caminar normalmente, no correr
            // Si está agachado, no puede correr
            const wantsToRun = this.checkAction('run');
            const isMovingForward = this.checkAction('moveForward');
            input.isRunning = wantsToRun && isMovingForward && !input.wantsToCrouch; // Solo correr si Shift + W y NO está agachado

            // Aplicar movimiento a física solo si no está bloqueado
            if (!shouldBlockMovement) {
                // Resetear aceleración antes de aplicar nuevo input
                physics.acceleration.x = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;
                physics.acceleration.y = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;
                if (physics.isFlying) {
                    physics.acceleration.z = 0; // Resetear aceleración vertical en vuelo
                }

                // Aplicar movimiento a física
                if (physics.isFlying) {
                    // En vuelo: movimiento 3D basado en dirección de la cámara (solo si hay input)
                    // Como un juego de aviones: solo se mueve cuando presionas WASD
                    if (input.moveDirection.x !== 0 || input.moveDirection.y !== 0 || input.moveDirection.z !== 0) {
                        const speed = physics.flySpeed;
                        physics.acceleration.x = input.moveDirection.x * speed;
                        physics.acceleration.y = input.moveDirection.y * speed;
                        physics.acceleration.z = input.moveDirection.z * speed; // Movimiento vertical basado en dirección de cámara
                    }
                    // Si no hay input, la aceleración ya está en 0 (reseteada arriba) y la fricción frenará la velocidad
                } else if (input.moveDirection.x !== 0 || input.moveDirection.y !== 0) {
                    // Movimiento normal (no volando): solo horizontal
                    let speed = input.isRunning ? ANIMATION_CONSTANTS.INPUT.RUN_SPEED : ANIMATION_CONSTANTS.INPUT.WALK_SPEED;
                    
                    // Reducir velocidad si está agachado (aplicar multiplicador)
                    if (input.wantsToCrouch) {
                        speed *= ANIMATION_CONSTANTS.INPUT.CROUCH_SPEED_MULTIPLIER;
                    }
                    
                    physics.acceleration.x = input.moveDirection.x * speed;
                    physics.acceleration.y = input.moveDirection.y * speed;
                }
            } else {
                // Si está bloqueado, resetear aceleración a 0
                physics.acceleration.x = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;
                physics.acceleration.y = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;
                if (physics.isFlying) {
                    physics.acceleration.z = 0;
                }
            }

            // Saltar - Sistema de triple salto para activar vuelo
            const currentTime = performance.now();
            this.jumpHandler.processJump(input, physics, currentTime);

            // Combate y Acciones - Usar CombatInputProcessor
            this.combatInputProcessor.processCombatInputs(input);
        }
    }
}

