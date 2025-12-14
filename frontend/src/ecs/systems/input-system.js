/**
 * Sistema de Input
 * 
 * Procesa input del teclado y mouse y actualiza componentes de Input.
 */
import { System } from '../system.js';
import { INPUT_MAP } from '../../config/input-map-config.js';
import { ECS_CONSTANTS } from '../../config/ecs-constants.js';
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';

export class InputSystem extends System {
    constructor(inputManager) {
        super();
        this.inputManager = inputManager;
        this.requiredComponents = [
            ECS_CONSTANTS.COMPONENT_NAMES.INPUT,
            ECS_CONSTANTS.COMPONENT_NAMES.PHYSICS
        ];
        this.priority = 0; // Ejecutar primero
    }

    /**
     * Verificar si una acción está activa basada en el mapa de input
     * @param {string} actionName - Nombre de la acción en INPUT_MAP
     * @param {Object} input - Componente de input (opcional, para verificar teclas ya procesadas)
     * @returns {boolean}
     */
    checkAction(actionName, input) {
        const mappings = INPUT_MAP[actionName];
        if (!mappings) return false;

        for (const mapping of mappings) {
            // Verificar combinaciones (ej: "Control+ClickLeft")
            if (mapping.includes('+')) {
                const keys = mapping.split('+');
                let allPressed = true;

                for (const key of keys) {
                    if (key === 'ClickLeft') {
                        if (!this.inputManager.isMouseButtonDown(ANIMATION_CONSTANTS.INPUT.MOUSE_BUTTONS.LEFT)) allPressed = false;
                    } else if (key === 'ClickRight') {
                        if (!this.inputManager.isMouseButtonDown(ANIMATION_CONSTANTS.INPUT.MOUSE_BUTTONS.RIGHT)) allPressed = false;
                    } else if (key === 'Control') {
                        const isCtrl = this.inputManager.isKeyPressed('ControlLeft') || this.inputManager.isKeyPressed('ControlRight');
                        if (actionName === 'specialAttack' && !isCtrl) {
                            // console.log('DEBUG: Control check FAILED. Keys:', Array.from(this.inputManager.keysPressed));
                        }
                        if (!isCtrl) {
                            allPressed = false;
                        } else if (actionName === 'specialAttack') {
                            // console.log('DEBUG: Control check PASSED');
                        }
                    } else if (key === 'Shift') {
                        if (!this.inputManager.isKeyPressed('ShiftLeft') && !this.inputManager.isKeyPressed('ShiftRight')) allPressed = false;
                    } else if (key === 'Alt') {
                        if (!this.inputManager.isKeyPressed('AltLeft') && !this.inputManager.isKeyPressed('AltRight')) allPressed = false;
                    } else {
                        // Tecla normal
                        if (!this.inputManager.isKeyPressed(key)) allPressed = false;
                    }
                }

                if (allPressed) {
                    return true;
                }
            }
            // Verificar clicks simples
            else if (mapping === 'ClickLeft') {
                if (this.inputManager.isMouseButtonDown(ANIMATION_CONSTANTS.INPUT.MOUSE_BUTTONS.LEFT)) return true;
            } else if (mapping === 'ClickRight') {
                if (this.inputManager.isMouseButtonDown(ANIMATION_CONSTANTS.INPUT.MOUSE_BUTTONS.RIGHT)) return true;
            }
            // Verificar teclas normales
            else {
                if (this.inputManager.isKeyPressed(mapping)) return true;
            }
        }

        return false;
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

            // Obtener rotación de la cámara desde RenderComponent
            const render = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.RENDER);
            const cameraRotation = render && render.rotationY !== undefined ? render.rotationY : 0;

            // Calcular dirección de movimiento en espacio local (relativo a la cámara)
            // En espacio local: X = izquierda/derecha, Y = adelante/atrás
            let localX = 0;
            let localY = 0;

            if (this.checkAction('moveForward')) {
                localY += ANIMATION_CONSTANTS.INPUT.DIRECTION.FORWARD; // Adelante (negativo Y en espacio local)
            }
            if (this.checkAction('moveBackward')) {
                localY += ANIMATION_CONSTANTS.INPUT.DIRECTION.BACKWARD; // Atrás (positivo Y en espacio local)
            }
            if (this.checkAction('moveLeft')) {
                localX += ANIMATION_CONSTANTS.INPUT.DIRECTION.LEFT; // Izquierda (negativo X en espacio local)
            }
            if (this.checkAction('moveRight')) {
                localX += ANIMATION_CONSTANTS.INPUT.DIRECTION.RIGHT; // Derecha (positivo X en espacio local)
            }

