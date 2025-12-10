/**
 * Registry de estados de animación
 */
import { StateConfig } from './state-config.js';
import { ConditionFactory } from '../conditions/condition-factory.js';

export class StateRegistry {
    constructor(statesConfig) {
        this.states = new Map();
        this.conditionsCache = new Map();
        
        // Ordenar estados por prioridad (mayor a menor)
        const sortedStates = [...statesConfig].sort((a, b) => b.priority - a.priority);
        
        // Crear StateConfig para cada estado y cachear condiciones
        for (const stateConfig of sortedStates) {
            const state = new StateConfig(stateConfig);
            
            // Crear y cachear condiciones para este estado
            const conditions = ConditionFactory.createAll(stateConfig.conditions);
            this.conditionsCache.set(state.id, conditions);
            
            this.states.set(state.id, state);
        }
        
        // Guardar orden por prioridad
        this.priorityOrder = sortedStates.map(s => s.id);
    }
    
    /**
     * Obtener estado por ID
     */
    getState(stateId) {
        return this.states.get(stateId);
    }
    
    /**
     * Obtener condiciones de un estado
     */
    getConditions(stateId) {
        return this.conditionsCache.get(stateId) || [];
    }
    
    /**
     * Obtener todos los estados en orden de prioridad
     */
    getStatesInPriorityOrder() {
        return this.priorityOrder.map(id => this.states.get(id));
    }
    
    /**
     * Determinar estado activo basado en contexto
     * @param {Object} context - Contexto con input, physics, etc.
     * @returns {StateConfig|null} Estado que debe estar activo
     */
    determineActiveState(context) {
        // Iterar estados en orden de prioridad
        for (const stateId of this.priorityOrder) {
            const state = this.states.get(stateId);
            const conditions = this.getConditions(stateId);
            
            if (state.canActivate(context, conditions)) {
                return state;
            }
        }
        
        // Fallback: retornar estado idle si existe
        return this.states.get('idle') || null;
    }
}

