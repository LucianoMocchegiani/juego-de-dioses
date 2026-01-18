/**
 * Helper para Gestión de Timestep Fijo
 * 
 * Maneja la ejecución de física con timestep fijo usando un acumulador.
 */
export class PhysicsTimestepManager {
    constructor(fixedTimestep) {
        this.fixedTimestep = fixedTimestep;
        /**
         * Acumulador para timestep fijo
         * @type {number}
         */
        this.accumulator = 0;
    }

    /**
     * Actualizar con timestep fijo y ejecutar callback múltiples veces si es necesario
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame (en segundos)
     * @param {Function} updateCallback - Callback que se ejecutará con el timestep fijo
     * @returns {number} Número de pasos ejecutados
     */
    update(deltaTime, updateCallback) {
        this.accumulator += deltaTime;
        let stepsExecuted = 0;

        // Ejecutar física con timestep fijo
        while (this.accumulator >= this.fixedTimestep) {
            updateCallback(this.fixedTimestep);
            this.accumulator -= this.fixedTimestep;
            stepsExecuted++;
        }

        return stepsExecuted;
    }

    /**
     * Obtener el acumulador actual
     * @returns {number} Valor del acumulador
     */
    getAccumulator() {
        return this.accumulator;
    }

    /**
     * Resetear el acumulador
     */
    resetAccumulator() {
        this.accumulator = 0;
    }
}
