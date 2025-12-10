/**
 * Condición basada en combos activos
 */
import { BaseCondition } from './base-condition.js';

export class ComboCondition extends BaseCondition {
    evaluate(context) {
        const { combo } = context;
        if (!combo) return false;
        
        const { operator } = this.config;
        const { value } = this.config;
        
        switch (operator) {
            case 'hasActiveCombo':
                return combo.activeComboId !== null;
            case 'comboIdEquals':
                return combo.activeComboId === value;
            case 'comboStepEquals':
                return combo.comboStep === value;
            case 'comboAnimationEquals':
                return combo.comboAnimation === value;
            default:
                return false;
        }
    }
}

