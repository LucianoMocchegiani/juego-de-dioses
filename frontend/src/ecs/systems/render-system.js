/**
 * Sistema de Renderizado
 * 
 * Actualiza la posición y rotación de los meshes de Three.js basándose en componentes Position y Render.
 */
import { System } from '../system.js';

export class RenderSystem extends System {
    constructor(cellSize) {
        super();
        this.requiredComponents = ['Render', 'Position'];
        this.cellSize = cellSize;
        this.priority = 3; // Ejecutar al final, después de todos los demás sistemas
    }
    
    /**
     * Actualizar sistema de renderizado
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame
     */
    update(_deltaTime) {
        const entities = this.getEntities();
        
        for (const entityId of entities) {
            const render = this.ecs.getComponent(entityId, 'Render');
            const position = this.ecs.getComponent(entityId, 'Position');
            const input = this.ecs.getComponent(entityId, 'Input');
            const animation = this.ecs.getComponent(entityId, 'Animation');
            
            if (!render || !position || !render.mesh) continue;
            
            // Actualizar posición del mesh (convertir de celdas a metros)
            // IMPORTANTE: Si el mesh tiene un offset de modelo 3D, sumarlo a la posición
            const modelOffset = render.mesh.userData.modelOffset || { x: 0, y: 0, z: 0 };
            render.mesh.position.set(
                position.x * this.cellSize + modelOffset.x,
                position.z * this.cellSize + modelOffset.y, // Z en Three.js es altura, offset Y del modelo
                position.y * this.cellSize + modelOffset.z
            );
            
            // Actualizar visibilidad
            render.mesh.visible = render.visible;
            
            // Orientación del personaje
            // El personaje solo rota cuando se mueve la cámara (no cuando se presionan WASD)
            // La rotación se actualiza desde CameraController cuando se rota la cámara
            // IMPORTANTE: Si el mesh tiene una rotación inicial del modelo 3D, sumarla
            const modelRotation = render.mesh.userData.modelRotation || { x: 0, y: 0, z: 0 };
            if (render.rotationY !== undefined) {
                // Sumar la rotación del personaje a la rotación inicial del modelo
                render.mesh.rotation.y = modelRotation.y + render.rotationY;
            } else {
                // Si no hay rotación del personaje, usar solo la rotación inicial del modelo
                render.mesh.rotation.y = modelRotation.y;
            }
            
            // Animación simple: balanceo al caminar/correr
            if (animation) {
                if (animation.currentState === 'walk' || animation.currentState === 'run') {
                    const speed = animation.currentState === 'run' ? 10 : 5;
                    const time = Date.now() * 0.001 * speed * animation.animationSpeed;
                    render.mesh.rotation.z = Math.sin(time) * 0.1;
                } else {
                    // Resetear rotación Z cuando no está caminando/corriendo
                    render.mesh.rotation.z = 0;
                }
            }
        }
    }
}

