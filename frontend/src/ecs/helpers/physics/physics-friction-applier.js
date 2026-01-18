/**
 * Helper para Aplicación de Fricción
 * 
 * Aplica fricción según el estado (vuelo, normal, bloqueado).
 */
export class PhysicsFrictionApplier {
    /**
     * Aplicar fricción según el estado
     * @param {Object} physics - PhysicsComponent (se modifica)
     * @param {boolean} shouldBlockNormalMovement - Si el movimiento normal está bloqueado
     */
    applyFriction(physics, shouldBlockNormalMovement = false) {
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
    }
}
