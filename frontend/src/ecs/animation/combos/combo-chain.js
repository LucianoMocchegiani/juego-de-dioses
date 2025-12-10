/**
 * Combo Chain - Representa una secuencia de combo (pasos de ataque)
 * 
 * Encapsula la configuración de un combo: secuencia de inputs, animaciones
 * correspondientes, timing windows, y tipos de armas compatibles.
 */
export class ComboChain {
    /**
     * Crear una nueva cadena de combo
     * @param {Object} config - Configuración del combo
     * @param {string} config.id - ID único del combo
     * @param {Array<Object>} config.steps - Pasos del combo [{input, animation, timing}, ...]
     * @param {boolean} [config.cancelable] - Si el combo puede cancelarse
     * @param {Array<string>} [config.weaponTypes] - Tipos de armas que pueden usar este combo
     */
    constructor(config) {
        /**
         * ID único del combo
         * @type {string}
         */
        this.id = config.id;
        
        /**
         * Pasos del combo
         * Cada paso tiene: {input: string, animation: string, timing: number}
         * @type {Array<Object>}
         */
        this.steps = config.steps;
        
        /**
         * Si el combo puede cancelarse con otra acción
         * @type {boolean}
         */
        this.cancelable = config.cancelable !== undefined ? config.cancelable : false;
        
        /**
         * Tipos de armas que pueden usar este combo
         * @type {Array<string>}
         */
        this.weaponTypes = config.weaponTypes || ['generic'];
    }
    
    /**
     * Verificar si el combo puede ejecutarse con el tipo de arma dado
     * @param {string|null} weaponType - Tipo de arma o null si no hay arma
     * @returns {boolean}
     */
    canUseWithWeapon(weaponType) {
        if (!weaponType) weaponType = 'generic';
        return this.weaponTypes.includes(weaponType);
    }
    
    /**
     * Obtener el número de pasos del combo
     * @returns {number}
     */
    getStepCount() {
        return this.steps.length;
    }
    
    /**
     * Obtener el primer paso del combo
     * @returns {Object|null} Primer paso o null si no hay pasos
     */
    getFirstStep() {
        return this.steps.length > 0 ? this.steps[0] : null;
    }
    
    /**
     * Obtener un paso específico por índice
     * @param {number} index - Índice del paso (0-based)
     * @returns {Object|null} Paso o null si el índice no existe
     */
    getStep(index) {
        if (index < 0 || index >= this.steps.length) return null;
        return this.steps[index];
    }
}

