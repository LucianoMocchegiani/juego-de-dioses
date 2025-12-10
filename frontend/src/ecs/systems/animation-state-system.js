/**
 * Sistema de Animación con State Machine
 * 
 * Determina el estado de animación de las entidades usando una máquina de estados
 * finita basada en configuración declarativa.
 */
import { System } from '../system.js';
import { ANIMATION_STATES } from '../animation/config/animation-config.js';
import { StateRegistry } from '../animation/states/state-registry.js';

export class AnimationStateSystem extends System {
    constructor() {
        super();
        this.requiredComponents = ['Animation', 'Input', 'Physics', 'Combo', 'Combat'];
        this.priority = 2;
        
        // Crear registry de estados
        this.stateRegistry = new StateRegistry(ANIMATION_STATES);
    }
    
    /**
     * Actualizar sistema de animaciones
     * @param {number} _deltaTime - Tiempo transcurrido desde el último frame (no usado, mantenido por compatibilidad con System base)
     */
    update(_deltaTime) {
        // Nota: _deltaTime no se usa aquí porque este sistema solo determina estados basándose
        // en condiciones actuales (input, physics), no necesita cálculos temporales.
        // El prefijo _ indica que es intencionalmente no usado.
        // Requerido en System base para compatibilidad.
        
        const entities = this.getEntities();
        
        for (const entityId of entities) {
            const animation = this.ecs.getComponent(entityId, 'Animation');
            const input = this.ecs.getComponent(entityId, 'Input');
            const physics = this.ecs.getComponent(entityId, 'Physics');
            const combo = this.ecs.getComponent(entityId, 'Combo');
            const combat = this.ecs.getComponent(entityId, 'Combat');
            
            if (!animation || !input || !physics || !combo || !combat) continue;
            
            // Crear contexto para evaluación de condiciones
            const context = {
                input,
                physics,
                combo,
                combat
            };
            
            // Determinar estado activo usando state machine
            const activeState = this.stateRegistry.determineActiveState(context);
            
            if (activeState) {
                // Si es combo_attack, resolver animación dinámicamente desde ComboComponent
                if (activeState.id === 'combo_attack') {
                    if (combo && combo.comboAnimation) {
                        // Usar la animación específica del combo
                        animation.currentState = 'combo_attack';
                        animation.comboAnimationName = combo.comboAnimation;
                        animation.combatAnimationName = null; // Limpiar animación de combate
                    } else {
                        // Si no hay combo activo, no usar combo_attack
                        // (esto no debería pasar, pero por seguridad)
                        animation.currentState = activeState.id;
                        animation.comboAnimationName = null;
                        animation.combatAnimationName = null;
                    }
                } 
                // Si es un estado de combate (heavy_attack, charged_attack, special_attack, parry, dodge)
                else if (activeState.id === 'heavy_attack' || activeState.id === 'charged_attack' || 
                         activeState.id === 'special_attack' || activeState.id === 'parry' || 
                         activeState.id === 'dodge') {
                    if (combat && combat.combatAnimation) {
                        // Usar la animación específica del combate
                        animation.currentState = activeState.id;
                        animation.combatAnimationName = combat.combatAnimation;
                        animation.comboAnimationName = null; // Limpiar animación de combo
                    } else {
                        // Si no hay animación de combate, usar estado normal
                        animation.currentState = activeState.id;
                        animation.combatAnimationName = null;
                        animation.comboAnimationName = null;
                    }
                } else {
                    // Estados normales: mapear estado interno a estado del componente
                animation.currentState = activeState.id;
                    animation.comboAnimationName = null;
                    animation.combatAnimationName = null;
                }
            }
        }
    }
}

