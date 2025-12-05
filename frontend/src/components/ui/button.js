/**
 * Componente Button - Botón reutilizable
 */
export class Button {
    /**
     * @param {Object} options - Opciones del botón
     * @param {string} options.text - Texto del botón
     * @param {Function} [options.onClick] - Función a ejecutar al hacer click
     * @param {string} [options.className] - Clase CSS adicional
     * @param {boolean} [options.disabled] - Si el botón está deshabilitado
     */
    constructor(options = {}) {
        this.text = options.text || 'Button';
        this.onClick = options.onClick || null;
        this.className = options.className || '';
        this.disabled = options.disabled || false;
        this.element = null;
    }
    
    /**
     * Renderizar botón en el contenedor
     * @param {HTMLElement} container - Contenedor donde renderizar
     */
    render(container) {
        this.element = document.createElement('button');
        this.element.textContent = this.text;
        this.element.className = `btn ${this.className}`.trim();
        this.element.disabled = this.disabled;
        
        if (this.onClick) {
            this.element.addEventListener('click', this.onClick);
        }
        
        container.appendChild(this.element);
    }
    
    /**
     * Actualizar texto del botón
     * @param {string} text - Nuevo texto
     */
    updateText(text) {
        if (this.element) {
            this.element.textContent = text;
        }
    }
    
    /**
     * Habilitar/deshabilitar botón
     * @param {boolean} disabled - True para deshabilitar, False para habilitar
     */
    setDisabled(disabled) {
        this.disabled = disabled;
        if (this.element) {
            this.element.disabled = disabled;
        }
    }
    
    /**
     * Destruir componente y remover del DOM
     */
    destroy() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
}

