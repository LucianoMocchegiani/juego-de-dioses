/**
 * Input Manager
 * 
 * Gestor centralizado de input (teclado y mouse).
 * Proporciona una interfaz única para capturar eventos de input.
 */
import { debugLogger } from '../debug/logger.js';

export class InputManager {
    constructor() {
        /**
         * Si el InputManager está habilitado
         * @type {boolean}
         */
        this.enabled = true;
        
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
         * Botones del mouse presionados
         * @type {Set<number>}
         */
        this.mouseButtonsPressed = new Set();

        /**
         * Botones del mouse presionados en este frame
         * @type {Set<number>}
         */
        this.mouseButtonsDown = new Set();

        /**
         * Botones del mouse soltados en este frame
         * @type {Set<number>}
         */
        this.mouseButtonsUp = new Set();

        /**
         * Posición del mouse
         * @type {Object}
         */
        this.mousePosition = { x: 0, y: 0 };

        /**
         * Movimiento del mouse (delta)
         * @type {Object}
         */
        this.mouseDelta = { x: 0, y: 0 };

        /**
         * Última posición del mouse (para calcular delta)
         * @type {Object}
         */
        this.lastMousePosition = { x: 0, y: 0 };

        /**
         * Scroll del mouse (wheel delta)
         * @type {number}
         */
        this.wheelDelta = 0;

        /**
         * Si el mouse está bloqueado (para FPS controls)
         * @type {boolean}
         */
        this.mouseLocked = false;

        // Bind de eventos
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
        this.handleBlur = this.handleBlur.bind(this);

        // Agregar event listeners
        this.attachListeners();
    }

    /**
     * Adjuntar event listeners al documento
     */
    attachListeners() {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        document.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('wheel', this.handleWheel, { passive: false });
        document.addEventListener('contextmenu', this.handleContextMenu);
        window.addEventListener('blur', this.handleBlur);
    }