            // Rotar dirección local según la rotación de la cámara
            const cos = Math.cos(cameraRotation);
            const sin = Math.sin(cameraRotation);

            // Rotar vector (localX, localY) por el ángulo cameraRotation
            // Invertimos el signo de Y en la rotación porque Y negativo es adelante
            input.moveDirection.x = localX * cos - (-localY) * sin;
            input.moveDirection.y = localX * sin + (-localY) * cos;
            // Invertimos Y de vuelta
            input.moveDirection.y = -input.moveDirection.y;
            input.moveDirection.z = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;

            // Normalizar dirección solo si hay movimiento
            const length = Math.sqrt(
                input.moveDirection.x ** 2 +
                input.moveDirection.y ** 2
            );
            if (length > ANIMATION_CONSTANTS.INPUT.DIRECTION_NORMALIZE_THRESHOLD) {
                input.moveDirection.x /= length;
                input.moveDirection.y /= length;
            } else {
                input.moveDirection.x = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;
                input.moveDirection.y = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;
            }

            // Correr
            input.isRunning = this.checkAction('run');

            // Resetear aceleración horizontal antes de aplicar nuevo input
            physics.acceleration.x = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;
            physics.acceleration.y = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;

            // Aplicar movimiento a física solo si hay dirección de movimiento
            if (input.moveDirection.x !== 0 || input.moveDirection.y !== 0) {
                const speed = input.isRunning ? ANIMATION_CONSTANTS.INPUT.RUN_SPEED : ANIMATION_CONSTANTS.INPUT.WALK_SPEED;
                physics.acceleration.x = input.moveDirection.x * speed;
                physics.acceleration.y = input.moveDirection.y * speed;
            }

            // Saltar (solo si está en el suelo)
            // Para salto usamos isKeyDown (solo primer frame) que ya está en input.wantsToJump si se procesara así,
            // pero aquí verificamos la acción directamente.
            // Nota: checkAction usa isKeyPressed (mantenido) o isMouseButtonDown.
            // Para salto necesitamos "just pressed".
            // Podemos verificar si la tecla de salto está en keysDown del inputManager
            const jumpKeys = INPUT_MAP['jump'];
            let jumpJustPressed = false;
            for (const key of jumpKeys) {
                if (this.inputManager.isKeyDown(key)) jumpJustPressed = true;
            }

            if (jumpJustPressed && physics.isGrounded) {
                input.wantsToJump = true;
            }

            // Agacharse
            input.wantsToCrouch = this.checkAction('crouch');

            // Combate y Acciones
            // Importante: Orden de prioridad para evitar solapamiento de teclas

            // 1. Defensas
            // Parry: mantener presionado
            if (this.checkAction('parry')) {
                input.wantsToParry = true;
            } else {
                input.wantsToParry = false;
            }
            
            // Dodge: solo un press (isKeyDown), no mantener presionado
            const dodgeKeys = INPUT_MAP['dodge'];
            let dodgeJustPressed = false;
            for (const key of dodgeKeys) {
                if (this.inputManager.isKeyDown(key)) {
                    dodgeJustPressed = true;
                    break;
                }
            }
            // IMPORTANTE: Resetear wantsToDodge si no se presiona en este frame
            // Esto asegura que solo se active una vez por press
            input.wantsToDodge = dodgeJustPressed;

            // 2. Ataques Especiales / Combinados
            // Verificar antes que el ataque normal porque usan modificadores (Shift, Ctrl, Alt)
            if (this.checkAction('specialAttack')) {
                input.wantsToSpecialAttack = true;
            } else if (this.checkAction('chargedAttack')) {
                input.wantsToChargedAttack = true;
            } else if (this.checkAction('heavyAttack')) {
                input.wantsToHeavyAttack = true;
            } else if (this.checkAction('attack')) {
                // Solo si no hay ninguno de los anteriores
                input.wantsToAttack = true;
            }

            // Agarrar
            if (this.checkAction('grab')) {
                input.wantsToGrab = true;
            }
        }
    }
}

