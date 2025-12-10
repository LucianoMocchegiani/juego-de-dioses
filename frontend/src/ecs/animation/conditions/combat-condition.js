/**
 * Condición basada en estado de combate
 */
import { BaseCondition } from './base-condition.js';

export class CombatCondition extends BaseCondition {
    evaluate(context) {
        const { combat } = context;
        if (!combat) return false;
        
        const { property, operator, value } = this.config;
        
        switch (property) {
            case 'isAttacking':
                return combat.isAttacking === value;
            case 'attackType':
                return operator === 'equals' ? combat.attackType === value : false;
            case 'defenseType':
                return operator === 'equals' ? combat.defenseType === value : false;
            case 'combatAnimation':
                return combat.combatAnimation === value;
            default:
                return false;
        }
    }
}

