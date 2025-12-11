/**
 * Configuración de Mapeo de Input
 * 
 * Define la relación entre acciones abstractas del juego y teclas físicas o combinaciones.
 * Permite cambiar los controles sin modificar la lógica del sistema.
 */

export const INPUT_MAP = {
    // Movimiento
    moveForward: ['KeyW', 'ArrowUp'],
    moveBackward: ['KeyS', 'ArrowDown'],
    moveLeft: ['KeyA', 'ArrowLeft'],
    moveRight: ['KeyD', 'ArrowRight'],

    // Acciones de movimiento
    run: ['ShiftLeft', 'ShiftRight'],
    jump: ['Space'],
    crouch: ['ControlLeft', 'ControlRight', 'KeyC'],

    // Combate
    attack: ['ClickLeft'], // Click izquierdo
    specialAttack: ['KeyR', 'Control+ClickLeft'], // Combinación de teclas
    chargedAttack: ['Alt+ClickLeft'], // Combinación de teclas

    // Interacción
    grab: ['KeyE', 'ClickRight'],

    // Debug / Otros
    debug: ['KeyP']
};
