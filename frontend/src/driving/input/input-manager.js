/**
 * InputManager - Gestión de teclado y ratón.
 * Registra listeners en el contenedor, expone estado de teclas y mouse.
 */
export class InputManager {
    constructor(container = null) {
        this.enabled = true;
        this.container = container || (typeof document !== 'undefined' ? document.body : null);

        /** Teclas actualmente presionadas (code -> true) */
        this.keysPressed = new Map();
        /** Teclas que se pulsaron este frame */
        this.keysDown = new Map();
        /** Teclas que se soltaron este frame */
        this.keysUp = new Map();

        /** Botones del mouse presionados */
        this.mouseButtonsPressed = new Map();
        this.mouseButtonsDown = new Map();
        this.mouseButtonsUp = new Map();

        /** Delta de movimiento del mouse (se resetea cada frame) */
        this._mouseDelta = { x: 0, y: 0 };
        /** Delta de rueda del mouse (se resetea cada frame) */
        this._wheelDelta = 0;

        this._boundKeyDown = this._onKeyDown.bind(this);
        this._boundKeyUp = this._onKeyUp.bind(this);
        this._boundMouseDown = this._onMouseDown.bind(this);
        this._boundMouseUp = this._onMouseUp.bind(this);
        this._boundMouseMove = this._onMouseMove.bind(this);
        this._boundWheel = this._onWheel.bind(this);

        if (this.container) {
            this._attach();
        }
    }

    _attach() {
        if (!this.container) return;
        this.container.addEventListener('keydown', this._boundKeyDown);
        this.container.addEventListener('keyup', this._boundKeyUp);
        this.container.addEventListener('mousedown', this._boundMouseDown);
        this.container.addEventListener('mouseup', this._boundMouseUp);
        this.container.addEventListener('mousemove', this._boundMouseMove);
        this.container.addEventListener('wheel', this._boundWheel, { passive: false });
    }

    _onKeyDown(e) {
        if (!this.enabled) return;
        const code = e.code || e.key;
        if (!this.keysPressed.get(code)) {
            this.keysDown.set(code, true);
        }
        this.keysPressed.set(code, true);
    }

    _onKeyUp(e) {
        if (!this.enabled) return;
        const code = e.code || e.key;
        this.keysPressed.delete(code);
        this.keysUp.set(code, true);
    }

    _onMouseDown(e) {
        if (!this.enabled) return;
        const btn = e.button;
        if (!this.mouseButtonsPressed.get(btn)) {
            this.mouseButtonsDown.set(btn, true);
        }
        this.mouseButtonsPressed.set(btn, true);
    }

    _onMouseUp(e) {
        if (!this.enabled) return;
        const btn = e.button;
        this.mouseButtonsPressed.delete(btn);
        this.mouseButtonsUp.set(btn, true);
    }

    _onMouseMove(e) {
        if (!this.enabled) return;
        this._mouseDelta.x += e.movementX ?? 0;
        this._mouseDelta.y += e.movementY ?? 0;
    }

    _onWheel(e) {
        if (!this.enabled) return;
        e.preventDefault();
        this._wheelDelta += e.deltaY > 0 ? 1 : -1;
    }

    /**
     * Obtener códigos de teclas actualmente presionadas
     * @returns {IterableIterator<string>}
     */
    getKeysPressed() {
        return this.keysPressed.keys();
    }

    /**
     * Obtener teclas que se pulsaron este frame
     * @returns {IterableIterator<string>}
     */
    getKeysDown() {
        return this.keysDown.keys();
    }

    /**
     * Obtener teclas que se soltaron este frame
     * @returns {IterableIterator<string>}
     */
    getKeysUp() {
        return this.keysUp.keys();
    }

    /**
     * Comprobar si una tecla está presionada (por code, ej. 'KeyW', 'AltLeft')
     * @param {string} code - Código de tecla
     * @returns {boolean}
     */
    isKeyPressed(code) {
        return this.keysPressed.has(code);
    }

    /**
     * Comprobar si una tecla se pulsó este frame (edge: "just pressed")
     * @param {string} code - Código de tecla
     * @returns {boolean}
     */
    isKeyDown(code) {
        return this.keysDown.has(code);
    }

    /**
     * Comprobar si un botón del mouse está presionado (mantenido)
     * @param {number} button - Código del botón (0 = izquierdo, 1 = central, 2 = derecho)
     * @returns {boolean}
     */
    isMouseButtonDown(button) {
        return this.mouseButtonsPressed.has(button);
    }

    /**
     * Comprobar si un botón del mouse se pulsó este frame (edge: "just pressed")
     * @param {number} button - Código del botón (0 = izquierdo, 1 = central, 2 = derecho)
     * @returns {boolean}
     */
    isMouseButtonJustPressed(button) {
        return this.mouseButtonsDown.has(button);
    }

    /**
     * Delta de movimiento del mouse desde el último frame
     * @returns {{ x: number, y: number }}
     */
    getMouseDelta() {
        return { x: this._mouseDelta.x, y: this._mouseDelta.y };
    }

    /**
     * Delta de rueda del mouse (positivo = alejar, negativo = acercar)
     * @returns {number}
     */
    getWheelDelta() {
        return this._wheelDelta;
    }

    /**
     * Limpiar estado de frame (down/up y deltas). Llamar al final del frame.
     */
    clearFrame() {
        this.keysDown.clear();
        this.keysUp.clear();
        this.mouseButtonsDown.clear();
        this.mouseButtonsUp.clear();
        this._mouseDelta.x = 0;
        this._mouseDelta.y = 0;
        this._wheelDelta = 0;
    }

    destroy() {
        if (!this.container) return;
        this.container.removeEventListener('keydown', this._boundKeyDown);
        this.container.removeEventListener('keyup', this._boundKeyUp);
        this.container.removeEventListener('mousedown', this._boundMouseDown);
        this.container.removeEventListener('mouseup', this._boundMouseUp);
        this.container.removeEventListener('mousemove', this._boundMouseMove);
        this.container.removeEventListener('wheel', this._boundWheel);
    }
}
