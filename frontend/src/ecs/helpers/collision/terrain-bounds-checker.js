/**
 * Helper para Verificación de Límites del Terreno
 * 
 * Verifica y aplica límites del terreno, y maneja respawn si la entidad cae fuera.
 */
import { ANIMATION_CONSTANTS } from '../../../config/animation-constants.js';

export class TerrainBoundsChecker {
    constructor(animationConstants = ANIMATION_CONSTANTS) {
        this.animationConstants = animationConstants;
    }

    /**
     * Verificar y aplicar límites del terreno, respawn si es necesario
     * @param {Object} position - Posición actual {x, y, z} (se modifica)
     * @param {Object} physics - Componente de física (se modifica si hay respawn)
     * @param {Object} dimension - Información del bloque (opcional)
     * @returns {Object} { respawned: boolean, originalPosition: {x, y, z}?, newPosition: {x, y, z}? }
     */
    checkAndApplyBounds(position, physics, dimension = null) {
        if (!dimension) {
            return { respawned: false };
        }

        const maxX = dimension.ancho_metros / dimension.tamano_celda;
        const maxY = dimension.alto_metros / dimension.tamano_celda;
        const minZ = dimension.profundidad_maxima || this.animationConstants.COLLISION.DEFAULT_DIMENSION.MIN_Z;
        // No limitar altura máxima - permitir vuelo ilimitado hacia arriba para ver sol/luna
        // const maxZ = dimension.altura_maxima || ANIMATION_CONSTANTS.COLLISION.DEFAULT_DIMENSION.MAX_Z;
        
        // Guardar posición original
        const originalPosition = {
            x: position.x,
            y: position.y,
            z: position.z
        };

        // Limitar posición horizontal y profundidad mínima
        position.x = Math.max(0, Math.min(maxX - 1, position.x));
        position.y = Math.max(0, Math.min(maxY - 1, position.y));
        position.z = Math.max(minZ, position.z); // Solo limitar hacia abajo, no hacia arriba
        
        // Si cae fuera del terreno (hacia abajo), teleportar a superficie
        if (originalPosition.z < minZ) {
            const newPosition = {
                x: this.animationConstants.COLLISION.DEFAULT_RESPAWN.X,
                y: this.animationConstants.COLLISION.DEFAULT_RESPAWN.Y,
                z: this.animationConstants.COLLISION.DEFAULT_RESPAWN.Z
            };
            
            position.x = newPosition.x;
            position.y = newPosition.y;
            position.z = newPosition.z;
            
            physics.velocity = {
                x: this.animationConstants.COLLISION.POSITION_CORRECTION.VELOCITY_RESET,
                y: this.animationConstants.COLLISION.POSITION_CORRECTION.VELOCITY_RESET,
                z: this.animationConstants.COLLISION.POSITION_CORRECTION.VELOCITY_RESET
            };
            
            return {
                respawned: true,
                originalPosition: originalPosition,
                newPosition: newPosition
            };
        }

        return { respawned: false };
    }
}
