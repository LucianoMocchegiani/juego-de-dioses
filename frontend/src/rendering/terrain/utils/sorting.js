/**
 * Utilidades de ordenamiento optimizado
 * 
 * Proporciona funciones de ordenamiento eficientes para partículas,
 * con soporte para cache cuando las partículas no cambian.
 */

/**
 * Ordenar partículas por celda_z (profundidad) descendente
 * 
 * Para enteros, se podría usar radix sort (O(n)) en lugar de sort estándar (O(n log n)),
 * pero para simplicidad y compatibilidad, usamos sort estándar optimizado.
 * 
 * @param {Array} particles - Array de partículas con celda_z
 * @returns {Array} - Partículas ordenadas por celda_z descendente (más profundas primero)
 */
export function sortParticlesByDepth(particles) {
    // Usar sort estándar (O(n log n)) - suficiente para la mayoría de casos
    // Si hay problemas de performance con millones de partículas, considerar radix sort
    return [...particles].sort((a, b) => {
        return b.celda_z - a.celda_z;
    });
}

/**
 * Cache de ordenamiento si partículas no cambian
 * 
 * Útil cuando se renderiza el mismo conjunto de partículas múltiples veces
 * (ej: cuando solo cambia la cámara pero no las partículas).
 */
export class SortingCache {
    constructor() {
        this.lastParticlesHash = null;
        this.cachedResult = null;
    }
    
    /**
     * Obtener partículas ordenadas con cache
     * @param {Array} particles - Array de partículas
     * @returns {Array} - Partículas ordenadas (cached o recalculadas)
     */
    getSorted(particles) {
        const hash = this.getParticlesHash(particles);
        
        if (this.lastParticlesHash === hash && this.cachedResult) {
            return this.cachedResult;
        }
        
        // Recalcular
        this.lastParticlesHash = hash;
        this.cachedResult = sortParticlesByDepth(particles);
        return this.cachedResult;
    }
    
    /**
     * Generar hash simple de partículas para verificar si cambiaron
     * @param {Array} particles - Array de partículas
     * @returns {string} - Hash simple
     */
    getParticlesHash(particles) {
        // Hash simple basado en número de partículas y primera/última
        // Esto es rápido pero puede tener colisiones (aceptable para cache)
        if (particles.length === 0) return '0';
        
        const first = particles[0];
        const last = particles[particles.length - 1];
        
        // Usar id si existe, sino usar posición
        const firstId = first.id || `${first.celda_x}_${first.celda_y}_${first.celda_z}`;
        const lastId = last.id || `${last.celda_x}_${last.celda_y}_${last.celda_z}`;
        
        return `${particles.length}_${firstId}_${lastId}`;
    }
    
    /**
     * Invalidar cache
     */
    invalidate() {
        this.lastParticlesHash = null;
        this.cachedResult = null;
    }
}
