/**
 * Configuración de Combinaciones de Input
 * 
 * Define acciones que se ejecutan con combinaciones de teclas.
 * Estas son acciones únicas, no combos (aunque pueden iniciar combos).
 * Cada combinación puede tener condiciones (tipo de arma, estado del personaje).
 */

export const INPUT_COMBINATIONS = [
    {
        id: 'heavy_attack',
        triggers: ['click', 'shift'],  // Click izquierdo + Shift
        animation: 'heavy_hammer_swing',
        attackType: 'heavy',
        conditions: {
            weaponType: ['hammer', 'axe', 'generic']  // Tipos de armas que pueden usar este ataque
        }
    },
    {
        id: 'charged_attack',
        triggers: ['click', 'alt'],   // Click izquierdo + Alt
        animation: 'charged_axe_chop',
        attackType: 'charged',
        chargeTime: 500,  // Tiempo de carga en ms (futuro: implementar sistema de carga)
        conditions: {
            weaponType: ['axe', 'generic']
        }
    },

    {
        id: 'parry',
        triggers: ['keyQ'],             // Tecla Q
        animation: 'sword_parry_backward',
        defenseType: 'parry',
        requiresWeapon: true,           // Requiere arma equipada
        conditions: {}
    },
    {
        id: 'dodge',
        triggers: ['keyE'],             // Tecla E durante movimiento
        animation: 'roll_dodge',
        defenseType: 'dodge',
        conditions: {
            hasMovement: true  // Solo se puede ejecutar si hay movimiento
        }
    },
    {
        id: 'grab',
        triggers: ['keyF'],             // Tecla F - Agarrar/Interactuar
        animation: 'collect_object',
        actionType: 'grab',
        conditions: {}
    }
];

