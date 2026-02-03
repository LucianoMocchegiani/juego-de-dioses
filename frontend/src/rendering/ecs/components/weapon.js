/**
 * Componente de Arma (Opcional)
 * 
 * Almacena información sobre el arma equipada, incluyendo modelo 3D, punto de attachment,
 * offsets, rotación y escala. Este componente es opcional - el sistema funciona sin él
 * usando animaciones genéricas.
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
         * Ruta del modelo GLB del arma
         * @type {string|null}
         */
        this.modelPath = options.modelPath || null;
        
        /**
         * Instancia del modelo cargado (THREE.Mesh)
         * Se inicializa como null y se asigna cuando se carga el modelo
         * @type {THREE.Mesh|null}
         */
        this.modelInstance = null;
        
        /**
         * Punto de attachment (nombre del bone donde se adjunta el arma)
         * Ejemplos: 'RightHand', 'LeftHand', 'Spine', etc.
         * @type {string}
         */
        this.attachmentPoint = options.attachmentPoint || 'RightHand';
        
        /**
         * Offset relativo al punto de attachment (en coordenadas locales del bone)
         * @type {{x: number, y: number, z: number}}
         */
        this.offset = options.offset || { x: 0, y: 0, z: 0 };
        
        /**
         * Rotación adicional del arma (en grados, se convierte a radianes al adjuntar)
         * @type {{x: number, y: number, z: number}}
         */
        this.rotation = options.rotation || { x: 0, y: 0, z: 0 };
        
        /**
         * Escala del modelo del arma
         * @type {number}
         */
        this.scale = options.scale || 1.0;
        
        /**
         * Si tiene escudo equipado
         * @type {boolean}
         */
        this.hasShield = options.hasShield || false;
    }
}

