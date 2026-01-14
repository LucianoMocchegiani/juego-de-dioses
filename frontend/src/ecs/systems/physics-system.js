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
            
            // Aplicar movimiento de acciones de combate
            const combat = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.COMBAT);
            const render = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.RENDER);
            
            if (input && combat && combat.activeAction) {
                const actionConfig = COMBAT_ACTIONS[combat.activeAction];
                
                if (actionConfig && actionConfig.hasMovement) {
                    const movementSpeed = actionConfig.movementSpeed;
                    
                    // Inicializar flag si no existe
                    if (!render || !render.mesh || !render.mesh.userData) {
                        // Si no hay render/mesh, no podemos aplicar movimiento
                        // Esto no debería pasar normalmente
                    } else {
                        // Inicializar flag si no existe
                        if (render.mesh.userData.movementApplied === undefined) {
                            render.mesh.userData.movementApplied = false;
                        }
                        
                        // Calcular dirección según configuración (solo una vez al inicio)
                        if (!render.mesh.userData.movementApplied) {
                            let dirX = 0, dirY = 0;
                            
                            if (actionConfig.useMovementInput && 
                                (input.moveDirection.x !== 0 || input.moveDirection.y !== 0)) {
                                // Usar dirección de input
                                dirX = input.moveDirection.x;
                                dirY = input.moveDirection.y;
                            } else {
                                // Usar dirección de cámara (hacia adelante)
                                const cameraRotation = render?.rotationY || 0;
                                const cos = Math.cos(cameraRotation);
                                const sin = Math.sin(cameraRotation);
                                dirX = -sin;
                                dirY = -cos;
                            }
                            
                            // Aplicar impulso solo una vez al inicio
                            physics.velocity.x = dirX * movementSpeed;
                            physics.velocity.y = dirY * movementSpeed;
                            render.mesh.userData.movementApplied = true;
                        }
                    }
                }
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
            
            // Aplicar fricción
            if (physics.isFlying) {
                // En vuelo: fricción más fuerte para frenar cuando no hay input (como un avión)
                const flyFriction = 0.85; // Fricción más fuerte en vuelo para frenar rápidamente
                physics.velocity.x *= flyFriction; // Izquierda/derecha
                physics.velocity.y *= flyFriction; // Adelante/atrás
                physics.velocity.z *= flyFriction; // Arriba/abajo
            } else {
                // Movimiento normal: solo fricción horizontal
                const friction = physics.isGrounded ? physics.groundFriction : physics.airFriction;
                
                // Si el movimiento está bloqueado, aplicar fricción extra para transición más suave
                if (shouldBlockNormalMovement) {
                    // Fricción más agresiva cuando está bloqueado para reducir velocidad más rápido
                    // Esto evita transiciones bruscas cuando la animación termina
                    const blockFriction = 0.7; // Fricción extra (reduce velocidad más rápido)
                    physics.velocity.x *= blockFriction;
                    physics.velocity.y *= blockFriction;
                } else {
                    physics.velocity.x *= friction; // Izquierda/derecha
                    physics.velocity.y *= friction; // Adelante/atrás
                }
            }
            
            // Limitar velocidad máxima
            if (Math.abs(physics.velocity.x) > physics.maxVelocity.x) {
                physics.velocity.x = Math.sign(physics.velocity.x) * physics.maxVelocity.x;
            }
            if (Math.abs(physics.velocity.y) > physics.maxVelocity.y) {
                physics.velocity.y = Math.sign(physics.velocity.y) * physics.maxVelocity.y;
            }
            // En vuelo, no limitar velocidad vertical para permitir alcanzar sol/luna
            if (!physics.isFlying && Math.abs(physics.velocity.z) > physics.maxVelocity.z) {
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

