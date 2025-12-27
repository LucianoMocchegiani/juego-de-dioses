/**
 * Gestor centralizado del cursor del mouse
 * 
 * Permite ocultar/mostrar el cursor y centrarlo fácilmente.
 * Útil para interfaces de juego donde el cursor debe estar oculto por defecto
 * pero visible en menús e interfaces.
 */

class CursorManager {
    constructor() {
        /**
         * Contador de referencias (cuántas interfaces quieren mostrar el cursor)
         * @type {number}
         */
        this.showCursorCount = 0;
        
        /**
         * Si el cursor está centrado automáticamente
         * @type {boolean}
         */
        this.autoCenter = true;
        
        /**
         * Última posición del cursor (para centrado)
         * @type {Object}
         */
        this.lastPosition = { x: 0, y: 0 };
        
        /**
         * Elemento del canvas/container
         * @type {HTMLElement|null}
         */
        this.container = null;
        
        /**
         * Si el pointer lock está activo
         * @type {boolean}
         */
        this.isPointerLocked = false;
        
        // Ocultar cursor por defecto al inicializar
        // No llamar hide() aquí porque aún no tenemos el container
        // Se llamará después de init()
    }
    
    /**
     * Inicializar el gestor con el contenedor del canvas
     * @param {HTMLElement} container - Contenedor del canvas
     */
    init(container) {
        this.container = container;
        
        // Ocultar cursor por defecto
        this.forceHide();
        
        // Escuchar cambios de pointer lock
        document.addEventListener('pointerlockchange', this.handlePointerLockChange.bind(this));
        document.addEventListener('pointerlockerror', this.handlePointerLockError.bind(this));
        
        // Activar pointer lock cuando se hace click en el canvas (si el cursor está oculto)
        container.addEventListener('click', this.handleContainerClick.bind(this));
        
        // Escuchar movimiento del mouse para centrarlo
        if (this.autoCenter) {
            document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        }
    }
    
    /**
     * Manejar movimiento del mouse para centrarlo
     * @param {MouseEvent} event - Evento de mouse
     */
    handleMouseMove(event) {
        // Con pointer lock, el cursor ya está centrado automáticamente
        // No necesitamos hacer nada adicional
    }
    
    /**
     * Manejar click en el contenedor para activar pointer lock
     * @param {MouseEvent} event - Evento de mouse
     */
    handleContainerClick(event) {
        // Solo activar pointer lock si el cursor está oculto (modo juego)
        if (this.showCursorCount === 0 && this.container && !this.isPointerLocked) {
            this.requestPointerLock();
        }
    }
    
    /**
     * Manejar cambio de estado de pointer lock
     */
    handlePointerLockChange() {
        const isLocked = document.pointerLockElement === this.container;
        this.isPointerLocked = isLocked;
        
        if (isLocked) {
            // Pointer lock activado: cursor está bloqueado y centrado
            // No necesitamos hacer nada adicional
        } else {
            // Pointer lock desactivado: intentar reactivarlo si el cursor está oculto
            if (this.showCursorCount === 0 && this.container) {
                // Intentar reactivar después de un pequeño delay
                setTimeout(() => {
                    if (this.showCursorCount === 0 && !this.isPointerLocked) {
                        this.requestPointerLock();
                    }
                }, 100);
            }
        }
    }
    
    /**
     * Manejar error de pointer lock
     */
    handlePointerLockError() {
        // Si falla el pointer lock, no podemos hacer mucho
        // El usuario puede necesitar hacer click manualmente
        console.warn('Error al activar pointer lock. El mouse puede salir del canvas.');
    }
    
    /**
     * Mostrar el cursor
     * Usa un contador para que múltiples interfaces puedan pedir mostrar el cursor
     */
    show() {
        this.showCursorCount++;
        if (this.showCursorCount > 0) {
            // Remover pointer lock si está activo
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            this.isPointerLocked = false;
            
            // Usar clases CSS para controlar el cursor
            document.body.classList.remove('cursor-hidden');
            document.body.classList.add('cursor-visible');
            
            // También forzar con estilos inline como respaldo
            document.body.style.setProperty('cursor', 'default', 'important');
            document.documentElement.style.setProperty('cursor', 'default', 'important');
            if (this.container) {
                this.container.style.setProperty('cursor', 'default', 'important');
            }
        }
    }
    
    /**
     * Ocultar el cursor
     * Usa un contador para que el cursor solo se oculte cuando todas las interfaces lo liberen
     */
    hide() {
        this.showCursorCount--;
        if (this.showCursorCount <= 0) {
            this.showCursorCount = 0;
            
            // Usar clases CSS para controlar el cursor
            document.body.classList.remove('cursor-visible');
            document.body.classList.add('cursor-hidden');
            
            // También forzar con estilos inline como respaldo
            document.body.style.setProperty('cursor', 'none', 'important');
            document.documentElement.style.setProperty('cursor', 'none', 'important');
            if (this.container) {
                this.container.style.setProperty('cursor', 'none', 'important');
            }
            
            // Activar pointer lock cuando se oculta el cursor
            this.requestPointerLock();
        }
    }
    
    /**
     * Forzar ocultar el cursor (resetear contador)
     */
    forceHide() {
        this.showCursorCount = 0;
        
        // Usar clases CSS
        document.body.classList.remove('cursor-visible');
        document.body.classList.add('cursor-hidden');
        
        // También forzar con estilos inline
        document.body.style.setProperty('cursor', 'none', 'important');
        document.documentElement.style.setProperty('cursor', 'none', 'important');
        if (this.container) {
            this.container.style.setProperty('cursor', 'none', 'important');
        }
        
        // Intentar activar pointer lock (puede fallar si no hay interacción del usuario)
        // Se activará automáticamente cuando el usuario haga click
    }
    
    /**
     * Solicitar pointer lock
     * Esto bloquea el cursor dentro del canvas y previene que salga
     */
    requestPointerLock() {
        if (!this.container) return;
        
        // Solo intentar pointer lock si el cursor está oculto
        if (this.showCursorCount > 0) {
            return; // No activar pointer lock si el cursor está visible
        }
        
        // Si ya está bloqueado, no hacer nada
        if (this.isPointerLocked) {
            return;
        }
        
        // Intentar usar pointer lock para bloquear el cursor
        try {
            if (this.container.requestPointerLock) {
                this.container.requestPointerLock().catch(() => {
                    // Ignorar errores de pointer lock (puede fallar si no hay interacción del usuario)
                    // El usuario necesitará hacer click para activarlo
                });
            }
        } catch (error) {
            // Ignorar errores de pointer lock
        }
    }
    
    /**
     * Habilitar/deshabilitar centrado automático
     * @param {boolean} enabled - Si el centrado automático está habilitado
     */
    setAutoCenter(enabled) {
        this.autoCenter = enabled;
    }
}

// Singleton
export const cursorManager = new CursorManager();

