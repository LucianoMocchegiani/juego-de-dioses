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
        this.requiredComponents = ['Animation', 'Input', 'Physics'];
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
            
            if (!animation || !input || !physics) continue;
            
            // Crear contexto para evaluación de condiciones
            const context = {
                input,
                physics
            };
            
            // Determinar estado activo usando state machine
            const activeState = this.stateRegistry.determineActiveState(context);
            
            if (activeState) {
                // Mapear estado interno a estado del componente
                // (por ahora son iguales, pero puede cambiar en el futuro)
                animation.currentState = activeState.id;
            }
        }
    }
}

