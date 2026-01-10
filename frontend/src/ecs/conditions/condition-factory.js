/**
 * Factory para crear condiciones basadas en configuración
 */
import { InputCondition } from './input-condition.js';
import { PhysicsCondition } from './physics-condition.js';
import { MovementCondition } from './movement-condition.js';
import { ComboCondition } from './combo-condition.js';
import { CombatCondition } from './combat-condition.js';
import { WaterCondition } from './water-condition.js';
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';

export class ConditionFactory {
    static create(conditionConfig) {
        const { type } = conditionConfig;
        
        switch (type) {
            case ANIMATION_CONSTANTS.CONDITION_TYPES.INPUT:
                return new InputCondition(conditionConfig);
            case ANIMATION_CONSTANTS.CONDITION_TYPES.PHYSICS:
                return new PhysicsCondition(conditionConfig);
            case ANIMATION_CONSTANTS.CONDITION_TYPES.MOVEMENT:
                return new MovementCondition(conditionConfig);
            case ANIMATION_CONSTANTS.CONDITION_TYPES.COMBO:
                return new ComboCondition(conditionConfig);
            case ANIMATION_CONSTANTS.CONDITION_TYPES.COMBAT:
                return new CombatCondition(conditionConfig);
            case ANIMATION_CONSTANTS.CONDITION_TYPES.WATER:
                return new WaterCondition(conditionConfig);
            default:
                console.warn(`Tipo de condición desconocido: ${type}`);
                return null;
        }
    }
    
    static createAll(conditionConfigs) {
        return conditionConfigs
            .map(config => this.create(config))
            .filter(condition => condition !== null);
    }
}

