/**
 * Componente de Física
 * 
 * Almacena datos físicos de una entidad (velocidad, aceleración, masa, etc.)
 */
export class PhysicsComponent {
    /**
     * Crear componente de física
     * @param {Object} options - Opciones del componente
     * @param {Object} [options.velocity] - Velocidad {x, y, z}
     * @param {Object} [options.acceleration] - Aceleración {x, y, z}
     * @param {number} [options.mass] - Masa de la entidad
     * @param {boolean} [options.useGravity] - Si la entidad está afectada por gravedad
     * @param {boolean} [options.isGrounded] - Si la entidad está en el suelo
     * @param {number} [options.groundFriction] - Fricción con el suelo (0-1)
     * @param {number} [options.airFriction] - Fricción en el aire (0-1)
     * @param {Object} [options.maxVelocity] - Velocidad máxima {x, y, z}
     */
    constructor(options = {}) {
        this.velocity = options.velocity || { x: 0, y: 0, z: 0 };
        this.acceleration = options.acceleration || { x: 0, y: 0, z: 0 };
        this.mass = options.mass || 1;
        this.useGravity = options.useGravity !== undefined ? options.useGravity : true;
        this.isGrounded = options.isGrounded !== undefined ? options.isGrounded : false;
        this.groundFriction = options.groundFriction !== undefined ? options.groundFriction : 0.8;
        this.airFriction = options.airFriction !== undefined ? options.airFriction : 0.95;
        
        // Velocidad máxima (opcional)
        this.maxVelocity = options.maxVelocity || { x: Infinity, y: Infinity, z: Infinity };
        
        // Sistema de triple salto para vuelo
        this.consecutiveJumps = 0; // Contador de saltos consecutivos
        this.lastJumpTime = 0; // Tiempo del último salto (para resetear contador si pasa mucho tiempo)
        this.isFlying = false; // Estado de vuelo
        this.flySpeed = 400; // Velocidad de vuelo en celdas/segundo (aumentado para alcanzar sol/luna a 500m = 2000 celdas en ~4 segundos)
    }
    
    /**
     * Aplicar fuerza a la entidad
     * @param {Object} force - Fuerza {x, y, z}
     */
    applyForce(force) {
        this.acceleration.x += force.x / this.mass;
        this.acceleration.y += force.y / this.mass;
        this.acceleration.z += force.z / this.mass;
    }
    
    /**
     * Resetear aceleración
     */
    resetAcceleration() {
        this.acceleration.x = 0;
        this.acceleration.y = 0;
        this.acceleration.z = 0;
    }
}

