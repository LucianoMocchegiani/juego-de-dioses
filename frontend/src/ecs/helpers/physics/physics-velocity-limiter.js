/**
 * Helper para Limitación de Velocidad Máxima
 * 
 * Limita la velocidad según los límites configurados en PhysicsComponent.
 */
export class PhysicsVelocityLimiter {
    /**
     * Limitar velocidad según maxVelocity
     * @param {Object} physics - PhysicsComponent (se modifica)
     */
    limitVelocity(physics) {
        // Limitar velocidad máxima horizontal
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
    }
}
