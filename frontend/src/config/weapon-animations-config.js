/**
 * Configuración de Animaciones por Tipo de Arma
 * 
 * Mapea tipos de armas a animaciones específicas.
 * Si no hay arma equipada o no hay animación específica, se usa 'generic'.
 */
export const WEAPON_ANIMATIONS = {
    'sword': {
        attack: 'left_slash',
        heavyAttack: 'charged_slash',
        specialAttack: 'sword_judgment',
        parry: 'sword_parry_backward',
        walk: 'walking',
        run: 'running'
    },
    'axe': {
        attack: 'attack',
        heavyAttack: 'heavy_hammer_swing',
        chargedAttack: 'charged_axe_chop',
        specialAttack: 'axe_spin_attack',
        walk: 'walking',
        run: 'running'
    },
    'hammer': {
        attack: 'attack',
        heavyAttack: 'heavy_hammer_swing',
        walk: 'walking',
        run: 'running'
    },
    'spear': {
        attack: 'attack',
        walk: 'spear_walk',
        run: 'running'
    },
    'generic': {
        attack: 'left_slash',
        heavyAttack: 'attack',
        walk: 'walking',
        run: 'running'
    }
};

