/**
 * Configuración de Animaciones
 * 
 * Define estados, prioridades, condiciones y animaciones de forma declarativa.
 */

export const ANIMATION_MIXER = {
    baseModel: 'walk', // Modelo base para inicializar el mixer
    defaultState: 'combat_stance', // Estado por defecto
    defaultTransitionDuration: 0.2, // Duración de transiciones en segundos
    attackCompletionThreshold: 0.85 // Porcentaje para considerar ataque terminado
};

export const ANIMATION_STATES = [
    {
        id: 'combo_attack',
        type: 'combat',
        combatType: 'combo',
        priority: 12,  // Mayor prioridad que todos los otros ataques
        conditions: [
            { type: 'combo', operator: 'hasActiveCombo' }
        ],
        animation: 'attack', // Se sobrescribirá dinámicamente con comboAnimationName
        canInterrupt: true,
        isOneShot: true, // Se reproduce una vez y no se repite
        preventInterruption: true, // No se puede interrumpir
        transitions: ['combat_stance', 'idle']
    },
    {
        id: 'parry',
        type: 'combat',
        combatType: 'defense',
        priority: 12,  // Alta prioridad para defensa
        conditions: [
            { type: 'combat', property: 'defenseType', operator: 'equals', value: 'parry' }
        ],
        animation: 'sword_parry_backward', // Se sobrescribirá dinámicamente con combatAnimation
        canInterrupt: true,
        isOneShot: true,
        preventInterruption: true,
        transitions: ['combat_stance', 'idle']
    },
    {
        id: 'dodge',
        type: 'combat',
        combatType: 'defense',
        priority: 12,  // Alta prioridad para defensa
        conditions: [
            { type: 'combat', property: 'defenseType', operator: 'equals', value: 'dodge' }
        ],
        animation: 'roll_dodge', // Se sobrescribirá dinámicamente con combatAnimation
        canInterrupt: true,
        isOneShot: true,
        preventInterruption: true,
        transitions: ['idle', 'walk', 'run']
    },
    {
        id: 'heavy_attack',
        type: 'combat',
        combatType: 'attack',
        priority: 11,  // Mayor prioridad que attack normal
        conditions: [
            { type: 'combat', property: 'attackType', operator: 'equals', value: 'heavy' }
        ],
        animation: 'heavy_hammer_swing', // Se sobrescribirá dinámicamente con combatAnimation
        canInterrupt: true,
        isOneShot: true,
        preventInterruption: true,
        transitions: ['combat_stance', 'idle']
    },
    {
        id: 'charged_attack',
        type: 'combat',
        combatType: 'attack',
        priority: 11,  // Mayor prioridad que attack normal
        conditions: [
            { type: 'combat', property: 'attackType', operator: 'equals', value: 'charged' }
        ],
        animation: 'charged_axe_chop', // Se sobrescribirá dinámicamente con combatAnimation
        canInterrupt: true,
        isOneShot: true,
        preventInterruption: true,
        transitions: ['combat_stance', 'idle']
    },
    {
        id: 'special_attack',
        type: 'combat',
        combatType: 'special',
        priority: 11,  // Mayor prioridad que attack normal
        conditions: [
            { type: 'input', property: 'wantsToSpecialAttack', operator: 'equals', value: true }
        ],
        animation: 'sword_judgment', // Se sobrescribirá dinámicamente con combatAnimation
        canInterrupt: true,
        isOneShot: true,
        preventInterruption: true,
        transitions: ['combat_stance', 'idle']
    },
    {
        id: 'attack',
        type: 'combat',
        combatType: 'attack',
        priority: 10,  // Mayor = más prioridad
        conditions: [
            { type: 'input', property: 'wantsToAttack', operator: 'equals', value: true }
        ],
        animation: 'attack',
        canInterrupt: true,
        isOneShot: true,
        preventInterruption: true,
        transitions: ['combat_stance']  // Estados permitidos después
    },
    {
        id: 'jump',
        type: 'movement',
        priority: 9,
        conditions: [
            { type: 'physics', property: 'velocity.z', operator: 'greaterThan', value: 0.1 }
        ],
        animation: 'regular_jump', // Fallback: Si no existe, AnimationMixerSystem usará 'combat_stance'
        transitions: ['idle', 'walk', 'run']
    },
    {
        id: 'crouch_walk',
        type: 'movement',
        priority: 7,
        conditions: [
            { type: 'input', property: 'wantsToCrouch', operator: 'equals', value: true },
            { type: 'movement', operator: 'hasMovement' }
        ],
        animation: 'crouch_walk_forward',
        interruptOnInputRelease: true,
        transitions: ['crouch_idle', 'walk', 'run', 'idle']
    },
    {
        id: 'crouch_idle',
        type: 'idle',
        priority: 6,
        conditions: [
            { type: 'input', property: 'wantsToCrouch', operator: 'equals', value: true },
            { type: 'movement', operator: 'noMovement' }
        ],
        animation: 'crouch_walk_forward', // Temporal: usar misma animación con velocidad 0
        transitions: ['crouch_walk', 'idle']
    },
    {
        id: 'run',
        type: 'movement',
        priority: 5,
        conditions: [
            { type: 'input', property: 'isRunning', operator: 'equals', value: true },
            { type: 'movement', operator: 'hasMovement' },
            { type: 'input', property: 'wantsToCrouch', operator: 'equals', value: false } // Excluir agachado
        ],
        animation: 'run',
        interruptOnInputRelease: true, // Se interrumpe cuando se suelta la tecla de movimiento
        transitions: ['idle', 'walk', 'attack', 'crouch_walk']
    },
    {
        id: 'walk',
        type: 'movement',
        priority: 4,
        conditions: [
            { type: 'movement', operator: 'hasMovement' },
            { type: 'input', property: 'wantsToCrouch', operator: 'equals', value: false } // Excluir agachado
        ],
        animation: 'walk',
        interruptOnInputRelease: true, // Se interrumpe cuando se suelta la tecla de movimiento
        transitions: ['idle', 'run', 'attack', 'crouch_walk']
    },
    {
        id: 'idle',
        type: 'idle',
        priority: 1,
        conditions: [],  // Estado por defecto
        animation: 'combat_stance',
        transitions: ['walk', 'run', 'attack', 'jump', 'crouch_walk', 'crouch_idle']
    }
];

