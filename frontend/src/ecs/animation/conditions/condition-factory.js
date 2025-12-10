/**
 * Factory para crear condiciones basadas en configuración
 */
import { InputCondition } from './input-condition.js';
import { PhysicsCondition } from './physics-condition.js';
import { MovementCondition } from './movement-condition.js';
import { ComboCondition } from './combo-condition.js';
import { CombatCondition } from './combat-condition.js';

export class ConditionFactory {
    static create(conditionConfig) {
        const { type } = conditionConfig;
        
        switch (type) {
            case 'input':
                return new InputCondition(conditionConfig);
            case 'physics':
                return new PhysicsCondition(conditionConfig);
            case 'movement':
                return new MovementCondition(conditionConfig);
            case 'combo':
                return new ComboCondition(conditionConfig);
            case 'combat':
                return new CombatCondition(conditionConfig);
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

