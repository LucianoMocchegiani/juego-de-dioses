/**
 * Componente de Animación
 * 
 * Almacena el estado de animación de una entidad.
 */
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';

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
        this.currentState = options.currentState || ANIMATION_CONSTANTS.STATE_IDS.IDLE;
        
        /**
         * Velocidad de animación (multiplicador)
         * @type {number}
         */
        this.animationSpeed = options.animationSpeed !== undefined ? options.animationSpeed : 1.0;
    }
}