export const ANIMATION_FILES = {
    // Ataques
    'left_slash': 'animations/Animation_Left_Slash_withSkin.glb',
    'attack': 'animations/Animation_Attack_withSkin.glb',
    'heavy_hammer_swing': 'animations/Animation_Heavy_Hammer_Swing_withSkin.glb',
    'axe_spin_attack': 'animations/Animation_Axe_Spin_Attack_withSkin.glb',
    'charged_axe_chop': 'animations/Animation_Charged_Axe_Chop_withSkin.glb',
    'charged_upward_slash': 'animations/Animation_Charged_Upward_Slash_withSkin.glb',
    'charged_slash': 'animations/Animation_Charged_Slash_withSkin.glb',
    'double_blade_spin': 'animations/Animation_Double_Blade_Spin_withSkin.glb',
    'sword_judgment': 'animations/Animation_Sword_Judgment_withSkin.glb',
    'simple_kick': 'animations/Animation_Simple_Kick_withSkin.glb',

    // Defensa
    'sword_parry_backward': 'animations/Animation_Sword_Parry_Backward_withSkin.glb',
    'shield_push_left': 'animations/Animation_Shield_Push_Left_withSkin.glb',
    'stand_dodge': 'animations/Animation_Stand_Dodge_withSkin.glb',
    'roll_dodge': 'animations/Animation_Roll_Dodge_withSkin.glb',

    // Movimiento
    'walk': 'animations/Animation_Walking_withSkin.glb',
    'walking': 'animations/Animation_Walking_withSkin.glb', // Alias para compatibilidad
    'run': 'animations/Animation_Running_withSkin.glb',
    'running': 'animations/Animation_Running_withSkin.glb', // Alias para compatibilidad
    'run_fast': 'animations/Animation_RunFast_withSkin.glb',
    'regular_jump': 'animations/Animation_Regular_Jump_withSkin.glb',
    'backflip': 'animations/Animation_Backflip_withSkin.glb',
    'dive_down_and_land': 'animations/Animation_Dive_Down_and_Land_2_withSkin.glb',
    'swim_idle': 'animations/Animation_Swim_Idle_withSkin.glb',
    'swimming_to_edge': 'animations/Animation_swimming_to_edge_withSkin.glb',
    'crouch_walk_forward': 'animations/Animation_Cautious_Crouch_Walk_Forward_inplace_withSkin.glb',
    'crouch_walk_right': 'animations/Animation_Cautious_Crouch_Walk_Right_inplace_withSkin.glb',
    'limping_walk': 'animations/Animation_Limping_Walk_inplace_withSkin.glb',
    'stand_up': 'animations/Animation_Stand_Up2_withSkin.glb',
    'spear_walk': 'animations/Animation_Spear_Walk_withSkin.glb',

    // Reacciones/Daño
    'hit_reaction': 'animations/Animation_Hit_Reaction_withSkin.glb',
    'hit_reaction_1': 'animations/Animation_Hit_Reaction_1_withSkin.glb',
    'electrocution_reaction': 'animations/Animation_Electrocution_Reaction_withSkin.glb',
    'falling_down': 'animations/Animation_falling_down_withSkin.glb',
    'shot_and_fall_backward': 'animations/Animation_Shot_and_Fall_Backward_withSkin.glb',

    // Acciones Especiales
    'collect_object': 'animations/Animation_Collect_Object_withSkin.glb',
    'stand_and_drink': 'animations/Animation_Stand_and_Drink_withSkin.glb',
    'talk_with_hands_open': 'animations/Animation_Talk_with_Hands_Open_withSkin.glb',
    'charged_spell_cast': 'animations/Animation_Charged_Spell_Cast_withSkin.glb',
    'skill_01': 'animations/Animation_Skill_01_withSkin.glb',
    'crouch_charge_and_throw': 'animations/Animation_Crouch_Charge_and_Throw_withSkin.glb',
    'crouch_and_step_back': 'animations/Animation_Crouch_and_Step_Back_withSkin.glb',

    // Idle/Stance
    'combat_stance': 'animations/Animation_Combat_Stance_withSkin.glb',
    'idle_11': 'animations/Animation_Idle_11_withSkin.glb'
};

