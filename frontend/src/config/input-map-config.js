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
    specialAttack: ['KeyR'], // Solo tecla R para evitar conflicto con Crouch (Control) + Click

    // Acciones avanzadas (anteriormente en input-combinations)
    heavyAttack: ['Shift+ClickLeft'],
    chargedAttack: ['Alt+ClickLeft'],
    parry: ['KeyQ'],
    dodge: ['KeyE'],

    // Interacción
    grab: ['KeyF', 'ClickRight'], // KeyF es el nuevo default para grab según combinaciones anteriores

    // Debug / Otros
    debug: ['KeyP']
};
