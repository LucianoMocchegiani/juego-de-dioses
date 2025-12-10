/**
 * Condición basada en input del usuario
 */
import { BaseCondition } from './base-condition.js';

export class InputCondition extends BaseCondition {
    evaluate(context) {
        const { input } = context;
        if (!input) return false;
        
        const { property, operator, value } = this.config;
        
        if (!(property in input)) {
            return false;
        }
        
        const inputValue = input[property];
        
        switch (operator) {
            case 'equals':
                return inputValue === value;
            case 'notEquals':
                return inputValue !== value;
            case 'greaterThan':
                return inputValue > value;
            case 'lessThan':
                return inputValue < value;
            case 'greaterThanOrEqual':
                return inputValue >= value;
            case 'lessThanOrEqual':
                return inputValue <= value;
            default:
                return false;
        }
    }
}

