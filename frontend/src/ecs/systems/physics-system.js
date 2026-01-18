/**
 * Sistema de Física
 * 
 * Aplica física (gravedad, velocidad, aceleración) a entidades con componentes Physics y Position.
 * También maneja movimiento de acciones de combate usando configuración centralizada.
 */
import { System } from '../system.js';
import { COMBAT_ACTIONS } from '../../config/combat-actions-config.js';
import { ECS_CONSTANTS } from '../../config/ecs-constants.js';
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';
import { PhysicsTimestepManager } from '../helpers/physics/physics-timestep-manager.js';
import { CombatMovementApplier } from '../helpers/physics/combat-movement-applier.js';
import { PhysicsFrictionApplier } from '../helpers/physics/physics-friction-applier.js';
import { PhysicsVelocityLimiter } from '../helpers/physics/physics-velocity-limiter.js';

export class PhysicsSystem extends System {
    constructor(options = {}) {
        super();
        this.requiredComponents = [
            ECS_CONSTANTS.COMPONENT_NAMES.PHYSICS,
            ECS_CONSTANTS.COMPONENT_NAMES.POSITION
        ];
        this.priority = 1; // Ejecutar después de InputSystem (priority 0)
        
        /**
         * Gravedad (en celdas por segundo²)
         * @type {number}
         */
        this.gravity = options.gravity !== undefined ? options.gravity : ANIMATION_CONSTANTS.PHYSICS.GRAVITY;
        
        /**
         * Timestep fijo para física (en segundos)
         * @type {number}
         */
        this.fixedTimestep = options.fixedTimestep !== undefined ? options.fixedTimestep : ANIMATION_CONSTANTS.PHYSICS.FIXED_TIMESTEP;
        
        // Instanciar helpers
        this.timestepManager = new PhysicsTimestepManager(this.fixedTimestep);
        this.combatMovementApplier = new CombatMovementApplier(COMBAT_ACTIONS);
        this.frictionApplier = new PhysicsFrictionApplier();
        this.velocityLimiter = new PhysicsVelocityLimiter();
    }
    
    /**
     * Actualizar sistema de física
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame (en segundos)
     */
    update(deltaTime) {
        // Usar timestep manager para ejecutar física con timestep fijo
        this.timestepManager.update(deltaTime, (timestep) => {
            this.updatePhysics(timestep);
        });
    }
    
    /**
     * Actualizar física con timestep fijo
     * @param {number} timestep - Timestep fijo
     */
    updatePhysics(timestep) {
        const entities = this.getEntities();
        
        for (const entityId of entities) {
            const physics = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.PHYSICS);
            const position = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.POSITION);
            const input = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.INPUT);
            
            if (!physics || !position) continue;
            
            // Aplicar salto (si tiene componente Input)
            // Z es altura, Y es adelante/atrás, X es izquierda/derecha
            if (input && input.wantsToJump) {
                if (physics.isGrounded) {
                    // Salto normal desde el suelo
                    physics.velocity.z = ANIMATION_CONSTANTS.PLAYER_PHYSICS.JUMP_VELOCITY;
                    physics.isGrounded = false;
                } else if (!physics.isFlying) {
                    // Salto aéreo (doble salto)
                    physics.velocity.z = ANIMATION_CONSTANTS.PLAYER_PHYSICS.JUMP_VELOCITY * 0.8; // Un poco menos de impulso
                }
                input.wantsToJump = false; // Resetear
            }
            
            // Aplicar movimiento de vuelo (3D basado en dirección de la cámara)
            // El movimiento 3D ya está calculado en InputSystem basado en la dirección de la cámara
            // La aceleración vertical se aplica junto con el movimiento horizontal más abajo
            
            // Desactivar vuelo si toca el suelo
            if (physics.isGrounded && physics.isFlying) {
                physics.isFlying = false;
                physics.useGravity = true;
                physics.consecutiveJumps = 0;
            }
            
            // Aplicar movimiento de acciones de combate usando helper
            const combat = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.COMBAT);
            const render = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.RENDER);
            
            if (input && combat && combat.activeAction) {
                const actionConfig = COMBAT_ACTIONS[combat.activeAction];
                this.combatMovementApplier.applyCombatMovement(physics, input, combat, render, actionConfig);
            } else {
                // Si no hay acción activa, resetear flag
                if (render && render.mesh && render.mesh.userData) {
                    render.mesh.userData.movementApplied = false;
                }
            }
            
            // Verificar si debemos bloquear movimiento normal (medida de seguridad adicional)
            // Nota: La aceleración normal ya está bloqueada en InputSystem, pero esta verificación
            // asegura que no se aplique movimiento normal incluso si hay algún problema con InputSystem
            let shouldBlockNormalMovement = false;
            if (combat && combat.activeAction) {
                const actionConfig = COMBAT_ACTIONS[combat.activeAction];
                // Bloquear movimiento normal si la acción NO tiene hasMovement: true
                if (!actionConfig || !actionConfig.hasMovement) {
                    shouldBlockNormalMovement = true;
                }
            }
            
            // Si está bloqueado, asegurar que aceleración horizontal esté en 0
            // (la aceleración ya debería estar bloqueada en InputSystem, pero esto es una medida de seguridad)
            if (shouldBlockNormalMovement) {
                physics.acceleration.x = 0;
                physics.acceleration.y = 0;
            }
            
            // Aplicar gravedad (Z es altura) - solo si no está volando
            if (physics.useGravity && !physics.isGrounded && !physics.isFlying) {
                physics.acceleration.z += this.gravity;
            }
            
            // Actualizar velocidad con aceleración
            physics.velocity.x += physics.acceleration.x * timestep; // Izquierda/derecha
            physics.velocity.y += physics.acceleration.y * timestep; // Adelante/atrás
            physics.velocity.z += physics.acceleration.z * timestep; // Arriba/abajo
            
            // Aplicar fricción usando helper
            this.frictionApplier.applyFriction(physics, shouldBlockNormalMovement);
            
            // Limitar velocidad máxima usando helper
            this.velocityLimiter.limitVelocity(physics);
            
            // Actualizar posición con velocidad
            position.x += physics.velocity.x * timestep; // Izquierda/derecha
            position.y += physics.velocity.y * timestep; // Adelante/atrás
            position.z += physics.velocity.z * timestep; // Arriba/abajo
            
            // Resetear aceleración
            physics.resetAcceleration();
        }
    }
}

