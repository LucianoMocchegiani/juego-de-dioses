/**
 * Configuración de un estado de animación
 */
export class StateConfig {
    constructor(config) {
        this.id = config.id;
        this.priority = config.priority;
        this.conditions = config.conditions || [];
        this.animation = config.animation;
        this.canInterrupt = config.canInterrupt || false;
        this.transitions = config.transitions || [];
        
        /**
         * Si es true, esta animación se interrumpe cuando se suelta la tecla/input que la activa.
         * Útil para animaciones de movimiento continuo como walk, run, swim, fly, etc.
         * 
         * Ejemplo:
         * - walk: interruptOnInputRelease = true → se detiene al soltar W/A/S/D
         * - attack: interruptOnInputRelease = false → se completa aunque se suelte el click
         * 
         * @type {boolean}
         * @default false
         */
        this.interruptOnInputRelease = config.interruptOnInputRelease !== undefined 
            ? config.interruptOnInputRelease 
            : false;
    }
    
    /**
     * Verificar si este estado puede activarse dado el contexto
     * @param {Object} context - Contexto con input, physics, etc.
     * @param {Array} conditions - Condiciones evaluables
     * @returns {boolean} True si todas las condiciones se cumplen
     */
    canActivate(context, conditions) {
        // Si no hay condiciones, es estado por defecto
        if (this.conditions.length === 0) {
            return true;
        }
        
        // Evaluar todas las condiciones (AND lógico)
        return conditions.every((condition) => {
            if (!condition) return false;
            return condition.evaluate(context);
        });
    }
}

