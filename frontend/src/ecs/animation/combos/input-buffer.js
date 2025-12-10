/**
 * Input Buffer - Almacena inputs recientes con timestamp para detección de combos
 * 
 * Permite almacenar inputs del usuario con su timestamp para detectar secuencias
 * de inputs que forman combos. Los inputs antiguos se limpian automáticamente
 * para evitar acumulación de memoria.
 */
export class InputBuffer {
    /**
     * Crear un nuevo InputBuffer
     * @param {number} maxAge - Edad máxima de inputs en milisegundos (por defecto 2000ms)
     */
    constructor(maxAge = 2000) {
        /**
         * Edad máxima de inputs en milisegundos (por defecto 2 segundos)
         * @type {number}
         */
        this.maxAge = maxAge;
        
        /**
         * Buffer de inputs con timestamp
         * @type {Array<{type: string, timestamp: number}>}
         */
        this.buffer = [];
    }
    
    /**
     * Agregar input al buffer
     * @param {string} inputType - Tipo de input ('click', 'click+shift', etc.)
     * @param {number} timestamp - Timestamp del input (performance.now())
     */
    addInput(inputType, timestamp) {
        this.buffer.push({ type: inputType, timestamp });
        this.cleanOldInputs(timestamp);
    }
    
    /**
     * Obtener inputs recientes dentro de una ventana temporal
     * @param {number} windowMs - Ventana temporal en milisegundos
     * @param {number} currentTime - Tiempo actual (performance.now())
     * @returns {Array<string>} Array de tipos de inputs en orden cronológico
     */
    getRecentInputs(windowMs, currentTime) {
        this.cleanOldInputs(currentTime);
        const cutoff = currentTime - windowMs;
        
        return this.buffer
            .filter(input => input.timestamp >= cutoff)
            .map(input => input.type);
    }
    
    /**
     * Limpiar inputs antiguos del buffer
     * @param {number} currentTime - Tiempo actual
     */
    cleanOldInputs(currentTime) {
        const cutoff = currentTime - this.maxAge;
        this.buffer = this.buffer.filter(input => input.timestamp > cutoff);
    }
    
    /**
     * Limpiar todo el buffer
     */
    clear() {
        this.buffer = [];
    }
    
    /**
     * Obtener el último input
     * @returns {string|null} Tipo del último input o null si está vacío
     */
    getLastInput() {
        if (this.buffer.length === 0) return null;
        return this.buffer[this.buffer.length - 1].type;
    }
    
    /**
     * Obtener el tiempo del último input
     * @returns {number|null} Timestamp del último input o null si está vacío
     */
    getLastInputTime() {
        if (this.buffer.length === 0) return null;
        return this.buffer[this.buffer.length - 1].timestamp;
    }
    
    /**
     * Obtener la cantidad de inputs en el buffer
     * @returns {number}
     */
    getSize() {
        return this.buffer.length;
    }
}

