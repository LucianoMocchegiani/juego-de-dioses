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
            
            // Obtener rotación de la cámara desde RenderComponent
            const render = this.ecs.getComponent(entityId, 'Render');
            const cameraRotation = render && render.rotationY !== undefined ? render.rotationY : 0;
            
            // Calcular dirección de movimiento en espacio local (relativo a la cámara)
            // En espacio local: X = izquierda/derecha, Y = adelante/atrás
            let localX = 0;
            let localY = 0;
            
            if (input.isKeyPressed('KeyW') || input.isKeyPressed('ArrowUp')) {
                localY -= 1; // Adelante (negativo Y en espacio local)
            }
            if (input.isKeyPressed('KeyS') || input.isKeyPressed('ArrowDown')) {
                localY += 1; // Atrás (positivo Y en espacio local)
            }
            if (input.isKeyPressed('KeyA') || input.isKeyPressed('ArrowLeft')) {
                localX -= 1; // Izquierda (negativo X en espacio local)
            }
            if (input.isKeyPressed('KeyD') || input.isKeyPressed('ArrowRight')) {
                localX += 1; // Derecha (positivo X en espacio local)
            }
            
            // Rotar dirección local según la rotación de la cámara
            // La rotación de la cámara es el ángulo alrededor del eje Y (horizontal)
            // En nuestro sistema: Y negativo = adelante, Y positivo = atrás
            // El ángulo de la cámara representa la dirección en la que mira
            // Necesitamos rotar el vector de movimiento para que sea relativo a esa dirección
            // Como Y negativo es adelante, necesitamos ajustar: el vector (0, -1) rotado por angle
            // debería resultar en un vector que apunte en la dirección 'angle'
            const cos = Math.cos(cameraRotation);
            const sin = Math.sin(cameraRotation);
            // Rotar vector (localX, localY) por el ángulo cameraRotation
            // Pero invertimos el signo de Y en la rotación porque Y negativo es adelante
            input.moveDirection.x = localX * cos - (-localY) * sin;
            input.moveDirection.y = localX * sin + (-localY) * cos;
            // Ahora invertimos Y de vuelta para mantener Y negativo como adelante
            input.moveDirection.y = -input.moveDirection.y;
            input.moveDirection.z = 0;
            
            // Normalizar dirección solo si hay movimiento
            const length = Math.sqrt(
                input.moveDirection.x ** 2 + 
                input.moveDirection.y ** 2
            );
            if (length > 0.01) { // Umbral pequeño para evitar normalización cuando es casi cero
                input.moveDirection.x /= length;
                input.moveDirection.y /= length;
            } else {
                input.moveDirection.x = 0;
                input.moveDirection.y = 0;
            }
            
            // Correr
            input.isRunning = input.isKeyPressed('ShiftLeft') || input.isKeyPressed('ShiftRight');
            
            // Resetear aceleración horizontal antes de aplicar nuevo input
            physics.acceleration.x = 0;
            physics.acceleration.y = 0; // Y es adelante/atrás, no Z
            // Nota: acceleration.z se maneja en PhysicsSystem (gravedad)
            
            // Aplicar movimiento a física solo si hay dirección de movimiento
            if (input.moveDirection.x !== 0 || input.moveDirection.y !== 0) {
                const speed = input.isRunning ? 30 : 15; // celdas por segundo (aumentado a 15/30)
                physics.acceleration.x = input.moveDirection.x * speed;
                physics.acceleration.y = input.moveDirection.y * speed; // Y para adelante/atrás
            }
            
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

