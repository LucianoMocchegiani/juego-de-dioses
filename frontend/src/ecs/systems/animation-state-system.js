/**
 * Sistema de Animación con State Machine
 * 
 * Determina el estado de animación de las entidades usando una máquina de estados
 * finita basada en configuración declarativa.
 */
import { System } from '../system.js';
import { ANIMATION_STATES } from '../../config/animation-config.js';
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
                // Lógica basada en TIPO de estado, no en ID específico

                // 1. Estados de Combo
                if (activeState.combatType === 'combo') {
                    if (combo && combo.comboAnimation) {
                        // Usar la animación específica del combo
                        animation.currentState = activeState.id;
                        animation.comboAnimationName = combo.comboAnimation;
                        animation.combatAnimationName = null;
                    } else {
                        // Fallback seguro
                        animation.currentState = activeState.id;
                        animation.comboAnimationName = null;
                        animation.combatAnimationName = null;
                    }
                }
                // 2. Estados de Combate (Ataque, Defensa, Especial)
                else if (activeState.type === 'combat') {
                    if (combat && combat.combatAnimation) {
                        // Usar la animación específica del combate
                        animation.currentState = activeState.id;
                        animation.combatAnimationName = combat.combatAnimation;
                        animation.comboAnimationName = null;
                    } else {
                        // Si no hay animación de combate específica, usar estado normal
                        animation.currentState = activeState.id;

                        // Para ataques especiales definidos en config, permitimos que el mixer use el default
                        // Si combatAnimation es null, el mixer usará activeState.animation
                        animation.combatAnimationName = null;
                        animation.comboAnimationName = null;
                    }
                }
                // 3. Estados Normales (Movimiento, Idle, etc.)
                else {
                    animation.currentState = activeState.id;
                    animation.comboAnimationName = null;
                    animation.combatAnimationName = null;
                }
            }
        }
    }
}

