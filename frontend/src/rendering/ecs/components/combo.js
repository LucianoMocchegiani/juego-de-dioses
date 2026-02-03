/**
 * Componente de Combo
 * 
 * Almacena el estado de combos activos para una entidad.
 */
export class ComboComponent {
    constructor() {
        /**
         * ID del combo actualmente activo
         * @type {string|null}
         */
        this.activeComboId = null;
        
        /**
         * Paso actual en el combo
         * @type {number}
         */
        this.comboStep = 0;
        
        /**
         * Timestamp del último input de combo
         * @type {number}
         */
        this.lastComboInputTime = 0;
        
        /**
         * Animación que debe ejecutarse por el combo
         * @type {string|null}
         */
        this.comboAnimation = null;
        
        /**
         * Si el combo actual está completo
         * @type {boolean}
         */
        this.comboComplete = false;
    }
    
    /**
     * Resetear estado del combo
     */
    reset() {
        this.activeComboId = null;
        this.comboStep = 0;
        this.lastComboInputTime = 0;
        this.comboAnimation = null;
        this.comboComplete = false;
    }
}

