/**
 * Sistema de Renderizado
 * 
 * Actualiza la posición y rotación de los meshes de Three.js basándose en componentes Position y Render.
 */
import { System } from '../system.js';
import { ECS_CONSTANTS } from '../../config/ecs-constants.js';
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';

export class RenderSystem extends System {
    constructor(cellSize) {
        super();
        this.requiredComponents = [
            ECS_CONSTANTS.COMPONENT_NAMES.RENDER,
            ECS_CONSTANTS.COMPONENT_NAMES.POSITION
        ];
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
            const render = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.RENDER);
            const position = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.POSITION);

            if (!render || !position || !render.mesh) continue;

            // Actualizar posición del mesh (convertir de celdas a metros)
            // IMPORTANTE: Si el mesh tiene un offset de modelo 3D, sumarlo a la posición
            const modelOffset = render.mesh.userData.modelOffset || {
                x: ANIMATION_CONSTANTS.NUMERIC.DEFAULT_OFFSET_X,
                y: ANIMATION_CONSTANTS.NUMERIC.DEFAULT_OFFSET_Y,
                z: ANIMATION_CONSTANTS.NUMERIC.DEFAULT_OFFSET_Z
            };
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
            const modelRotation = render.mesh.userData.modelRotation || {
                x: ANIMATION_CONSTANTS.NUMERIC.DEFAULT_ROTATION_X,
                y: ANIMATION_CONSTANTS.NUMERIC.DEFAULT_ROTATION_Y,
                z: ANIMATION_CONSTANTS.NUMERIC.DEFAULT_ROTATION_Z
            };
            if (render.rotationY !== undefined) {
                // Sumar la rotación del personaje a la rotación inicial del modelo
                render.mesh.rotation.y = modelRotation.y + render.rotationY;
            } else {
                // Si no hay rotación del personaje, usar solo la rotación inicial del modelo
                render.mesh.rotation.y = modelRotation.y;
            }


        }
    }
}

