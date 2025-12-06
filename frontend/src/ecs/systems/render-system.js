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
    update(deltaTime) {
        const entities = this.getEntities();
        
        for (const entityId of entities) {
            const render = this.ecs.getComponent(entityId, 'Render');
            const position = this.ecs.getComponent(entityId, 'Position');
            const input = this.ecs.getComponent(entityId, 'Input');
            const animation = this.ecs.getComponent(entityId, 'Animation');
            
            if (!render || !position || !render.mesh) continue;
            
            // Actualizar posición del mesh (convertir de celdas a metros)
            render.mesh.position.set(
                position.x * this.cellSize,
                position.z * this.cellSize, // Z en Three.js es altura
                position.y * this.cellSize
            );
            
            // Actualizar visibilidad
            render.mesh.visible = render.visible;
            
            // Aplicar agacharse
            if (input && input.wantsToCrouch) {
                render.isCrouching = true;
                render.mesh.scale.set(
                    render.crouchScale.x,
                    render.crouchScale.y,
                    render.crouchScale.z
                );
            } else {
                render.isCrouching = false;
                render.mesh.scale.set(
                    render.normalScale.x,
                    render.normalScale.y,
                    render.normalScale.z
                );
            }
            
            // Orientación del personaje
            // El personaje solo rota cuando se mueve la cámara (no cuando se presionan WASD)
            // La rotación se actualiza desde CameraController cuando se rota la cámara
            // Aquí solo aplicamos la rotación guardada
            if (render.rotationY !== undefined) {
                render.mesh.rotation.y = render.rotationY;
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

