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
            if (input && input.wantsToJump && physics.isGrounded) {
                physics.velocity.y = 5; // Velocidad de salto en celdas/segundo
                physics.isGrounded = false;
                input.wantsToJump = false; // Resetear
            }
            
            // Aplicar gravedad
            if (physics.useGravity && !physics.isGrounded) {
                physics.acceleration.y += this.gravity;
            }
            
            // Actualizar velocidad con aceleración
            physics.velocity.x += physics.acceleration.x * timestep;
            physics.velocity.y += physics.acceleration.y * timestep;
            physics.velocity.z += physics.acceleration.z * timestep;
            
            // Aplicar fricción
            const friction = physics.isGrounded ? physics.groundFriction : physics.airFriction;
            physics.velocity.x *= friction;
            physics.velocity.z *= friction;
            
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
            position.x += physics.velocity.x * timestep;
            position.y += physics.velocity.y * timestep;
            position.z += physics.velocity.z * timestep;
            
            // Resetear aceleración
            physics.resetAcceleration();
        }
    }
}

