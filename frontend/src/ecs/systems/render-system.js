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
            // IMPORTANTE: NO tocar la escala si es un modelo 3D (escala < 0.1)
            // Los modelos 3D tienen escalas personalizadas que NO deben ser sobrescritas
            const currentScale = render.mesh.scale;
            const isModel3D = currentScale.x < 0.1 || currentScale.y < 0.1 || currentScale.z < 0.1;
            
            // Marcar que ya se detectó el modelo 3D (evitar procesamiento repetido)
            if (!render._scaleDebugLogged && isModel3D) {
                render._scaleDebugLogged = true;
            }
            
            if (isModel3D) {
                // Es un modelo 3D, NO tocar la escala excepto para agacharse
                if (input && input.wantsToCrouch && !render.isCrouching) {
                    render.isCrouching = true;
                    render.mesh.scale.y *= 0.6; // Reducir altura al 60%
                } else if (!input?.wantsToCrouch && render.isCrouching) {
                    render.isCrouching = false;
                    render.mesh.scale.y = render.normalScale.y; // Restaurar altura
                }
                // NO aplicar escala normal, preservar la escala del modelo 3D
            } else if (render.normalScale) {
                // Mesh normal (primitivas), aplicar lógica normal
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

