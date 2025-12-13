/**
 * Configuración de Acciones de Combate
 * 
 * Define acciones de combate con propiedades específicas: cooldown, movimiento, i-frames, etc.
 * REFERENCIA estados de animación en animation-config.js para evitar duplicación.
 * 
 * IMPORTANTE: No duplica propiedades que ya están en ANIMATION_STATES:
 * - isOneShot, preventInterruption, animation -> vienen de animation-config.js
 * - Esta config solo agrega propiedades específicas de combate (cooldown, movimiento)
 * 
 */

import { ANIMATION_STATES } from './animation-config.js';

export const COMBAT_ACTIONS = {
    dodge: {
        id: 'dodge',
        inputAction: 'dodge',  // Referencia a INPUT_MAP
        animationStateId: 'dodge',  // Referencia a ANIMATION_STATES[id='dodge']
        defenseType: 'dodge',
        
        // Cooldown (específico de combate, no está en animation-config)
        cooldown: 0.5,  // segundos
        
        // Movimiento (específico de combate, no está en animation-config)
        hasMovement: true,
        movementSpeed: 20,  // celdas/segundo (migrado desde physics-system.js)
        movementType: 'directional',  // 'directional' | 'forward' | 'backward' | 'none'
        useMovementInput: true,  // Si true, usa input.moveDirection, si false, usa cámara
        
        // I-Frames (para futuro, específico de combate)
        hasIFrames: false,
        iFrameStart: 0.0,  // porcentaje de la animación (0.0 = inicio)
        iFrameEnd: 0.3,    // porcentaje de la animación (0.3 = 30% del total)
    },
    
    parry: {
        id: 'parry',
        inputAction: 'parry',
        animationStateId: 'parry',  // Referencia a ANIMATION_STATES[id='parry']
        defenseType: 'parry',
        
        // Cooldown (específico de combate)
        cooldown: 0.0,  // Sin cooldown por ahora
        
        // Movimiento (específico de combate)
        hasMovement: false,
        
        // I-Frames (para futuro)
        hasIFrames: false,
    },
    
    specialAttack: {
        id: 'specialAttack',
        inputAction: 'specialAttack',
        animationStateId: 'special_attack',  // Referencia a ANIMATION_STATES[id='special_attack']
        attackType: 'special',
        
        // Cooldown (específico de combate)
        cooldown: 2.0,
        
        // Movimiento (específico de combate)
        hasMovement: false,
        
        // I-Frames (para futuro)
        hasIFrames: false,
    },
    
    heavyAttack: {
        id: 'heavyAttack',
        inputAction: 'heavyAttack',
        animationStateId: 'heavy_attack',  // Referencia a ANIMATION_STATES[id='heavy_attack']
        attackType: 'heavy',
        
        // Cooldown (específico de combate)
        cooldown: 0.0,
        
        // Movimiento (específico de combate)
        hasMovement: false,
        
        // I-Frames (para futuro)
        hasIFrames: false,
    },
    
    chargedAttack: {
        id: 'chargedAttack',
        inputAction: 'chargedAttack',
        animationStateId: 'charged_attack',  // Referencia a ANIMATION_STATES[id='charged_attack']
        attackType: 'charged',
        
        // Cooldown (específico de combate)
        cooldown: 0.0,
        
        // Movimiento (específico de combate)
        hasMovement: false,
        
        // I-Frames (para futuro)
        hasIFrames: false,
    },
    
    lightAttack: {
        id: 'lightAttack',
        inputAction: 'attack',
        animationStateId: 'attack',  // Referencia a ANIMATION_STATES[id='attack']
        attackType: 'light',
        
        // Cooldown (específico de combate)
        cooldown: 0.0,
        
        // Movimiento (específico de combate)
        hasMovement: false,
        
        // I-Frames (para futuro)
        hasIFrames: false,
    },
};

