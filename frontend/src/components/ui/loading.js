/**
 * Componente Loading - Indicador de carga
 */
export class Loading {
    /**
     * @param {Object} options - Opciones del loading
     * @param {string} [options.message] - Mensaje a mostrar
     * @param {string} [options.className] - Clase CSS adicional
     */
    constructor(options = {}) {
        this.message = options.message || 'Cargando...';
        this.className = options.className || '';
        this.element = null;
    }
    
    /**
     * Renderizar loading en el contenedor
     * @param {HTMLElement} container - Contenedor donde renderizar
     */
    render(container) {
        this.element = document.createElement('div');
        this.element.className = `loading ${this.className}`.trim();
        this.element.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-message">${this.message}</div>
        `;
        container.appendChild(this.element);
    }
    
    /**
     * Actualizar mensaje
     * @param {string} message - Nuevo mensaje
     */
    update(message) {
        if (this.element) {
            const messageEl = this.element.querySelector('.loading-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
        }
    }
    
    /**
     * Mostrar/ocultar loading
     * @param {boolean} visible - True para mostrar, False para ocultar
     */
    setVisible(visible) {
        if (this.element) {
            this.element.style.display = visible ? 'block' : 'none';
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

