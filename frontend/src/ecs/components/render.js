/**
 * Componente de Renderizado
 * 
 * Almacena datos de renderizado de una entidad (mesh de Three.js, materiales, etc.)
 */
export class RenderComponent {
    /**
     * Crear componente de renderizado
     * @param {Object} options - Opciones del componente
     * @param {THREE.Object3D} [options.mesh] - Mesh de Three.js
     * @param {boolean} [options.visible] - Si el mesh es visible
     * @param {boolean} [options.castShadow] - Si el mesh proyecta sombras
     * @param {boolean} [options.receiveShadow] - Si el mesh recibe sombras
     */
    constructor(options = {}) {
        this.mesh = options.mesh || null;
        this.visible = options.visible !== undefined ? options.visible : true;
        this.castShadow = options.castShadow !== undefined ? options.castShadow : false;
        this.receiveShadow = options.receiveShadow !== undefined ? options.receiveShadow : false;
        
        // Estado de agachado
        this.isCrouching = false;
        this.normalScale = { x: 1, y: 1, z: 1 };
        this.crouchScale = { x: 1, y: 0.6, z: 1 }; // Reducir altura al 60%
    }
    
    /**
     * Establecer el mesh
     * @param {THREE.Object3D} mesh - Mesh de Three.js
     */
    setMesh(mesh) {
        this.mesh = mesh;
        if (mesh) {
            mesh.castShadow = this.castShadow;
            mesh.receiveShadow = this.receiveShadow;
            mesh.visible = this.visible;
        }
    }
    
    /**
     * Actualizar visibilidad del mesh
     * @param {boolean} visible - Si es visible
     */
    setVisible(visible) {
        this.visible = visible;
        if (this.mesh) {
            this.mesh.visible = visible;
        }
    }
}

