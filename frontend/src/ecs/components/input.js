/**
 * Componente de Input
 * 
 * Almacena el estado de input de una entidad (teclas presionadas, acciones, etc.)
 */
export class InputComponent {
    /**
     * Crear componente de input
     * @param {Object} options - Opciones del componente
     */
    constructor(options = {}) {
        /**
         * Teclas actualmente presionadas
         * @type {Set<string>}
         */
        this.keysPressed = new Set();

        /**
         * Teclas presionadas en este frame
         * @type {Set<string>}
         */
        this.keysDown = new Set();

        /**
         * Teclas soltadas en este frame
         * @type {Set<string>}
         */
        this.keysUp = new Set();

        /**
         * Movimiento deseado (normalizado)
         * @type {Object}
         */
        this.moveDirection = { x: 0, y: 0, z: 0 };

        /**
         * Si el jugador quiere correr
         * @type {boolean}
         */
        this.isRunning = false;

        /**
         * Si el jugador quiere saltar
         * @type {boolean}
         */
        this.wantsToJump = false;

        /**
         * Si el jugador quiere agacharse
         * @type {boolean}
         */
        this.wantsToCrouch = false;

        /**
         * Si el jugador quiere golpear
         * @type {boolean}
         */
        this.wantsToAttack = false;

        /**
         * Si el jugador quiere agarrar
         * @type {boolean}
         */
        this.wantsToGrab = false;

        /**
         * Si el jugador quiere realizar un ataque especial
         * @type {boolean}
         */
        this.wantsToSpecialAttack = false;

        /**
         * Si el jugador quiere realizar un ataque pesado
         * @type {boolean}
         */
        this.wantsToHeavyAttack = false;

        /**
         * Si el jugador quiere realizar un ataque cargado
         * @type {boolean}
         */
        this.wantsToChargedAttack = false;

        /**
         * Si el jugador quiere hacer parry
         * @type {boolean}
         */
        this.wantsToParry = false;

        /**
         * Si el jugador quiere esquivar
         * @type {boolean}
         */
        this.wantsToDodge = false;

        /**
         * Rotación del mouse (para cámara)
         * @type {Object}
         */
        this.mouseRotation = { x: 0, y: 0 };
    }

    /**
     * Presionar una tecla
     * @param {string} key - Código de la tecla
     */
    pressKey(key) {
        if (!this.keysPressed.has(key)) {
            this.keysDown.add(key);
        }
        this.keysPressed.add(key);
    }

    /**
     * Soltar una tecla
     * @param {string} key - Código de la tecla
     */
    releaseKey(key) {
        if (this.keysPressed.has(key)) {
            this.keysUp.add(key);
        }
        this.keysPressed.delete(key);
    }

    /**
     * Verificar si una tecla está presionada
     * @param {string} key - Código de la tecla
     * @returns {boolean} True si está presionada
     */
    isKeyPressed(key) {
        return this.keysPressed.has(key);
    }

    /**
     * Verificar si una tecla fue presionada en este frame
     * @param {string} key - Código de la tecla
     * @returns {boolean} True si fue presionada en este frame
     */
    isKeyDown(key) {
        return this.keysDown.has(key);
    }

    /**
     * Verificar si una tecla fue soltada en este frame
     * @param {string} key - Código de la tecla
     * @returns {boolean} True si fue soltada en este frame
     */
    isKeyUp(key) {
        return this.keysUp.has(key);
    }

    /**
     * Limpiar estados de frame (llamar al final de cada frame)
     */
    clearFrame() {
        this.keysDown.clear();
        this.keysUp.clear();
        this.wantsToJump = false;
        this.wantsToAttack = false;
        this.wantsToGrab = false;
        this.wantsToSpecialAttack = false;
        this.wantsToHeavyAttack = false;
        this.wantsToChargedAttack = false;
        this.wantsToParry = false;
        this.wantsToDodge = false;
    }
}

