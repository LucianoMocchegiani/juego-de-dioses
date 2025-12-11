# Análisis de Arquitectura - Refactorización de Sistemas Core de Animación e Input (JDG-023)

## Situación Actual

### Frontend

**Estructura actual:**
- `frontend/src/ecs/systems/animation-state-system.js`: Determina el estado de animación.
- `frontend/src/ecs/systems/animation-mixer-system.js`: Reproduce animaciones.
- `frontend/src/ecs/systems/input-system.js`: Procesa input.
- `frontend/src/ecs/animation/config/animation-config.js`: Configuración de estados.

**Problemas identificados:**
1. **IDs Hardcodeados en `AnimationStateSystem`**: El sistema verifica explícitamente IDs como `'combo_attack'`, `'heavy_attack'`, `'special_attack'`, etc. Esto viola el principio Open/Closed, ya que agregar un nuevo tipo de ataque requiere modificar el código del sistema.
2. **Lógica de Fallback Dispersa**: `AnimationMixerSystem` tiene lógica específica para ciertos estados (ej: warnings para `regular_jump`) y manejo de interrupciones que podría ser más genérico.
3. **Input Hardcodeado**: `InputSystem` tiene mapeos directos de teclas (`KeyW`, `ControlLeft`) dentro del código. Si se quiere cambiar la configuración de teclas, hay que tocar el código. No hay un sistema de mapeo de input configurable.

## Necesidades Futuras

### Requisitos de Escalabilidad

1. **Configuración Declarativa Total**: Agregar un nuevo ataque o estado no debería requerir cambios en los sistemas (`System`), solo en la configuración (`Config`).
2. **Mapeo de Input Flexible**: Permitir que las teclas se definan en un archivo de configuración, facilitando el soporte futuro para remapeo de teclas por el usuario.
3. **Generalización de Comportamiento**: Los sistemas deben operar sobre propiedades abstractas (`isAttack`, `preventInterruption`, `priority`) en lugar de IDs específicos.

## Arquitectura Propuesta

### Refactorización de `AnimationStateSystem`

Eliminar los `if (activeState.id === 'special_attack')` y similares. En su lugar, usar propiedades en la configuración del estado:

```javascript
// animation-config.js
{
    id: 'special_attack',
    type: 'combat', // Nuevo: tipo de estado
    combatType: 'special', // Nuevo: subtipo
    // ...
}
```

El sistema iteraría sobre los estados y actuaría según `type` o propiedades genéricas.

### Refactorización de `InputSystem`

Implementar un `InputMapConfig`:

```javascript
// input-map-config.js
export const INPUT_MAP = {
    moveForward: ['KeyW', 'ArrowUp'],
    crouch: ['ControlLeft', 'ControlRight', 'KeyC'],
    specialAttack: ['KeyR', 'Control+Click'], // Concepto abstracto
    // ...
};
```

`InputSystem` leería este mapa para establecer flags como `wantsToCrouch`, `wantsToSpecialAttack`, etc.

### Refactorización de `AnimationMixerSystem`

Limpiar lógica residual. El sistema ya usa `ANIMATION_MIXER` y `StateConfig`, pero se debe asegurar que no queden referencias a IDs específicos (como los warnings de `regular_jump`).

## Beneficios de la Nueva Arquitectura

1. **Extensibilidad**: Agregar nuevos ataques o movimientos es puramente configuración.
2. **Mantenibilidad**: Código de sistemas más limpio y genérico. Menos propenso a bugs por "olvidar agregar el ID en el if".
3. **Configurabilidad**: Facilita enormemente la implementación futura de un menú de opciones de controles.

## Migración Propuesta

### Fase 1: Configuración de Input
1. Crear `frontend/src/ecs/config/input-map-config.js`.
2. Refactorizar `InputSystem` para usar este mapa.

### Fase 2: Generalización de Estados
1. Agregar propiedades `type` (ej: 'combat', 'movement', 'action') a `ANIMATION_STATES`.
2. Refactorizar `AnimationStateSystem` para usar estas propiedades en lugar de IDs específicos.

### Fase 3: Limpieza de Mixer
1. Revisar y limpiar `AnimationMixerSystem` de cualquier lógica específica de estado restante.

## Conclusión

Esta refactorización completará la transición a un sistema totalmente "Data-Driven". Al desacoplar la lógica de los datos específicos, el motor del juego se vuelve mucho más robusto y fácil de trabajar para diseñadores y desarrolladores por igual.
