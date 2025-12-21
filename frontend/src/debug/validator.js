/**
 * Validador de estado para detectar estados inválidos
 */
import { DEBUG_CONFIG } from '../config/debug-config.js';
import { debugLogger } from './logger.js';

export class StateValidator {
    constructor(options = {}) {
        const config = { ...DEBUG_CONFIG.validator, ...options };
        this.enabled = config.enabled && DEBUG_CONFIG.enabled;
        this.warnOnInvalid = config.warnOnInvalid ?? true;
        this.validators = new Map();
    }
    
    /**
     * Registrar validador personalizado
     * @param {string} type - Tipo de estado
     * @param {Function} validator - Función validadora (value, context) => boolean
     */
    registerValidator(type, validator) {
        this.validators.set(type, validator);
    }
    
    /**
     * Validar estado de animación
     * @param {string} stateId - ID del estado
     * @param {Map|Object} validStates - Map u objeto de estados válidos
     * @param {string} context - Contexto (sistema, entidad)
     * @returns {boolean} Si es válido
     */
    validateAnimationState(stateId, validStates, context = '') {
        if (!this.enabled) return true;
        
        const isValid = validStates instanceof Map 
            ? validStates.has(stateId)
            : stateId in validStates;
        
        if (!isValid) {
            if (this.warnOnInvalid) {
                const validStatesList = validStates instanceof Map
                    ? Array.from(validStates.keys())
                    : Object.keys(validStates);
                
                debugLogger.warn('StateValidator', 'Invalid animation state', {
                    stateId,
                    context,
                    validStates: validStatesList
                });
            }
            return false;
        }
        return true;
    }
    
    /**
     * Validar acción de combate
     * @param {string} actionId - ID de la acción
     * @param {Object} validActions - Objeto de acciones válidas
     * @param {string} context - Contexto
     * @returns {boolean} Si es válido
     */
    validateCombatAction(actionId, validActions, context = '') {
        if (!this.enabled) return true;
        
        if (!validActions[actionId]) {
            if (this.warnOnInvalid) {
                debugLogger.warn('StateValidator', 'Invalid combat action', {
                    actionId,
                    context,
                    validActions: Object.keys(validActions)
                });
            }
            return false;
        }
        return true;
    }
    
    /**
     * Validar componente
     * @param {number} entityId - ID de la entidad
     * @param {string} componentType - Tipo de componente
     * @param {Object} component - Componente
     * @param {Object} schema - Esquema de validación { required: [...], optional: [...] }
     * @returns {boolean} Si es válido
     */
    validateComponent(entityId, componentType, component, schema) {
        if (!this.enabled) return true;
        
        // Validar propiedades requeridas
        for (const prop of schema.required || []) {
            if (!(prop in component)) {
                if (this.warnOnInvalid) {
                    debugLogger.warn('StateValidator', 'Missing required property', {
                        entityId,
                        componentType,
                        property: prop
                    });
                }
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Habilitar/deshabilitar validador
     * @param {boolean} enabled - Si está habilitado
     */
    setEnabled(enabled) {
        this.enabled = enabled && DEBUG_CONFIG.enabled;
    }
}

// Singleton global
export const stateValidator = new StateValidator();
