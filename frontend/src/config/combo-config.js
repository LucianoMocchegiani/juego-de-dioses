/**
 * Configuración de Combos
 * 
 * Define secuencias de ataques que se ejecutan con inputs consecutivos.
  * Cada combo define una secuencia de inputs que, cuando se ejecutan en orden
 * dentro de las ventanas de timing especificadas, ejecutan diferentes animaciones.
 * 
 * Propiedades de cada combo:
 * - id: Identificador único del combo
 * - steps: Array de pasos, cada uno con {input, animation, timing}
 *   - input: Tipo de input requerido ('click', 'click+shift', etc.)
 *   - animation: Nombre de la animación a ejecutar en este paso
 *   - timing: Ventana temporal en ms para ejecutar el siguiente paso
 * - cancelable: Si el combo puede cancelarse con otra acción
 * - weaponTypes: Tipos de armas que pueden usar este combo (['sword', 'generic', etc.])
 */

export const COMBO_CHAINS = [
    {
        id: 'basic_combo_3hit',
        steps: [
            { input: 'attack', animation: 'left_slash', timing: 500 },
            { input: 'attack', animation: 'attack', timing: 400 },
            { input: 'attack', animation: 'double_blade_spin', timing: 600 }
        ],
        cancelable: false,
        weaponTypes: ['sword', 'generic']
    },
    {
        id: 'basic_combo_2hit',
        steps: [
            { input: 'attack', animation: 'left_slash', timing: 500 },
            { input: 'attack', animation: 'attack', timing: 400 }
        ],
        cancelable: false,
        weaponTypes: ['generic']
    },
    {
        id: 'heavy_combo_2hit',
        steps: [
            { input: 'heavyAttack', animation: 'charged_slash', timing: 800 },
            { input: 'heavyAttack', animation: 'charged_upward_slash', timing: 1000 }
        ],
        cancelable: true,
        weaponTypes: ['sword', 'axe']
    }
];

