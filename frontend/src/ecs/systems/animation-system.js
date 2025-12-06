/**
 * Sistema de Animaciones
 * 
 * Determina el estado de animación de las entidades basándose en su input y física.
 */
import { System } from '../system.js';

export class AnimationSystem extends System {
    constructor() {
        super();
        this.requiredComponents = ['Animation', 'Input', 'Physics'];
        this.priority = 2; // Ejecutar después de PhysicsSystem (priority 1) y antes de RenderSystem (priority 3)
    }
    
    /**
     * Actualizar sistema de animaciones
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame
     */
    update(deltaTime) {
        const entities = this.getEntities();
        
        for (const entityId of entities) {
            const animation = this.ecs.getComponent(entityId, 'Animation');
            const input = this.ecs.getComponent(entityId, 'Input');
            const physics = this.ecs.getComponent(entityId, 'Physics');
            
            if (!animation || !input || !physics) continue;
            
            // Determinar estado de animación según prioridad
            // 1. Salto (si está subiendo en Z, que es altura)
            if (physics.velocity.z > 0.1) {
                animation.currentState = 'jump';
            }
            // 2. Agacharse
            else if (input.wantsToCrouch) {
                animation.currentState = 'crouch';
            }
            // 3. Correr (si está corriendo y moviéndose)
            else if (input.isRunning && (input.moveDirection.x !== 0 || input.moveDirection.y !== 0)) {
                animation.currentState = 'run';
            }
            // 4. Caminar (si se está moviendo)
            else if (input.moveDirection.x !== 0 || input.moveDirection.y !== 0) {
                animation.currentState = 'walk';
            }
            // 5. Idle (por defecto)
            else {
                animation.currentState = 'idle';
            }
        }
    }
}

