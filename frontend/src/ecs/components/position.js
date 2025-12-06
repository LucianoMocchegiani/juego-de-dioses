/**
 * Componente de Posición
 * 
 * Almacena la posición de una entidad en el mundo 3D.
 * Las coordenadas están en celdas (no en metros).
 */
export class PositionComponent {
    /**
     * Crear componente de posición
     * @param {number} x - Coordenada X en celdas
     * @param {number} y - Coordenada Y en celdas
     * @param {number} z - Coordenada Z en celdas
     */
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    /**
     * Clonar el componente
     * @returns {PositionComponent} Nueva instancia con los mismos valores
     */
    clone() {
        return new PositionComponent(this.x, this.y, this.z);
    }
    
    /**
     * Copiar valores de otro componente
     * @param {PositionComponent} other - Otro componente de posición
     */
    copy(other) {
        this.x = other.x;
        this.y = other.y;
        this.z = other.z;
    }
    
    /**
     * Obtener posición como objeto
     * @returns {Object} Objeto con x, y, z
     */
    toObject() {
        return { x: this.x, y: this.y, z: this.z };
    }
}

