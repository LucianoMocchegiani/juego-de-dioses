/**
 * Sistema de Física
 * 
 * Aplica física (gravedad, velocidad, aceleración) a entidades con componentes Physics y Position.
 */
import { System } from '../system.js';

export class PhysicsSystem extends System {
    constructor(options = {}) {
        super();
        this.requiredComponents = ['Physics', 'Position'];
        this.priority = 1; // Ejecutar después de InputSystem (priority 0)
        
        /**
         * Gravedad (en celdas por segundo²)
         * @type {number}
         */
        this.gravity = options.gravity !== undefined ? options.gravity : -9.8;
        
        /**
         * Timestep fijo para física (en segundos)
         * @type {number}
         */
        this.fixedTimestep = options.fixedTimestep !== undefined ? options.fixedTimestep : 1/60;
        
        /**
         * Acumulador para timestep fijo
         * @type {number}
         */
        this.accumulator = 0;
    }
    
    /**
     * Actualizar sistema de física
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame (en segundos)
     */
    update(deltaTime) {
        this.accumulator += deltaTime;
        
        // Ejecutar física con timestep fijo
        while (this.accumulator >= this.fixedTimestep) {
            this.updatePhysics(this.fixedTimestep);
            this.accumulator -= this.fixedTimestep;
        }
    }
    
    /**
     * Actualizar física con timestep fijo
     * @param {number} timestep - Timestep fijo
     */
    updatePhysics(timestep) {
        const entities = this.getEntities();
        
        for (const entityId of entities) {
            const physics = this.ecs.getComponent(entityId, 'Physics');
            const position = this.ecs.getComponent(entityId, 'Position');
            const input = this.ecs.getComponent(entityId, 'Input');
            
            if (!physics || !position) continue;
            
            // Aplicar salto (si tiene componente Input)
            // Z es altura, Y es adelante/atrás, X es izquierda/derecha
            if (input && input.wantsToJump && physics.isGrounded) {
                physics.velocity.z = 5; // Velocidad de salto en celdas/segundo (Z es altura)
                physics.isGrounded = false;
                input.wantsToJump = false; // Resetear
            }
            
            // Aplicar dodge (esquivar) - Impulso de movimiento horizontal
            if (input && input.wantsToDodge && physics.isGrounded) {
                // Velocidad de dodge en celdas/segundo
                const dodgeSpeed = 20; // Más rápido que correr normal
                
                // Si hay dirección de movimiento, usar esa dirección
                // Si no, usar dirección hacia adelante (basada en moveDirection que ya está calculada)
                if (input.moveDirection.x !== 0 || input.moveDirection.y !== 0) {
                    // Usar la dirección de movimiento actual
                    physics.velocity.x = input.moveDirection.x * dodgeSpeed;
                    physics.velocity.y = input.moveDirection.y * dodgeSpeed;
                } else {
                    // Si no hay movimiento, esquivar hacia adelante (dirección negativa Y en espacio local)
                    // Necesitamos obtener la rotación de la cámara para calcular dirección adelante
                    const render = this.ecs.getComponent(entityId, 'Render');
                    const cameraRotation = render && render.rotationY !== undefined ? render.rotationY : 0;
                    const cos = Math.cos(cameraRotation);
                    const sin = Math.sin(cameraRotation);
                    // Adelante es negativo Y en espacio local, rotado por la cámara
                    physics.velocity.x = -sin * dodgeSpeed;
                    physics.velocity.y = -cos * dodgeSpeed;
                }
                
                input.wantsToDodge = false; // Resetear para que solo se active una vez
            }
            
            // Aplicar gravedad (Z es altura)
            if (physics.useGravity && !physics.isGrounded) {
                physics.acceleration.z += this.gravity;
            }
            
            // Actualizar velocidad con aceleración
            physics.velocity.x += physics.acceleration.x * timestep; // Izquierda/derecha
            physics.velocity.y += physics.acceleration.y * timestep; // Adelante/atrás
            physics.velocity.z += physics.acceleration.z * timestep; // Arriba/abajo
            
            // Aplicar fricción (solo horizontal: X e Y)
            const friction = physics.isGrounded ? physics.groundFriction : physics.airFriction;
            physics.velocity.x *= friction; // Izquierda/derecha
            physics.velocity.y *= friction; // Adelante/atrás
            
            // Limitar velocidad máxima
            if (Math.abs(physics.velocity.x) > physics.maxVelocity.x) {
                physics.velocity.x = Math.sign(physics.velocity.x) * physics.maxVelocity.x;
            }
            if (Math.abs(physics.velocity.y) > physics.maxVelocity.y) {
                physics.velocity.y = Math.sign(physics.velocity.y) * physics.maxVelocity.y;
            }
            if (Math.abs(physics.velocity.z) > physics.maxVelocity.z) {
                physics.velocity.z = Math.sign(physics.velocity.z) * physics.maxVelocity.z;
            }
            
            // Actualizar posición con velocidad
            position.x += physics.velocity.x * timestep; // Izquierda/derecha
            position.y += physics.velocity.y * timestep; // Adelante/atrás
            position.z += physics.velocity.z * timestep; // Arriba/abajo
            
            // Resetear aceleración
            physics.resetAcceleration();
        }
    }
}

