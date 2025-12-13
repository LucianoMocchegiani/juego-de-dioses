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
                // Para estados de combate, solo activar si hay una acción activa
                // NO usar combatAnimation como condición porque puede tener valor residual
                // activeAction es la única fuente de verdad para saber si hay acción en progreso
                if (activeState.type === 'combat') {
                    if (combat && combat.activeAction) {
                        animation.currentState = activeState.id;
                    }
                    // Si no hay acción activa, no hacer nada (no activar estado de combate)
                } else {
                    // Todos los demás estados (combo, normales) se activan directamente
                    animation.currentState = activeState.id;
                }
            }
        }
    }
}

