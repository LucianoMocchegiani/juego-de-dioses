/**
 * Condición basada en movimiento
 */
import { BaseCondition } from './base-condition.js';

export class MovementCondition extends BaseCondition {
    evaluate(context) {
        const { input } = context;
        if (!input || !input.moveDirection) return false;
        
        const { operator } = this.config;
        
        switch (operator) {
            case 'hasMovement':
                return input.moveDirection.x !== 0 || input.moveDirection.y !== 0;
            case 'noMovement':
                return input.moveDirection.x === 0 && input.moveDirection.y === 0;
            default:
                return false;
        }
    }
}

