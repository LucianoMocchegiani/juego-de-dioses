/**
 * Condición basada en física
 */
import { BaseCondition } from './base-condition.js';

export class PhysicsCondition extends BaseCondition {
    evaluate(context) {
        const { physics } = context;
        if (!physics) return false;
        
        const { property, operator, value } = this.config;
        
        // Acceder a propiedades anidadas (ej: velocity.z)
        const parts = property.split('.');
        let physicsValue = physics;
        for (const part of parts) {
            if (physicsValue && typeof physicsValue === 'object' && part in physicsValue) {
                physicsValue = physicsValue[part];
            } else {
                return false;
            }
        }
        
        switch (operator) {
            case 'equals':
                return physicsValue === value;
            case 'notEquals':
                return physicsValue !== value;
            case 'greaterThan':
                return physicsValue > value;
            case 'lessThan':
                return physicsValue < value;
            case 'greaterThanOrEqual':
                return physicsValue >= value;
            case 'lessThanOrEqual':
                return physicsValue <= value;
            default:
                return false;
        }
    }
}

