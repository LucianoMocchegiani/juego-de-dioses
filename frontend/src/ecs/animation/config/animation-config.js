/**
 * Configuración de Animaciones
 * 
 * Define estados, prioridades, condiciones y animaciones de forma declarativa.
 */

export const ANIMATION_STATES = [
    {
        id: 'attack',
        priority: 10,  // Mayor = más prioridad
        conditions: [
            { type: 'input', property: 'wantsToAttack', operator: 'equals', value: true }
        ],
        animation: 'attack',
        canInterrupt: true,
        transitions: ['combat_stance']  // Estados permitidos después
    },
    {
        id: 'jump',
        priority: 9,
        conditions: [
            { type: 'physics', property: 'velocity.z', operator: 'greaterThan', value: 0.1 }
        ],
        animation: 'combat_stance', // Usar combat_stance ya que no hay animación de salto específica
        transitions: ['idle', 'walk', 'run']
    },
    {
        id: 'crouch',
        priority: 8,
        conditions: [
            { type: 'input', property: 'wantsToCrouch', operator: 'equals', value: true }
        ],
        animation: 'combat_stance', // Usar combat_stance ya que no hay animación de agacharse específica
        transitions: ['idle', 'walk', 'run']
    },
    {
        id: 'run',
        priority: 5,
        conditions: [
            { type: 'input', property: 'isRunning', operator: 'equals', value: true },
            { type: 'movement', operator: 'hasMovement' }
        ],
        animation: 'run',
        interruptOnInputRelease: true, // Se interrumpe cuando se suelta la tecla de movimiento
        transitions: ['idle', 'walk', 'attack']
    },
    {
        id: 'walk',
        priority: 4,
        conditions: [
            { type: 'movement', operator: 'hasMovement' }
        ],
        animation: 'walk',
        interruptOnInputRelease: true, // Se interrumpe cuando se suelta la tecla de movimiento
        transitions: ['idle', 'run', 'attack']
    },
    {
        id: 'idle',
        priority: 1,
        conditions: [],  // Estado por defecto
        animation: 'combat_stance',
        transitions: ['walk', 'run', 'attack', 'jump', 'crouch']
    }
];

export const ANIMATION_FILES = {
    'walk': 'animations/Animation_Walking_withSkin.glb',
    'run': 'animations/Animation_Running_withSkin.glb',
    'combat_stance': 'animations/Animation_Combat_Stance_withSkin.glb',
    'attack': 'animations/Animation_Left_Slash_withSkin.glb'
    // Nota: Estados como 'jump' y 'crouch' usan 'combat_stance' como animación
    // (definido en el campo 'animation' de ANIMATION_STATES)
};

