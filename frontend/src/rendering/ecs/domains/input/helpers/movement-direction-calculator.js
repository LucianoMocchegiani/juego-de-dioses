/**
 * Helper para Cálculo de Dirección de Movimiento
 * 
 * Calcula la dirección de movimiento 2D (normal) y 3D (en vuelo) basada en
 * input del jugador y rotación de la cámara.
 */
import { ANIMATION_CONSTANTS } from '../../../../../config/animation-constants.js';

export class MovementDirectionCalculator {
    constructor(cameraController = null, animationConstants = ANIMATION_CONSTANTS) {
        this.cameraController = cameraController;
        this.animationConstants = animationConstants;
    }

    /**
     * Calcular dirección de movimiento basada en input y rotación de cámara
     * @param {Object} input - InputComponent
     * @param {Object} physics - PhysicsComponent
     * @param {Object} inputActionChecker - InputActionChecker para verificar acciones
     * @param {number} cameraRotation - Rotación horizontal de la cámara (en radianes)
     * @returns {{x: number, y: number, z: number}} Dirección de movimiento normalizada
     */
    calculateMovementDirection(input, physics, inputActionChecker, cameraRotation) {
        // Calcular dirección de movimiento en espacio local (relativo a la cámara)
        // En espacio local: X = izquierda/derecha, Y = adelante/atrás
        // IMPORTANTE: Solo una dirección a la vez - no combinar para movimiento diagonal
        // El movimiento diagonal se maneja con la rotación de la cámara, no combinando teclas
        let localX = 0;
        let localY = 0;

        // Prioridad: W (adelante) > S (atrás) > A (izquierda) > D (derecha)
        // Solo usar la primera tecla presionada, no combinar
        if (inputActionChecker.checkAction('moveForward')) {
            localY = this.animationConstants.INPUT.DIRECTION.FORWARD; // Adelante (negativo Y en espacio local)
        } else if (inputActionChecker.checkAction('moveBackward')) {
            localY = this.animationConstants.INPUT.DIRECTION.BACKWARD; // Atrás (positivo Y en espacio local)
        } else if (inputActionChecker.checkAction('moveLeft')) {
            localX = this.animationConstants.INPUT.DIRECTION.LEFT; // Izquierda (negativo X en espacio local)
        } else if (inputActionChecker.checkAction('moveRight')) {
            localX = this.animationConstants.INPUT.DIRECTION.RIGHT; // Derecha (positivo X en espacio local)
        }

        // Si está volando, calcular movimiento en 3D basado en la dirección de la cámara
        if (physics.isFlying) {
            return this.calculateFlyingDirection(localX, localY, cameraRotation);
        } else {
            return this.calculateNormalDirection(localX, localY, cameraRotation);
        }
    }

    /**
     * Calcular dirección de movimiento 3D en vuelo
     * @param {number} localX - Dirección local X (-1 izquierda, 1 derecha, 0 ninguna)
     * @param {number} localY - Dirección local Y (-1 adelante, 1 atrás, 0 ninguna)
     * @param {number} cameraRotation - Rotación horizontal de la cámara (en radianes)
     * @returns {{x: number, y: number, z: number}} Dirección 3D normalizada
     */
    calculateFlyingDirection(localX, localY, cameraRotation) {
        // Obtener rotación vertical de la cámara
        const cameraVerticalRotation = this.cameraController ? this.cameraController.rotation.vertical : 0;
        
        // Calcular dirección 3D basada en rotación horizontal y vertical de la cámara
        const cosH = Math.cos(cameraRotation); // Horizontal
        const sinH = Math.sin(cameraRotation);
        const cosV = Math.cos(cameraVerticalRotation); // Vertical
        const sinV = Math.sin(cameraVerticalRotation);
        
        let moveDirection = { x: 0, y: 0, z: 0 };
        
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
            moveDirection.x = forwardX * -localY; // Invertir localY para que W sea adelante
            moveDirection.y = forwardY * -localY;
            moveDirection.z = forwardZ * -localY; // Vertical: W con cámara arriba = subir
        }
        
        // Agregar movimiento lateral (izquierda/derecha) - solo horizontal
        if (localX !== 0) {
            const rightX = cosH;
            const rightY = -sinH;
            moveDirection.x += rightX * localX;
            moveDirection.y += rightY * localX;
        }
        
        // Normalizar dirección 3D
        const length3D = Math.sqrt(
            moveDirection.x ** 2 +
            moveDirection.y ** 2 +
            moveDirection.z ** 2
        );
        if (length3D > this.animationConstants.INPUT.DIRECTION_NORMALIZE_THRESHOLD) {
            moveDirection.x /= length3D;
            moveDirection.y /= length3D;
            moveDirection.z /= length3D;
        } else {
            moveDirection.x = this.animationConstants.INPUT.DIRECTION.NONE;
            moveDirection.y = this.animationConstants.INPUT.DIRECTION.NONE;
            moveDirection.z = 0;
        }
        
        return moveDirection;
    }

    /**
     * Calcular dirección de movimiento 2D normal (no volando)
     * @param {number} localX - Dirección local X (-1 izquierda, 1 derecha, 0 ninguna)
     * @param {number} localY - Dirección local Y (-1 adelante, 1 atrás, 0 ninguna)
     * @param {number} cameraRotation - Rotación horizontal de la cámara (en radianes)
     * @returns {{x: number, y: number, z: number}} Dirección 2D normalizada (z siempre NONE)
     */
    calculateNormalDirection(localX, localY, cameraRotation) {
        const cos = Math.cos(cameraRotation);
        const sin = Math.sin(cameraRotation);

        // Rotar vector (localX, localY) por el ángulo cameraRotation
        // Invertimos el signo de Y en la rotación porque Y negativo es adelante
        let moveDirection = {
            x: localX * cos - (-localY) * sin,
            y: localX * sin + (-localY) * cos,
            z: this.animationConstants.INPUT.DIRECTION.NONE
        };
        // Invertimos Y de vuelta
        moveDirection.y = -moveDirection.y;

        // Normalizar dirección 2D
        const length = Math.sqrt(
            moveDirection.x ** 2 +
            moveDirection.y ** 2
        );
        if (length > this.animationConstants.INPUT.DIRECTION_NORMALIZE_THRESHOLD) {
            moveDirection.x /= length;
            moveDirection.y /= length;
        } else {
            moveDirection.x = this.animationConstants.INPUT.DIRECTION.NONE;
            moveDirection.y = this.animationConstants.INPUT.DIRECTION.NONE;
        }
        
        return moveDirection;
    }
}
