/**
 * Helper para Detección de Líquidos
 * 
 * Detecta si hay líquidos en una posición dada basándose en partículas cargadas.
 */
import { ANIMATION_CONSTANTS } from '../../../config/animation-constants.js';

export class LiquidDetector {
    constructor(animationConstants = ANIMATION_CONSTANTS) {
        this.animationConstants = animationConstants;
    }

    /**
     * Detectar si hay líquidos en la posición dada
     * @param {Object} position - Posición {x, y, z}
     * @param {Array} particles - Partículas del viewport (opcional)
     * @returns {boolean} True si hay líquidos en la posición
     */
    detectLiquidAtPosition(position, particles) {
        if (!position) return false;

        // Opción 1: Usar partículas ya cargadas (si están disponibles)
        if (particles && particles.length > 0) {
            const cellX = Math.floor(position.x);
            const cellY = Math.floor(position.y);
            const cellZ = Math.floor(position.z);
            
            const particlesAtPosition = particles.filter(p => 
                p.celda_x === cellX &&
                p.celda_y === cellY &&
                p.celda_z === cellZ &&
                !p.extraida
            );
            
            // Verificar si hay líquidos
            const hasLiquid = particlesAtPosition.some(p => 
                p.estado_nombre === this.animationConstants.COLLISION.PARTICLE_STATE_LIQUID ||
                this.animationConstants.COLLISION.LIQUID_TYPES.includes(p.tipo_nombre)
            );
            
            return hasLiquid;
        }
        
        // Opción 2: Si no hay partículas cargadas, retornar false
        // (puede extenderse en el futuro para consultar API)
        return false;
    }
}
