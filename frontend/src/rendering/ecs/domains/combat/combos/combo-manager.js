/**
 * Combo Manager - Gestiona detección y ejecución de combos
 * 
 * Procesa inputs del usuario, detecta si forman secuencias de combo válidas,
 * y gestiona el estado de combos activos.
 */
import { ComboChain } from './combo-chain.js';
import { InputBuffer } from './input-buffer.js';

export class ComboManager {
    /**
     * Crear un nuevo ComboManager
     * @param {Array<Object>} comboConfigs - Array de configuraciones de combos
     */
    constructor(comboConfigs) {
        /**
         * Array de cadenas de combo disponibles
         * @type {Array<ComboChain>}
         */
        this.combos = comboConfigs.map(config => new ComboChain(config));
        
        /**
         * Input buffer para almacenar inputs recientes
         * @type {InputBuffer}
         */
        this.inputBuffer = new InputBuffer(2000);
        
        /**
         * Combo actualmente activo
         * @type {ComboChain|null}
         */
        this.activeCombo = null;
        
        /**
         * Paso actual en el combo activo
         * @type {number}
         */
        this.currentStep = 0;
        
        /**
         * Timestamp del último paso completado
         * @type {number}
         */
        this.lastStepTime = 0;
    }
    
    /**
     * Procesar nuevo input y detectar si inicia o continúa un combo
     * @param {string} inputType - Tipo de input
     * @param {number} currentTime - Tiempo actual
     * @param {string|null} weaponType - Tipo de arma equipada
     * @returns {Object|null} Objeto con información del combo detectado o null
     */
    processInput(inputType, currentTime, weaponType = null) {
        // Agregar input al buffer
        this.inputBuffer.addInput(inputType, currentTime);
        
        // Si hay un combo activo, verificar si continúa
        if (this.activeCombo) {
            const nextStep = this.activeCombo.steps[this.currentStep];
            
            // Verificar si el input coincide con el siguiente paso
            if (nextStep && nextStep.input === inputType) {
                // Verificar timing window
                const timeSinceLastStep = currentTime - this.lastStepTime;
                if (timeSinceLastStep <= nextStep.timing) {
                    // Avanzar al siguiente paso
                    this.currentStep++;
                    this.lastStepTime = currentTime;
                    
                    // Si es el último paso, combo completado
                    if (this.currentStep >= this.activeCombo.steps.length) {
                        const result = {
                            comboId: this.activeCombo.id,
                            step: this.currentStep - 1,
                            animation: nextStep.animation,
                            isComplete: true
                        };
                        this.resetCombo();
                        return result;
                    } else {
                        // Combo continúa
                        return {
                            comboId: this.activeCombo.id,
                            step: this.currentStep - 1,
                            animation: nextStep.animation,
                            isComplete: false
                        };
                    }
                } else {
                    // Timing window expirado, resetear combo
                    this.resetCombo();
                }
            } else {
                // Input no coincide, resetear combo
                this.resetCombo();
            }
        }
        
        // Intentar detectar nuevo combo
        const detectedCombo = this.detectCombo(inputType, currentTime, weaponType);
        if (detectedCombo) {
            this.startCombo(detectedCombo, currentTime);
            const firstStep = detectedCombo.steps[0];
            return {
                comboId: detectedCombo.id,
                step: 0,
                animation: firstStep.animation,
                isComplete: false
            };
        }
        
        return null;
    }
    
    /**
     * Detectar si un input inicia algún combo disponible
     * @param {string} inputType - Tipo de input
     * @param {number} currentTime - Tiempo actual
     * @param {string|null} weaponType - Tipo de arma equipada
     * @returns {ComboChain|null}
     */
    detectCombo(inputType, currentTime, weaponType) {
        // Buscar combos que empiecen con este input y sean compatibles con el arma
        for (const combo of this.combos) {
            if (!combo.canUseWithWeapon(weaponType)) continue;
            
            const firstStep = combo.steps[0];
            if (firstStep && firstStep.input === inputType) {
                return combo;
            }
        }
        return null;
    }
    
    /**
     * Iniciar un combo
     * @param {ComboChain} combo - Combo a iniciar
     * @param {number} currentTime - Tiempo actual
     */
    startCombo(combo, currentTime) {
        this.activeCombo = combo;
        this.currentStep = 1;  // Ya procesamos el primer paso
        this.lastStepTime = currentTime;
    }
    
    /**
     * Resetear combo activo
     */
    resetCombo() {
        this.activeCombo = null;
        this.currentStep = 0;
        this.lastStepTime = 0;
    }
    
    /**
     * Verificar si hay un combo activo
     * @returns {boolean}
     */
    hasActiveCombo() {
        return this.activeCombo !== null;
    }
    
    /**
     * Cancelar combo activo (por ejemplo, si se recibe daño)
     */
    cancelCombo() {
        this.resetCombo();
    }
    
    /**
     * Obtener el combo activo
     * @returns {ComboChain|null}
     */
    getActiveCombo() {
        return this.activeCombo;
    }
    
    /**
     * Obtener el paso actual del combo activo
     * @returns {number}
     */
    getCurrentStep() {
        return this.currentStep;
    }
}

