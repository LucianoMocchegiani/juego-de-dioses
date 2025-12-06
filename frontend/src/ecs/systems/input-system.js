/**
 * Sistema de Input
 * 
 * Procesa input del teclado y mouse y actualiza componentes de Input.
 */
import { System } from '../system.js';

export class InputSystem extends System {
    constructor(inputManager) {
        super();
        this.inputManager = inputManager;
        this.requiredComponents = ['Input', 'Physics'];
        this.priority = 0; // Ejecutar primero
    }
    
    /**
     * Actualizar sistema de input
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame
     */
    update(deltaTime) {
        const entities = this.getEntities();
        
        for (const entityId of entities) {
            const input = this.ecs.getComponent(entityId, 'Input');
            const physics = this.ecs.getComponent(entityId, 'Physics');
            
            if (!input || !physics) continue;
            
            // Limpiar estados de frame anterior
            input.clearFrame();
            
            // Actualizar desde InputManager
            const keys = this.inputManager.getKeysPressed();
            const keysDown = this.inputManager.getKeysDown();
            const keysUp = this.inputManager.getKeysUp();
            
            // Actualizar teclas presionadas
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
            
            // Calcular dirección de movimiento
            input.moveDirection.x = 0;
            input.moveDirection.y = 0;
            input.moveDirection.z = 0;
            
            if (input.isKeyPressed('KeyW') || input.isKeyPressed('ArrowUp')) {
                input.moveDirection.z -= 1; // Adelante
            }
            if (input.isKeyPressed('KeyS') || input.isKeyPressed('ArrowDown')) {
                input.moveDirection.z += 1; // Atrás
            }
            if (input.isKeyPressed('KeyA') || input.isKeyPressed('ArrowLeft')) {
                input.moveDirection.x -= 1; // Izquierda
            }
            if (input.isKeyPressed('KeyD') || input.isKeyPressed('ArrowRight')) {
                input.moveDirection.x += 1; // Derecha
            }
            
            // Normalizar dirección
            const length = Math.sqrt(
                input.moveDirection.x ** 2 + 
                input.moveDirection.y ** 2 + 
                input.moveDirection.z ** 2
            );
            if (length > 0) {
                input.moveDirection.x /= length;
                input.moveDirection.y /= length;
                input.moveDirection.z /= length;
            }
            
            // Correr
            input.isRunning = input.isKeyPressed('ShiftLeft') || input.isKeyPressed('ShiftRight');
            
            // Aplicar movimiento a física
            const speed = input.isRunning ? 3 : 1.5; // celdas por segundo
            physics.acceleration.x = input.moveDirection.x * speed;
            physics.acceleration.z = input.moveDirection.z * speed;
            
            // Saltar (solo si está en el suelo)
            if (input.isKeyDown('Space') && physics.isGrounded) {
                input.wantsToJump = true;
            }
            
            // Agacharse
            input.wantsToCrouch = input.isKeyPressed('ControlLeft') || 
                                 input.isKeyPressed('ControlRight') ||
                                 input.isKeyPressed('KeyC');
            
            // Golpear
            if (this.inputManager.isMouseButtonDown(0)) { // Click izquierdo
                input.wantsToAttack = true;
            }
            
            // Agarrar
            if (this.inputManager.isMouseButtonDown(2) || input.isKeyDown('KeyE')) { // Click derecho o E
                input.wantsToGrab = true;
            }
        }
    }
}

