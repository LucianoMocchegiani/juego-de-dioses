/**
 * Helper para Detección de Colisiones
 * 
 * Detecta colisiones laterales (X/Y) y con suelo (Z), ajustando velocidad y posición.
 */
import { ANIMATION_CONSTANTS } from '../../../config/animation-constants.js';

export class CollisionDetectorHelper {
    constructor(collisionDetector, animationConstants = ANIMATION_CONSTANTS) {
        this.collisionDetector = collisionDetector;
        this.animationConstants = animationConstants;
    }

    /**
     * Verificar colisiones laterales (X/Y) y ajustar velocidad
     * @param {Object} position - Posición actual {x, y, z}
     * @param {Object} physics - Componente de física (se modifica)
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame
     * @param {Set<string>} occupiedCells - Celdas ocupadas
     */
    checkLateralCollisions(position, physics, deltaTime, occupiedCells) {
        if (!occupiedCells) return;

        // Verificar colisión en dirección de movimiento
        // X = izquierda/derecha, Y = adelante/atrás, Z = arriba/abajo
        const nextX = position.x + physics.velocity.x * deltaTime;
        const nextY = position.y + physics.velocity.y * deltaTime;

        // Verificar colisión lateral X (izquierda/derecha)
        if (this.collisionDetector.isCellOccupied(occupiedCells, nextX, position.y, position.z)) {
            physics.velocity.x = this.animationConstants.COLLISION.POSITION_CORRECTION.VELOCITY_RESET;
        }

        // Verificar colisión lateral Y (adelante/atrás)
        if (this.collisionDetector.isCellOccupied(occupiedCells, position.x, nextY, position.z)) {
            physics.velocity.y = this.animationConstants.COLLISION.POSITION_CORRECTION.VELOCITY_RESET;
        }
    }

    /**
     * Verificar colisión con suelo (Z) y ajustar estado grounded y posición
     * @param {Object} position - Posición actual {x, y, z} (se puede modificar)
     * @param {Object} physics - Componente de física (se modifica)
     * @param {Set<string>} occupiedCells - Celdas ocupadas
     * @param {Object} dimension - Información del bloque (opcional, para límites)
     * @returns {boolean} True si hay suelo debajo
     */
    checkGroundCollision(position, physics, occupiedCells, dimension = null) {
        // X = izquierda/derecha, Y = adelante/atrás, Z = arriba/abajo
        const currentX = Math.floor(position.x);
        const currentY = Math.floor(position.y);
        const currentZ = Math.floor(position.z);
        const groundZ = currentZ - 1; // Z es altura, suelo está abajo

        // Verificar si hay suelo debajo
        let hasGround = false;
        if (occupiedCells && occupiedCells.size > 0) {
            // Verificar suelo directamente debajo
            hasGround = this.collisionDetector.isCellOccupied(occupiedCells, currentX, currentY, groundZ);
            
            // Si no hay suelo debajo, verificar si estamos dentro de una partícula sólida (ajustar hacia arriba)
            if (!hasGround && this.collisionDetector.isCellOccupied(occupiedCells, currentX, currentY, currentZ)) {
                // Estamos dentro de una partícula sólida, mover hacia arriba
                position.z = currentZ + this.animationConstants.COLLISION.POSITION_CORRECTION.MIN_Z;
                hasGround = false; // Aún no estamos en el suelo
            }
        } else {
            // Si no hay partículas cargadas, verificar límites del terreno
            // Si estamos muy abajo (z <= 1), asumir que hay suelo para prevenir caída infinita
            if (dimension && position.z <= this.animationConstants.COLLISION.POSITION_CORRECTION.MIN_Z) {
                hasGround = true;
                position.z = this.animationConstants.COLLISION.POSITION_CORRECTION.MIN_Z;
                physics.velocity.z = this.animationConstants.COLLISION.POSITION_CORRECTION.VELOCITY_RESET;
            }
        }

        if (hasGround) {
            physics.isGrounded = true;
            if (physics.velocity.z < this.animationConstants.COLLISION.POSITION_CORRECTION.VELOCITY_RESET) { // Z es altura, negativo es hacia abajo
                physics.velocity.z = this.animationConstants.COLLISION.POSITION_CORRECTION.VELOCITY_RESET;
                // Ajustar posición a superficie (arriba del suelo)
                // Asegurar que esté exactamente arriba del suelo
                position.z = groundZ + this.animationConstants.COLLISION.POSITION_CORRECTION.MIN_Z;
            }
        } else {
            physics.isGrounded = false;
        }

        return hasGround;
    }
}
