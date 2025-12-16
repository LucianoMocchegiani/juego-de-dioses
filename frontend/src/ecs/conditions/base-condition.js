/**
 * Clase base para condiciones de animación
 */
export class BaseCondition {
    constructor(config) {
        this.config = config;
    }
    
    /**
     * Evaluar la condición
     * @param {Object} context - Contexto con input, physics, etc.
     * @returns {boolean} True si la condición se cumple
     */
    evaluate(context) {
        throw new Error('BaseCondition.evaluate() must be implemented by subclass');
    }
}

