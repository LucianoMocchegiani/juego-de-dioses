/**
 * Componente InfoPanel - Panel de información con datos de dimensión, partículas, estado
 */
export class InfoPanel {
    /**
     * @param {Object} options - Opciones del panel
     * @param {string} [options.className] - Clase CSS adicional
     */
    constructor(options = {}) {
        this.className = options.className || '';
        this.element = null;
        this.dimensionEl = null;
        this.particlesEl = null;
        this.statusEl = null;
    }
    
    /**
     * Renderizar panel en el contenedor
     * @param {HTMLElement} container - Contenedor donde renderizar
     */
    render(container) {
        this.element = document.createElement('div');
        this.element.className = `info-panel ${this.className}`.trim();
        this.element.innerHTML = `
            <div class="info-panel-section">
                <h4>Dimensión</h4>
                <div class="info-dimension">-</div>
            </div>
            <div class="info-panel-section">
                <h4>Partículas</h4>
                <div class="info-particles">-</div>
            </div>
            <div class="info-panel-section">
                <h4>Estado</h4>
                <div class="info-status">-</div>
            </div>
        `;
        
        this.dimensionEl = this.element.querySelector('.info-dimension');
        this.particlesEl = this.element.querySelector('.info-particles');
        this.statusEl = this.element.querySelector('.info-status');
        
        container.appendChild(this.element);
    }
    
    /**
     * Actualizar información de dimensión
     * @param {Object} dimension - Dimensión con propiedades
     */
    updateDimension(dimension) {
        if (this.dimensionEl && dimension) {
            const nombre = dimension.nombre || 'Sin nombre';
            const ancho = dimension.ancho_metros || 0;
            const alto = dimension.alto_metros || 0;
            this.dimensionEl.textContent = `${nombre} (${ancho}m x ${alto}m)`;
        }
    }
    
    /**
     * Actualizar información de partículas
     * @param {number} count - Número de partículas
     */
    updateParticles(count) {
        if (this.particlesEl) {
            this.particlesEl.textContent = count !== undefined ? `${count}` : '-';
        }
    }
    
    /**
     * Actualizar estado
     * @param {string} status - Mensaje de estado
     * @param {string} [className] - Clase CSS para el estado (success, error, etc.)
     */
    updateStatus(status, className = '') {
        if (this.statusEl) {
            this.statusEl.textContent = status || '-';
            this.statusEl.className = `info-status ${className}`.trim();
        }
    }
    
    /**
     * Destruir componente y remover del DOM
     */
    destroy() {
        if (this.element) {
            this.element.remove();
            this.element = null;
            this.dimensionEl = null;
            this.particlesEl = null;
            this.statusEl = null;
        }
    }
}

