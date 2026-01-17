/**
 * Sistema de Input
 * 
 * Procesa input del teclado y mouse y actualiza componentes de Input.
 */
import { System } from '../system.js';
import { INPUT_MAP } from '../../config/input-map-config.js';
import { ECS_CONSTANTS } from '../../config/ecs-constants.js';
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';
import { COMBAT_ACTIONS } from '../../config/combat-actions-config.js';

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
                // Calcular dirección de movimiento en espacio local (relativo a la cámara)
                // En espacio local: X = izquierda/derecha, Y = adelante/atrás
                // IMPORTANTE: Solo una dirección a la vez - no combinar para movimiento diagonal
                // El movimiento diagonal se maneja con la rotación de la cámara, no combinando teclas
                let localX = 0;
                let localY = 0;

                // Prioridad: W (adelante) > S (atrás) > A (izquierda) > D (derecha)
                // Solo usar la primera tecla presionada, no combinar
                if (this.checkAction('moveForward')) {
                    localY = ANIMATION_CONSTANTS.INPUT.DIRECTION.FORWARD; // Adelante (negativo Y en espacio local)
                } else if (this.checkAction('moveBackward')) {
                    localY = ANIMATION_CONSTANTS.INPUT.DIRECTION.BACKWARD; // Atrás (positivo Y en espacio local)
                } else if (this.checkAction('moveLeft')) {
                    localX = ANIMATION_CONSTANTS.INPUT.DIRECTION.LEFT; // Izquierda (negativo X en espacio local)
                } else if (this.checkAction('moveRight')) {
                    localX = ANIMATION_CONSTANTS.INPUT.DIRECTION.RIGHT; // Derecha (positivo X en espacio local)
                }

                // Si está volando, calcular movimiento en 3D basado en la dirección de la cámara
                if (physics.isFlying) {
                    // Obtener rotación vertical de la cámara
                    const cameraVerticalRotation = this.cameraController ? this.cameraController.rotation.vertical : 0;
                    
                    // Calcular dirección 3D basada en rotación horizontal y vertical de la cámara
                    const cosH = Math.cos(cameraRotation); // Horizontal
                    const sinH = Math.sin(cameraRotation);
                    const cosV = Math.cos(cameraVerticalRotation); // Vertical
                    const sinV = Math.sin(cameraVerticalRotation);
                    
                    // Calcular dirección forward en 3D (incluyendo componente vertical)
                    // Si presiona W (moveForward), se mueve en la dirección que mira la cámara
                    // Nota: localY es negativo para forward (W), positivo para backward (S)
                    if (localY !== 0) {
                        // Dirección forward/backward con componente vertical
                        // forwardX y forwardY apuntan hacia adelante (dirección que mira la cámara)
                        const forwardX = -sinH * cosV;
                        const forwardY = -cosH * cosV;
                        // forwardZ: positivo cuando cámara apunta hacia arriba (sinV > 0), negativo hacia abajo (sinV < 0)
                        const forwardZ = -sinV; // Invertir signo: cuando cámara apunta arriba, queremos subir (Z positivo)
                        
                        // Aplicar dirección forward/backward
                        // localY es negativo para W (forward), positivo para S (backward)
                        input.moveDirection.x = forwardX * -localY; // Invertir localY para que W sea adelante
                        input.moveDirection.y = forwardY * -localY;
                        input.moveDirection.z = forwardZ * -localY; // Vertical: W con cámara arriba = subir
                    } else {
                        input.moveDirection.z = 0;
                    }
                    
                    // Agregar movimiento lateral (izquierda/derecha) - solo horizontal
                    if (localX !== 0) {
                        const rightX = cosH;
                        const rightY = -sinH;
                        input.moveDirection.x += rightX * localX;
                        input.moveDirection.y += rightY * localX;
                    }
                    
                    // Normalizar dirección 3D
                    const length3D = Math.sqrt(
                        input.moveDirection.x ** 2 +
                        input.moveDirection.y ** 2 +
                        input.moveDirection.z ** 2
                    );
                    if (length3D > ANIMATION_CONSTANTS.INPUT.DIRECTION_NORMALIZE_THRESHOLD) {
                        input.moveDirection.x /= length3D;
                        input.moveDirection.y /= length3D;
                        input.moveDirection.z /= length3D;
                    } else {
                        input.moveDirection.x = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;
                        input.moveDirection.y = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;
                        input.moveDirection.z = 0;
                    }
                } else {
                    // Movimiento normal (no volando)
                    const cos = Math.cos(cameraRotation);
                    const sin = Math.sin(cameraRotation);

                    // Rotar vector (localX, localY) por el ángulo cameraRotation
                    // Invertimos el signo de Y en la rotación porque Y negativo es adelante
                    input.moveDirection.x = localX * cos - (-localY) * sin;
                    input.moveDirection.y = localX * sin + (-localY) * cos;
                    // Invertimos Y de vuelta
                    input.moveDirection.y = -input.moveDirection.y;
                    input.moveDirection.z = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;
                }

                // Normalizar dirección solo si NO está volando (en vuelo ya se normalizó en 3D)
                if (!physics.isFlying) {
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
                }
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
            const jumpKeys = INPUT_MAP['jump'];
            let jumpJustPressed = false;
            for (const key of jumpKeys) {
                if (this.inputManager.isKeyDown(key)) jumpJustPressed = true;
            }

            const currentTime = performance.now();
            const JUMP_COMBO_TIMEOUT = 1000; // 1 segundo para mantener el combo

            // Resetear contador si pasó mucho tiempo desde el último salto
            if (currentTime - physics.lastJumpTime > JUMP_COMBO_TIMEOUT) {
                physics.consecutiveJumps = 0;
            }

            if (jumpJustPressed) {
                if (physics.isGrounded) {
                    // Salto normal desde el suelo
                    input.wantsToJump = true;
                    physics.consecutiveJumps = 1;
                    physics.lastJumpTime = currentTime;
                } else if (!physics.isFlying) {
                    // Salto en el aire (aéreo) - solo si no está volando
                    physics.consecutiveJumps++;
                    physics.lastJumpTime = currentTime;
                    
                    // Si llegamos a 3 saltos consecutivos, activar vuelo
                    if (physics.consecutiveJumps >= 3) {
                        physics.isFlying = true;
                        physics.useGravity = false;
                        physics.consecutiveJumps = 0; // Resetear contador
                    } else {
                        // Salto aéreo normal (doble salto)
                        input.wantsToJump = true;
                    }
                }
            }

            // Controles de vuelo - Ya no necesarios, el movimiento se controla con W/S y la cámara

            // Agacharse (ya se estableció arriba antes de verificar correr)

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

