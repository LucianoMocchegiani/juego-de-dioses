/**
 * Componente de Combate
 * 
 * Almacena el estado de combate de una entidad (tipo de ataque, defensa, etc.)
 */
export class CombatComponent {
    constructor() {
        /**
         * Si está atacando
         * @type {boolean}
         */
        this.isAttacking = false;
        
        /**
         * Tipo de ataque: 'light', 'heavy', 'charged', 'special', null
         * @type {string|null}
         */
        this.attackType = null;
        
        /**
         * Tipo de defensa: 'parry', 'dodge', 'block', null
         * @type {string|null}
         */
        this.defenseType = null;
        
        /**
         * Si el ataque actual puede cancelarse
         * @type {boolean}
         */
        this.canCancel = false;
        
        /**
         * Animación de ataque/defensa que debe ejecutarse
         * @type {string|null}
         */
        this.combatAnimation = null;
    }
    
    /**
     * Resetear estado de combate
     */
    reset() {
        this.isAttacking = false;
        this.attackType = null;
        this.defenseType = null;
        this.canCancel = false;
        this.combatAnimation = null;
    }
}

