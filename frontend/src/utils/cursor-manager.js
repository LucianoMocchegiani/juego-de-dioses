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
        
        // Centrar cursor inicialmente
        this.centerCursor();
        
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
        // Solo centrar si el cursor está oculto y tenemos pointer lock
        if (this.showCursorCount === 0 && this.container && document.pointerLockElement === this.container) {
            // Con pointer lock, el cursor ya está centrado automáticamente
            // No necesitamos hacer nada adicional
        }
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
            
            // Centrar cursor cuando se oculta
            this.centerCursor();
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
        
        this.centerCursor();
    }
    
    /**
     * Centrar el cursor en el contenedor
     */
    centerCursor() {
        if (!this.container) return;
        
        // Solo intentar pointer lock si el cursor está oculto
        if (this.showCursorCount > 0) {
            return; // No centrar si el cursor está visible
        }
        
        // Intentar usar pointer lock para centrar (solo cuando cursor está oculto)
        try {
            if (this.container.requestPointerLock && !document.pointerLockElement) {
                this.container.requestPointerLock().catch(() => {
                    // Ignorar errores de pointer lock (puede fallar si no hay interacción del usuario)
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