    /**
     * Remover event listeners
     */
    detachListeners() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('wheel', this.handleWheel);
        document.removeEventListener('contextmenu', this.handleContextMenu);
        window.removeEventListener('blur', this.handleBlur);
    }

    /**
     * Manejar tecla presionada
     * @param {KeyboardEvent} event - Evento de teclado
     */
    handleKeyDown(event) {
        // Si está deshabilitado, no procesar
        if (!this.enabled) {
            return;
        }
        
        debugLogger.debug('InputManager', 'Key pressed', {
            keyCode: event.code,
            key: event.key,
            repeat: event.repeat
        });
        
        // Prevenir comportamiento por defecto para teclas de juego
        const gameKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 
                         'ControlLeft', 'ControlRight', 'KeyC', 'AltLeft', 'AltRight', 
                         'KeyR', 'KeyQ', 'KeyE', 'KeyF', 'KeyP', 'keyX'];
        if (gameKeys.includes(event.code)) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (!this.keysPressed.has(event.code)) {
            this.keysDown.add(event.code);
        }
        this.keysPressed.add(event.code);
    }

    /**
     * Manejar tecla soltada
     * @param {KeyboardEvent} event - Evento de teclado
     */
    handleKeyUp(event) {
        if (!this.enabled) {
            return;
        }
        
        if (this.keysPressed.has(event.code)) {
            this.keysUp.add(event.code);
        }
        this.keysPressed.delete(event.code);
    }

    /**
     * Manejar botón del mouse presionado
     * @param {MouseEvent} event - Evento de mouse
     */
    handleMouseDown(event) {
        if (!this.enabled) {
            return;
        }
        
        if (!this.mouseButtonsPressed.has(event.button)) {
            this.mouseButtonsDown.add(event.button);
        }
        this.mouseButtonsPressed.add(event.button);
    }

    /**
     * Manejar botón del mouse soltado
     * @param {MouseEvent} event - Evento de mouse
     */
    handleMouseUp(event) {
        if (!this.enabled) {
            return;
        }
        
        if (this.mouseButtonsPressed.has(event.button)) {
            this.mouseButtonsUp.add(event.button);
        }
        this.mouseButtonsPressed.delete(event.button);
    }

    /**
     * Manejar movimiento del mouse
     * @param {MouseEvent} event - Evento de mouse
     */
    handleMouseMove(event) {
        if (!this.enabled) {
            return;
        }
        
        const newX = event.clientX;
        const newY = event.clientY;

        // Calcular delta usando la diferencia de posición
        // movementX/movementY solo funciona con pointer lock, así que usamos diferencia
        this.mouseDelta.x = event.movementX !== undefined ? event.movementX : (newX - this.lastMousePosition.x);
        this.mouseDelta.y = event.movementY !== undefined ? event.movementY : (newY - this.lastMousePosition.y);

        // Actualizar posición
        this.mousePosition.x = newX;
        this.mousePosition.y = newY;
        this.lastMousePosition.x = newX;
        this.lastMousePosition.y = newY;
    }

    /**
     * Prevenir menú contextual (click derecho)
     * @param {MouseEvent} event - Evento de mouse
     */
    /**
     * Manejar rueda del mouse (zoom)
     * @param {WheelEvent} event - Evento de rueda
     */
    handleWheel(event) {
        if (!this.enabled) {
            return;
        }
        
        // Prevenir scroll de página
        event.preventDefault();

        // Guardar delta (positivo = alejar, negativo = acercar)
        // Normalizar para que sea consistente entre navegadores
        this.wheelDelta = event.deltaY > 0 ? 1 : -1;
    }

    /**
     * Obtener delta de la rueda del mouse y resetearlo
     * @returns {number} Delta de la rueda (-1 = acercar, 1 = alejar, 0 = sin cambio)
     */
    getWheelDelta() {
        const delta = this.wheelDelta;
        this.wheelDelta = 0; // Resetear después de leer
        return delta;
    }

    handleContextMenu(event) {
        // Prevenir menú contextual cuando se usa click derecho para rotar cámara
        // Siempre prevenir en modo juego para mejor experiencia
        event.preventDefault();
    }

    /**
     * Manejar pérdida de foco de la ventana
     * Limpia todas las teclas para evitar que queden "pegadas"
     */
    handleBlur() {
        this.keysPressed.clear();
        this.keysDown.clear();
        this.keysUp.clear();
        this.mouseButtonsPressed.clear();
        this.mouseButtonsDown.clear();
        this.mouseButtonsUp.clear();
        debugLogger.info('InputManager', 'Window lost focus - Input state cleared');
    }

    /**
     * Obtener teclas presionadas
     * @returns {Set<string>} Set de códigos de teclas
     */
    getKeysPressed() {
        return new Set(this.keysPressed);
    }

    /**
     * Obtener teclas presionadas en este frame
     * @returns {Set<string>} Set de códigos de teclas
     */
    getKeysDown() {
        return new Set(this.keysDown);
    }

    /**
     * Obtener teclas soltadas en este frame
     * @returns {Set<string>} Set de códigos de teclas
     */
    getKeysUp() {
        return new Set(this.keysUp);
    }

    /**
     * Verificar si una tecla está presionada
     * @param {string} keyCode - Código de la tecla
     * @returns {boolean} True si está presionada
     */
    isKeyPressed(keyCode) {
        return this.keysPressed.has(keyCode);
    }

    /**
     * Verificar si una tecla fue presionada en este frame
     * @param {string} keyCode - Código de la tecla
     * @returns {boolean} True si fue presionada en este frame
     */
    isKeyDown(keyCode) {
        return this.keysDown.has(keyCode);
    }

    /**
     * Verificar si un botón del mouse está presionado
     * @param {number} button - Botón del mouse (0=izquierdo, 1=medio, 2=derecho)
     * @returns {boolean} True si está presionado
     */
    isMouseButtonPressed(button) {
        return this.mouseButtonsPressed.has(button);
    }

    /**
     * Verificar si un botón del mouse fue presionado en este frame
     * @param {number} button - Botón del mouse (0=izquierdo, 1=medio, 2=derecho)
     * @returns {boolean} True si fue presionado en este frame
     */
    isMouseButtonDown(button) {
        return this.mouseButtonsDown.has(button);
    }

    /**
     * Obtener posición del mouse
     * @returns {Object} Posición {x, y}
     */
    getMousePosition() {
        return { ...this.mousePosition };
    }

    /**
     * Obtener movimiento del mouse (delta)
     * @returns {Object} Delta {x, y}
     */
    getMouseDelta() {
        return { ...this.mouseDelta };
    }

    /**
     * Limpiar estados de frame (llamar al final de cada frame)
     */
    clearFrame() {
        this.keysDown.clear();
        this.keysUp.clear();
        this.mouseButtonsDown.clear();
        this.mouseButtonsUp.clear();
        // Resetear mouseDelta después de que todos los sistemas lo hayan usado
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
    }

    /**
     * Bloquear/desbloquear mouse (para FPS controls)
     * @param {boolean} locked - Si debe estar bloqueado
     */
    setMouseLocked(locked) {
        this.mouseLocked = locked;
    }

    /**
     * Destruir el input manager
     */
    destroy() {
        this.detachListeners();
        this.keysPressed.clear();
        this.keysDown.clear();
        this.keysUp.clear();
        this.mouseButtonsPressed.clear();
        this.mouseButtonsDown.clear();
        this.mouseButtonsUp.clear();
    }
}

