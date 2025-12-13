/**
 * Componente de Animación
 * 
 * Almacena el estado de animación de una entidad.
 */
export class AnimationComponent {
    /**
     * Crear componente de animación
     * @param {Object} options - Opciones del componente
     */
    constructor(options = {}) {
        /**
         * Estado actual de animación
         * @type {string}
         * @values 'idle', 'walk', 'run', 'jump', 'crouch', 'combo_attack'
         */
        this.currentState = options.currentState || 'idle';
        
        /**
         * Velocidad de animación (multiplicador)
         * @type {number}
         */
        this.animationSpeed = options.animationSpeed !== undefined ? options.animationSpeed : 1.0;
    }
}

