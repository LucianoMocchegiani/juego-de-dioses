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
            { type: 'combat', property: 'attackType', operator: 'equals', value: 'special' }
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
            { type: 'combat', property: 'attackType', operator: 'equals', value: 'light' }
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
            { type: 'physics', property: 'velocity.z', operator: 'greaterThan', value: 0.1 },
            { type: 'physics', property: 'isFlying', operator: 'equals', value: false }
        ],
        animation: 'regular_jump', // Fallback: Si no existe, AnimationMixerSystem usará 'combat_stance'
        transitions: ['idle', 'walk', 'run', 'flying']
    },
    {
        id: 'flying',
        type: 'movement',
        priority: 10, // Mayor prioridad que jump para que se active cuando está volando
        conditions: [
            { type: 'physics', property: 'isFlying', operator: 'equals', value: true }
        ],
        animation: 'combat_stance', // Usar animación de combate mientras vuela (o idle si está disponible)
        transitions: ['idle', 'walk', 'run', 'jump']
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
    // Ataques - shield-and-one-hand-weapon/ (migrado desde sword/, axe/, shield/)
    'left_slash': 'biped/male/animations/shield-and-one-hand-weapon/Left_Slash_withSkin.glb',
    'charged_slash': 'biped/male/animations/shield-and-one-hand-weapon/Charged_Slash_withSkin.glb',
    'sword_judgment': 'biped/male/animations/shield-and-one-hand-weapon/Thrust_Slash_withSkin.glb', // Usar Thrust_Slash como alternativa (Sword_Judgment no existe)
    
    // Ataques - two-hands-weapon/ (migrado desde two-hand-sword/, two-hand-hammer/)
    'attack': 'biped/male/animations/shield-and-one-hand-weapon/Left_Slash_withSkin.glb', // Usar Left_Slash como alternativa (Attack no existe)
    'heavy_hammer_swing': 'biped/male/animations/two-hands-weapon/Heavy_Hammer_Swing_withSkin.glb',
    
    // Ataques - shield-and-one-hand-weapon/ (migrado desde axe/)
    'axe_spin_attack': 'biped/male/animations/shield-and-one-hand-weapon/Axe_Spin_Attack_withSkin.glb',
    
    // Ataques - two-hand-axe/ (NO EXISTE en nueva estructura)
    // 'charged_axe_chop': '...', // Animation_Charged_Axe_Chop_withSkin.glb no existe
    
    // Ataques - hammer/ (NO EXISTE en nueva estructura)
    // 'charged_upward_slash': '...', // Animation_Charged_Upward_Slash_withSkin.glb no existe
    
    // Ataques - two-swords/ (NO EXISTE, pero hay Double_Combo_Attack en shield-and-one-hand-weapon/)
    'double_blade_spin': 'biped/male/animations/shield-and-one-hand-weapon/Double_Combo_Attack_withSkin.glb', // Usar Double_Combo_Attack como alternativa
    
    // Ataques - shield-and-one-hand-weapon/ (Simple_Kick está aquí, no en cuffs/)
    'simple_kick': 'biped/male/animations/shield-and-one-hand-weapon/Simple_Kick_withSkin.glb',

    // Defensa - shield-and-one-hand-weapon/ (migrado desde sword/)
    'sword_parry_backward': 'biped/male/animations/shield-and-one-hand-weapon/Sword_Parry_Backward_1_withSkin.glb', // Usar Sword_Parry_Backward_1 (existe)
    
    // Defensa - shield-and-one-hand-weapon/ (migrado desde shield/)
    'shield_push_left': 'biped/male/animations/shield-and-one-hand-weapon/Shield_Push_Left_withSkin.glb',
    
    // Defensa - hit-reactions/
    // 'stand_dodge': '...', // Animation_Stand_Dodge_withSkin.glb no existe en nueva estructura
    
    // Defensa - movement/ (Roll_Dodge_1 existe)
    'roll_dodge': 'biped/male/animations/movement/Roll_Dodge_1_withSkin.glb',

    // Movimiento - movement/
    'walk': 'biped/male/animations/movement/Walking_withSkin.glb',
    'walking': 'biped/male/animations/movement/Walking_withSkin.glb', // Alias para compatibilidad
    'run': 'biped/male/animations/movement/Running_withSkin.glb',
    'running': 'biped/male/animations/movement/Running_withSkin.glb', // Alias para compatibilidad
    // 'run_fast': '...', // Animation_RunFast_withSkin.glb no existe, usar 'run' como fallback
    'run_fast': 'biped/male/animations/movement/Running_withSkin.glb', // Fallback a Running
    'regular_jump': 'biped/male/animations/movement/Regular_Jump_withSkin.glb',
    // 'backflip': '...', // Animation_Backflip_withSkin.glb no existe en nueva estructura
    'swimming_to_edge': 'biped/male/animations/movement/swimming_to_edge_withSkin.glb',
    
    // Movimiento - interactions/
    'dive_down_and_land': 'biped/male/animations/interactions/Dive_Down_and_Land_2_withSkin.glb',
    
    // Movimiento - movement/ (migrado desde idle/)
    'swim_idle': 'biped/male/animations/movement/Swim_Idle_withSkin.glb',
    
    // Movimiento - movement/ (migrado desde secondary-interactions/)
    'crouch_walk_forward': 'biped/male/animations/movement/Cautious_Crouch_Walk_Forward_inplace_withSkin.glb',
    'crouch_walk_right': 'biped/male/animations/movement/Cautious_Crouch_Walk_Right_inplace_withSkin.glb',
    // 'limping_walk': '...', // Animation_Limping_Walk_inplace_withSkin.glb no existe
    
    // Transiciones - transitions/ (migrado desde interactions/)
    'stand_up': 'biped/male/animations/transitions/Stand_Up2_withSkin.glb',
    
    // Movimiento - movement/ (migrado desde spear/)
    'spear_walk': 'biped/male/animations/movement/Spear_Walk_withSkin.glb',

    // Reacciones/Daño - hit-reactions/
    // 'hit_reaction': '...', // Animation_Hit_Reaction_withSkin.glb no existe
    // 'hit_reaction_1': '...', // Animation_Hit_Reaction_1_withSkin.glb no existe
    'electrocution_reaction': 'biped/male/animations/hit-reactions/Electrocution_Reaction_withSkin.glb',
    // 'falling_down': '...', // Animation_falling_down_withSkin.glb no existe
    // 'shot_and_fall_backward': '...', // Animation_Shot_and_Fall_Backward_withSkin.glb no existe
    // 'crouch_and_step_back': '...', // Animation_Crouch_and_Step_Back_withSkin.glb no existe
    
    // Usar alternativas disponibles en hit-reactions/
    'hit_reaction': 'biped/male/animations/hit-reactions/Knock_Down_withSkin.glb', // Usar Knock_Down como alternativa
    'hit_reaction_1': 'biped/male/animations/hit-reactions/Block2_withSkin.glb', // Usar Block2 como alternativa

    // Acciones Especiales - interactions/
    'collect_object': 'biped/male/animations/interactions/Collect_Object_withSkin.glb',
    'stand_and_drink': 'biped/male/animations/interactions/Stand_and_Drink_withSkin.glb',
    
    // Acciones Especiales - secondary-interactions/ (NO EXISTE en nueva estructura)
    // 'talk_with_hands_open': '...', // Animation_Talk_with_Hands_Open_withSkin.glb no existe
    
    // Acciones Especiales - skills/ (NO EXISTE en nueva estructura)
    // 'charged_spell_cast': '...', // Animation_Charged_Spell_Cast_withSkin.glb no existe
    // 'skill_01': '...', // Animation_Skill_01_withSkin.glb no existe
    // Usar Skill_02 de two-hands-weapon/ como alternativa
    'skill_01': 'biped/male/animations/two-hands-weapon/Skill_02_withSkin.glb', // Usar Skill_02 como alternativa
    // 'crouch_charge_and_throw': '...', // Animation_Crouch_Charge_and_Throw_withSkin.glb no existe

    // Idle/Stance - shield-and-one-hand-weapon/ (Combat_Stance está aquí, no en movement/)
    'combat_stance': 'biped/male/animations/shield-and-one-hand-weapon/Combat_Stance_withSkin.glb',
    'idle_11': 'biped/male/animations/movement/Idle_11_withSkin.glb',
    
    // Animaciones adicionales disponibles en nueva estructura
    'basic_jump': 'biped/male/animations/shield-and-one-hand-weapon/Basic_Jump_withSkin.glb',
    'thrust_slash': 'biped/male/animations/shield-and-one-hand-weapon/Thrust_Slash_withSkin.glb',
    'sword_parry_backward_2': 'biped/male/animations/hit-reactions/Sword_Parry_Backward_2_withSkin.glb',
    'fall_2': 'biped/male/animations/transitions/Fall2_withSkin.glb',
    'electrocuted_fall': 'biped/male/animations/transitions/Electrocuted_Fall_withSkin.glb',
    'swim_forward': 'biped/male/animations/movement/Swim_Forward_withSkin.glb',
    'idle_02': 'biped/male/animations/movement/Idle_02_withSkin.glb',
    'walk_fight_back': 'biped/male/animations/movement/Walk_Fight_Back_withSkin.glb',
    'walk_fight_forward': 'biped/male/animations/movement/Walk_Fight_Forward_withSkin.glb',
    'forward_right_run_fight': 'biped/male/animations/movement/ForwardRight_Run_Fight_withSkin.glb'
};

