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
        
        // IMPORTANTE: Guardar la escala original del mesh cuando se asigna
        // Si el mesh ya tiene una escala personalizada (ej: modelo 3D), preservarla
        if (this.mesh) {
            this.normalScale = {
                x: this.mesh.scale.x,
                y: this.mesh.scale.y,
                z: this.mesh.scale.z
            };
        } else {
            this.normalScale = { x: 1, y: 1, z: 1 };
        }
        
        // Escala al agacharse (relativa a la escala normal)
        this.crouchScale = {
            x: this.normalScale.x,
            y: this.normalScale.y * 0.6, // Reducir altura al 60%
            z: this.normalScale.z
        };
        
        // Rotación del personaje (en radianes, alrededor del eje Y)
        this.rotationY = 0;
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
            
            // IMPORTANTE: Guardar la escala original del mesh
            // Esto preserva escalas personalizadas (ej: modelos 3D con escala 0.0025)
            this.normalScale = {
                x: mesh.scale.x,
                y: mesh.scale.y,
                z: mesh.scale.z
            };
            
            // Actualizar escala de agacharse basada en la escala normal
            this.crouchScale = {
                x: this.normalScale.x,
                y: this.normalScale.y * 0.6, // Reducir altura al 60%
                z: this.normalScale.z
            };
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

