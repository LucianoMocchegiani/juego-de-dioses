/**
 * Componente de Arma (Opcional)
 * 
 * Almacena información sobre el arma equipada.
 * Este componente es opcional - el sistema funciona sin él usando animaciones genéricas.
 */
export class WeaponComponent {
    constructor(options = {}) {
        /**
         * Tipo de arma: 'sword', 'axe', 'hammer', 'spear', etc.
         * @type {string}
         */
        this.weaponType = options.weaponType || 'generic';
        
        /**
         * ID del arma específica (para sistema futuro de armas únicas)
         * @type {string|null}
         */
        this.weaponId = options.weaponId || null;
        
        /**
         * Si tiene escudo equipado
         * @type {boolean}
         */
        this.hasShield = options.hasShield || false;
    }
}

