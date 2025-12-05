/**
 * Componente Panel - Panel contenedor con título y contenido
 */
export class Panel {
    /**
     * @param {Object} options - Opciones del panel
     * @param {string} [options.title] - Título del panel
     * @param {string|HTMLElement} [options.content] - Contenido del panel
     * @param {string} [options.className] - Clase CSS adicional
     */
    constructor(options = {}) {
        this.title = options.title || '';
        this.content = options.content || '';
        this.className = options.className || '';
        this.element = null;
    }
    
    /**
     * Renderizar panel en el contenedor
     * @param {HTMLElement} container - Contenedor donde renderizar
     */
    render(container) {
        this.element = document.createElement('div');
        this.element.className = `panel ${this.className}`.trim();
        
        let html = '';
        if (this.title) {
            html += `<h3 class="panel-title">${this.title}</h3>`;
        }
        
        html += '<div class="panel-content"></div>';
        this.element.innerHTML = html;
        
        const contentEl = this.element.querySelector('.panel-content');
        if (typeof this.content === 'string') {
            contentEl.textContent = this.content;
        } else if (this.content instanceof HTMLElement) {
            contentEl.appendChild(this.content);
        }
        
        container.appendChild(this.element);
    }
    
    /**
     * Actualizar contenido del panel
     * @param {string|HTMLElement} content - Nuevo contenido
     */
    update(content) {
        if (this.element) {
            const contentEl = this.element.querySelector('.panel-content');
            if (contentEl) {
                if (typeof content === 'string') {
                    contentEl.textContent = content;
                } else if (content instanceof HTMLElement) {
                    contentEl.innerHTML = '';
                    contentEl.appendChild(content);
                }
            }
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

