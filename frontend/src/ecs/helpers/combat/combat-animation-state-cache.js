/**
 * Helper para Cache de Animation States
 * 
 * Maneja el cache O(1) para lookup de animation states por ID.
 */
export class CombatAnimationStateCache {
    constructor(animationStates) {
        /**
         * Cache de animation states (O(1) lookup)
         * @type {Map<string, Object>}
         */
        this.cache = new Map();
        
        // Inicializar cache desde animation states
        for (const state of animationStates) {
            this.cache.set(state.id, state);
        }
    }

    /**
     * Obtener animation state por ID (O(1) lookup)
     * @param {string} animationStateId - ID del animation state
     * @returns {Object|null} Animation state o null si no se encuentra
     */
    getAnimationState(animationStateId) {
        return this.cache.get(animationStateId) || null;
    }

    /**
     * Verificar si existe un animation state con el ID dado
     * @param {string} animationStateId - ID del animation state
     * @returns {boolean} True si existe
     */
    hasAnimationState(animationStateId) {
        return this.cache.has(animationStateId);
    }

    /**
     * Obtener todos los IDs de animation states disponibles
     * @returns {Array<string>} Array de IDs
     */
    getAvailableStateIds() {
        return Array.from(this.cache.keys());
    }
}
