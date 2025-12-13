/**
 * Constantes centralizadas para sistema de combate
 * 
 * Centraliza valores mágicos y strings para evitar errores de tipeo
 * y facilitar cambios futuros.
 */
export const COMBAT_CONSTANTS = {
    // Threshold para limpieza temprana de animaciones (95% de progreso)
    // Previene race conditions entre sistemas
    EARLY_CLEANUP_THRESHOLD: 0.95,
    
    // IDs de acciones de combate (para evitar strings hardcodeados)
    ACTION_IDS: {
        PARRY: 'parry',
        DODGE: 'dodge',
        SPECIAL_ATTACK: 'specialAttack',
        HEAVY_ATTACK: 'heavyAttack',
        CHARGED_ATTACK: 'chargedAttack',
        LIGHT_ATTACK: 'lightAttack',
    },
    
    // Tipos de armas (para validaciones)
    WEAPON_TYPES: {
        SWORD: 'sword',
        AXE: 'axe',
        HAMMER: 'hammer',
        GENERIC: 'generic',
    },
};

