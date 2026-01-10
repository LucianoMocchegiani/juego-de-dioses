/**
 * Condición basada en ambiente acuático
 */
import { BaseCondition } from './base-condition.js';

export class WaterCondition extends BaseCondition {
    evaluate(context) {
        const { physics } = context;
        if (!physics) return false;
        
        const { operator } = this.config;
        
        switch (operator) {
            case 'isInWater':
                return physics.isInWater === true;
            case 'notInWater':
                return physics.isInWater === false;
            default:
                return false;
        }
    }
}
