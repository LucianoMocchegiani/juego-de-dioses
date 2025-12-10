# Análisis de Arquitectura - Sistema de Combate Avanzado con Combos y Armamentos (JDG-021)

## Situación Actual

### Frontend - Sistema de Animaciones

**Estructura actual:**
```
frontend/src/ecs/
├── animation/
│   ├── config/
│   │   └── animation-config.js       # Configuración declarativa de estados
│   ├── conditions/                    # Condiciones evaluables (input, physics, movement)
│   ├── states/                        # Estado machine y registry
│   └── README.md
├── systems/
│   ├── animation-state-system.js      # Determina estado activo
│   ├── animation-mixer-system.js      # Reproduce animaciones GLB
│   └── input-system.js                # Procesa input del usuario
└── components/
    ├── animation.js                   # Componente de estado de animación
    └── input.js                       # Componente de input
```

**Problemas identificados:**

1. **Limitación de animaciones:** Solo 4 animaciones básicas en uso (walk, run, combat_stance, left_slash) de 42 disponibles
2. **Sistema de ataque simple:** Un solo tipo de ataque, no hay variantes ni combos
3. **Sin soporte para combinaciones:** No hay sistema para detectar combinaciones de teclas
4. **Sin input buffer:** No hay buffer temporal para registrar secuencias de inputs (necesario para combos)
5. **No hay diferenciación por arma:** Todas las animaciones son genéricas, sin preparación para sistema de armas
6. **Animaciones contextuales no implementadas:** Hit reactions, reacciones a daño, caídas, etc. no están integradas
7. **Sistema de defensa básico:** No hay animaciones de parry, dodge, block integradas

### Base de Datos

**Estructura actual:**
- No hay tabla para armas o equipamiento (sistema futuro)
- No hay sistema de inventario relacionado con armas

**Problemas identificados:**
- No aplica directamente (sistema de armas es futuro, frontend-first)

## Necesidades Futuras

### Sistema de Combate Avanzado

**1. Sistema de Combos:**
- Secuencias de ataques que se ejecutan con clicks consecutivos
- Input buffer temporal para registrar clicks dentro de una ventana de tiempo
- Diferentes secuencias según contexto (arma equipada, estado del personaje)
- Cancelación de combos si se interrumpe la secuencia

**2. Combinaciones de Teclas:**
- Click + Shift = Ataque pesado/cargado
- Click + Ctrl = Ataque alternativo/especial
- Click + Alt = Ataque único/habilidad
- Q = Parry/Block
- E durante movimiento = Dodge
- F = Agarrar/Interactuar

**3. Sistema de Armamentos (Futuro):**
- Componente opcional `Weapon` que indica tipo de arma
- Animaciones específicas por tipo de arma (espada, hacha, martillo, lanza, etc.)
- Fallback a animaciones genéricas si no hay arma o no hay animación específica
- Preparación para extensión: nuevas armas solo requieren configuración

**4. Animaciones Contextuales:**
- Reacciones automáticas a eventos (daño recibido, caídas, estados especiales)
- Animaciones de recolección, uso de objetos, acciones especiales
- Transiciones suaves entre estados contextuales

**5. Sistema de Defensa:**
- Animaciones de parry (contraataque defensivo)
- Animaciones de dodge (esquivar)
- Animaciones de block (bloquear con escudo)
- Timing windows para acciones defensivas

### Requisitos de Escalabilidad

1. **Fácil agregar nuevas animaciones:** Solo configuración, sin modificar código
2. **Fácil agregar nuevos combos:** Definición declarativa de secuencias
3. **Fácil agregar nuevas armas:** Extensión del sistema sin cambios core
4. **Reutilización de código:** Lógica de combos, input buffer, etc. reutilizable
5. **Separación de responsabilidades:** Input, combate, animaciones, armas separados
6. **Extensibilidad:** Nuevos tipos de ataques y acciones sin refactorizar
7. **Mantenibilidad:** Configuración centralizada y bien documentada

## Arquitectura Propuesta

### Frontend - Sistema de Combate Extendido

```
frontend/src/ecs/
├── animation/
│   ├── config/
│   │   ├── animation-config.js           # Estados y animaciones base
│   │   ├── combo-config.js                # Configuración de combos (NUEVO)
│   │   ├── weapon-animations-config.js    # Animaciones por tipo de arma (NUEVO)
│   │   └── input-combinations-config.js   # Combinaciones de teclas (NUEVO)
│   ├── conditions/
│   │   ├── combo-condition.js             # Condición para combos activos (NUEVO)
│   │   ├── weapon-condition.js            # Condición para tipo de arma (NUEVO)
│   │   └── input-combination-condition.js # Condición para combinaciones (NUEVO)
│   ├── states/
│   │   └── ... (existente)
│   └── combos/                            # Sistema de combos (NUEVO)
│       ├── combo-manager.js               # Gestiona input buffer y combos activos
│       ├── combo-chain.js                 # Representa una cadena de combo
│       └── input-buffer.js                # Buffer temporal de inputs
│   ├── systems/
│   │   ├── combo-system.js                # Sistema ECS para gestionar combos (NUEVO)
│   │   ├── combat-system.js               # Sistema ECS para lógica de combate (NUEVO)
│   │   └── ... (sistemas existentes)
│   └── components/
│       ├── combo.js                       # Componente de estado de combo (NUEVO)
│       ├── weapon.js                      # Componente opcional de arma (NUEVO)
│       └── combat.js                      # Componente de estado de combate (NUEVO)
```

### Componentes Nuevos

**1. ComboComponent:**
```javascript
{
    currentCombo: null,              // Combo actual en progreso
    comboStep: 0,                    // Paso actual en la secuencia
    lastInputTime: 0,                // Timestamp del último input
    inputBuffer: [],                 // Buffer de inputs recientes
    comboWindow: 500                 // Ventana temporal en ms
}
```

**2. WeaponComponent (opcional, futuro):**
```javascript
{
    weaponType: 'sword',             // Tipo de arma: 'sword', 'axe', 'hammer', 'spear', etc.
    weaponId: null,                  // ID del arma específica (futuro)
    hasShield: false                 // Si tiene escudo equipado
}
```

**3. CombatComponent:**
```javascript
{
    isAttacking: false,              // Si está en medio de un ataque
    canCancel: false,                // Si el ataque actual puede cancelarse
    attackType: null,                // Tipo: 'light', 'heavy', 'charged', 'special'
    defenseType: null,               // Tipo: 'parry', 'dodge', 'block'
    comboEnabled: true               // Si los combos están habilitados
}
```

### Sistemas Nuevos

**1. ComboSystem:**
- Gestiona input buffer temporal
- Detecta secuencias de clicks que coinciden con combos configurados
- Resetea combos si se interrumpe la secuencia
- Prioridad: 0.5 (antes de InputSystem)

**2. CombatSystem:**
- Determina tipo de ataque según combinaciones de teclas
- Gestiona estados de combate (ataque en progreso, cancelable, etc.)
- Coordina con AnimationStateSystem
- Prioridad: 1.5 (después de InputSystem, antes de AnimationStateSystem)

### Configuración de Combos

**combo-config.js:**
```javascript
export const COMBO_CHAINS = [
    {
        id: 'basic_combo_3hit',
        steps: [
            { input: 'click', animation: 'left_slash', timing: 500 },
            { input: 'click', animation: 'attack', timing: 400 },
            { input: 'click', animation: 'double_blade_spin', timing: 600 }
        ],
        cancelable: false,
        weaponTypes: ['sword', 'generic']  // Armamentos que pueden usar este combo
    },
    {
        id: 'heavy_combo_2hit',
        steps: [
            { input: 'click+shift', animation: 'charged_slash', timing: 800 },
            { input: 'click+shift', animation: 'charged_upward_slash', timing: 1000 }
        ],
        cancelable: true,
        weaponTypes: ['sword', 'axe']
    },
    // ... más combos
];
```

### Configuración de Combinaciones de Input

**input-combinations-config.js:**
```javascript
export const INPUT_COMBINATIONS = [
    {
        id: 'heavy_attack',
        triggers: ['click', 'shift'],  // Click + Shift
        animation: 'heavy_hammer_swing',
        attackType: 'heavy',
        conditions: {
            weaponType: ['hammer', 'axe', 'generic']
        }
    },
    {
        id: 'charged_attack',
        triggers: ['click', 'ctrl'],   // Click + Ctrl
        animation: 'charged_axe_chop',
        attackType: 'charged',
        chargeTime: 500,  // Tiempo de carga en ms
        conditions: {
            weaponType: ['axe', 'generic']
        }
    },
    {
        id: 'special_attack',
        triggers: ['click', 'alt'],    // Click + Alt
        animation: 'sword_judgment',
        attackType: 'special',
        conditions: {
            weaponType: ['sword']
        }
    },
    {
        id: 'parry',
        triggers: ['keyQ'],
        animation: 'sword_parry_backward',
        defenseType: 'parry',
        requiresWeapon: true
    },
    {
        id: 'dodge',
        triggers: ['keyE'],            // Durante movimiento
        animation: 'roll_dodge',
        defenseType: 'dodge',
        conditions: {
            hasMovement: true  // Solo si hay movimiento
        }
    },
    {
        id: 'grab',
        triggers: ['keyF'],            // Agarrar/Interactuar
        animation: 'collect_object',
        actionType: 'grab',
        conditions: {}
    }
];
```

### Configuración de Animaciones por Arma

**weapon-animations-config.js:**
```javascript
export const WEAPON_ANIMATIONS = {
    'sword': {
        lightAttack: 'left_slash',
        heavyAttack: 'charged_slash',
        specialAttack: 'sword_judgment',
        parry: 'sword_parry_backward',
        walk: 'walking',  // Puede tener variantes por arma
        run: 'running'
    },
    'axe': {
        lightAttack: 'attack',
        heavyAttack: 'heavy_hammer_swing',
        chargedAttack: 'charged_axe_chop',
        specialAttack: 'axe_spin_attack',
        walk: 'walking',
        run: 'running'
    },
    'hammer': {
        lightAttack: 'attack',
        heavyAttack: 'heavy_hammer_swing',
        walk: 'walking',
        run: 'running'
    },
    'spear': {
        lightAttack: 'attack',
        walk: 'spear_walk',  // Animación específica
        run: 'running'
    },
    'generic': {  // Fallback cuando no hay arma o no hay animación específica
        lightAttack: 'left_slash',
        heavyAttack: 'attack',
        walk: 'walking',
        run: 'running'
    }
};
```

## Patrones de Diseño a Usar

### 1. State Machine Pattern (Extendido)
- **Descripción:** Sistema de estados extendido para manejar estados de combate además de animación
- **Aplicación:** Estados de combate (idle, attacking, defending, combo_active) integrados con estados de animación
- **Beneficios:** Gestión clara de estados, transiciones predecibles, fácil debugging

### 2. Command Pattern
- **Descripción:** Cada input/acción es un comando que se procesa en el input buffer
- **Aplicación:** InputBuffer almacena comandos (ClickCommand, ComboCommand, etc.)
- **Beneficios:** Desacopla input de ejecución, permite replay, fácil testing

### 3. Strategy Pattern
- **Descripción:** Diferentes estrategias de selección de animación según contexto
- **Aplicación:** WeaponAnimationStrategy selecciona animación según arma equipada
- **Beneficios:** Fácil agregar nuevos tipos de armas, extensible sin modificar código

### 4. Chain of Responsibility
- **Descripción:** Cadena de handlers que procesan inputs en orden
- **Aplicación:** Input → ComboSystem → CombatSystem → AnimationStateSystem
- **Beneficios:** Cada sistema procesa lo que puede, los demás lo ignoran

### 5. Observer Pattern (Futuro)
- **Descripción:** Sistema de eventos para reacciones contextuales
- **Aplicación:** Evento "damage_received" → trigger hit_reaction animation
- **Beneficios:** Desacopla triggers de animaciones, fácil agregar nuevas reacciones

### 6. Factory Pattern (Extendido)
- **Descripción:** Factories para crear comandos de combo y seleccionar animaciones
- **Aplicación:** ComboFactory crea combos desde configuración, AnimationFactory selecciona animación según contexto
- **Beneficios:** Centraliza lógica de creación, fácil extensión

## Beneficios de la Nueva Arquitectura

1. **Escalabilidad:** Agregar nuevas animaciones, combos, armas solo requiere configuración
2. **Mantenibilidad:** Lógica separada en sistemas especializados, fácil de entender y modificar
3. **Flexibilidad:** Sistema de armas opcional, funciona con o sin armas equipadas
4. **Extensibilidad:** Fácil agregar nuevos tipos de ataques, combinaciones, reacciones
5. **Performance:** Input buffer eficiente, procesamiento optimizado de secuencias
6. **Claridad:** Configuración declarativa fácil de leer y modificar
7. **Testing:** Componentes desacoplados, fácil testear individualmente

## Migración Propuesta

### Fase 1: Input Buffer y Sistema de Combos Base

**Objetivo:** Implementar infraestructura básica para combos

1. Crear `InputBuffer` class
   - Almacena inputs con timestamp
   - Limpia inputs antiguos automáticamente
   - Métodos: `addInput(inputType, timestamp)`, `getRecentInputs(windowMs)`, `clear()`

2. Crear `ComboManager` class
   - Gestiona combos activos
   - Detecta secuencias de inputs que coinciden con combos configurados
   - Métodos: `checkForCombo()`, `startCombo(comboId)`, `nextStep()`, `resetCombo()`

3. Crear `ComboSystem` (ECS)
   - Se ejecuta antes de InputSystem
   - Lee inputs del InputManager
   - Almacena en InputBuffer
   - Detecta combos y actualiza ComboComponent

4. Crear `ComboComponent`
   - Almacena estado del combo actual
   - Referencia al combo activo
   - Paso actual en la secuencia

5. Configurar combos básicos en `combo-config.js`
   - Combo de 3 golpes básico
   - Combo de 2 golpes pesado

**Archivos nuevos:**
- `frontend/src/ecs/animation/combos/input-buffer.js`
- `frontend/src/ecs/animation/combos/combo-manager.js`
- `frontend/src/ecs/animation/combos/combo-chain.js`
- `frontend/src/ecs/systems/combo-system.js`
- `frontend/src/ecs/components/combo.js`
- `frontend/src/ecs/animation/config/combo-config.js`

### Fase 2: Combinaciones de Teclas

**Objetivo:** Implementar detección de combinaciones de teclas

1. Extender `InputSystem` o crear `InputCombinationSystem`
   - Detecta cuando múltiples teclas están presionadas simultáneamente
   - Mapea combinaciones a acciones (click+shift = heavy attack)

2. Crear configuración `input-combinations-config.js`
   - Define todas las combinaciones disponibles
   - Mapea a animaciones y tipos de ataque

3. Crear `CombatSystem`
   - Procesa combinaciones detectadas
   - Determina tipo de ataque (light, heavy, charged, special)
   - Actualiza `CombatComponent`

4. Crear `CombatComponent`
   - Almacena estado de combate actual
   - Tipo de ataque/defensa activo
   - Flags de cancelable, etc.

5. Integrar con `AnimationStateSystem`
   - CombatSystem se ejecuta antes de AnimationStateSystem
   - AnimationStateSystem lee CombatComponent para determinar estado

**Archivos nuevos:**
- `frontend/src/ecs/systems/combat-system.js`
- `frontend/src/ecs/components/combat.js`
- `frontend/src/ecs/animation/config/input-combinations-config.js`

### Fase 3: Preparación para Sistema de Armamentos

**Objetivo:** Preparar arquitectura para que armas futuras funcionen sin refactor

1. Crear `WeaponComponent` (opcional)
   - Tipo de arma (sword, axe, hammer, etc.)
   - Flags adicionales (hasShield, etc.)
   - Por ahora puede estar vacío, solo estructura

2. Crear configuración `weapon-animations-config.js`
   - Mapea tipos de arma a animaciones específicas
   - Fallback a animaciones genéricas

3. Crear `WeaponCondition` (extensión de condiciones existentes)
   - Evalúa tipo de arma del WeaponComponent
   - Usado en estados de animación

4. Modificar `AnimationMixerSystem`
   - Si existe WeaponComponent, busca animación específica del arma
   - Si no existe o no hay animación específica, usa genérica

5. Integrar con sistema de combos
   - Combos pueden tener `weaponTypes` permitidos
   - ComboSystem filtra combos según arma equipada

**Archivos nuevos:**
- `frontend/src/ecs/components/weapon.js` (estructura básica)
- `frontend/src/ecs/animation/config/weapon-animations-config.js`
- `frontend/src/ecs/animation/conditions/weapon-condition.js`

### Fase 4: Integración de Todas las Animaciones

**Objetivo:** Registrar todas las 42 animaciones y crear estados para ellas

1. Actualizar `ANIMATION_FILES` con todas las animaciones
   - Mapear cada archivo GLB a un nombre de animación
   - Organizar por categoría (ataques, defensa, movimiento, etc.)

2. Crear estados para animaciones nuevas
   - Estados de ataque variados
   - Estados de defensa (parry, dodge, block)
   - Estados de reacción (hit_reaction, falling, etc.)
   - Estados contextuales (collect, drink, talk, etc.)

3. Definir prioridades y transiciones
   - Prioridades para estados de combate vs movimiento
   - Transiciones permitidas entre estados

4. Integrar animaciones contextuales
   - Sistema de eventos (opcional, puede ser directo por ahora)
   - Hit reactions cuando se recibe daño
   - Falling cuando se cae desde altura

**Archivos modificados:**
- `frontend/src/ecs/animation/config/animation-config.js` (expandir ANIMATION_STATES y ANIMATION_FILES)

### Fase 5: Animaciones de Defensa

**Objetivo:** Implementar sistema de defensa completo

1. Agregar inputs para defensa e interacción
   - Q = Parry
   - E durante movimiento = Dodge
   - F = Agarrar/Interactuar
   - Click derecho (futuro) = Block

2. Crear estados de defensa
   - parry_state
   - dodge_state
   - block_state

3. Implementar timing windows (futuro, opcional)
   - Ventanas temporales para parry perfecto
   - Ventanas para dodge con invencibilidad

4. Integrar con sistema de combate
   - Defensas pueden interrumpir ataques enemigos (futuro)
   - Defensas cancelan combos propios

**Archivos modificados:**
- `frontend/src/ecs/animation/config/animation-config.js`
- `frontend/src/ecs/animation/config/input-combinations-config.js`

## Consideraciones Técnicas

### Frontend

1. **Performance:**
   - Input buffer debe limitarse a inputs recientes (últimos 1-2 segundos)
   - Combo detection debe ser eficiente (no iterar sobre todos los combos cada frame)
   - Cache de combos activos por tipo de arma

2. **Input Lag:**
   - Input buffer debe procesarse en el mismo frame que el input
   - No debe haber delay perceptible entre click y inicio de animación
   - Considerar input buffering durante animaciones (cancelar y ejecutar nuevo)

3. **Extensibilidad:**
   - Nueva arma = solo agregar entrada en weapon-animations-config.js
   - Nuevo combo = solo agregar entrada en combo-config.js
   - Nueva combinación = solo agregar entrada en input-combinations-config.js

4. **Compatibilidad:**
   - Sistema funciona sin WeaponComponent (fallback a genéricas)
   - Combos opcionales (pueden deshabilitarse)
   - Compatibilidad retroactiva con animaciones existentes

### Testing

1. **Unit Tests:**
   - InputBuffer: agregar inputs, limpiar antiguos, obtener recientes
   - ComboManager: detectar combos, avanzar pasos, resetear
   - ComboSystem: integración con ECS
   - CombatSystem: detección de combinaciones

2. **Integration Tests:**
   - Flujo completo: input → combo → animación
   - Flujo completo: combinación → tipo de ataque → animación
   - Sistema de armas: selección de animación según arma

3. **Manual Testing:**
   - Feel del combo (timing correcto, no muy estricto ni muy laxo)
   - Responsividad de combinaciones
   - Transiciones suaves entre animaciones

## Ejemplo de Uso Futuro

```javascript
// Configuración de un nuevo combo (solo configuración, sin código)
export const COMBO_CHAINS = [
    {
        id: 'sword_combo_finisher',
        steps: [
            { input: 'click', animation: 'left_slash', timing: 400 },
            { input: 'click', animation: 'attack', timing: 350 },
            { input: 'click+shift', animation: 'sword_judgment', timing: 800 }
        ],
        cancelable: false,
        weaponTypes: ['sword']  // Solo funciona con espada
    }
];

// Agregar nueva arma (solo configuración)
export const WEAPON_ANIMATIONS = {
    'dagger': {
        lightAttack: 'left_slash',
        heavyAttack: 'double_blade_spin',
        walk: 'walking',
        run: 'running'
    }
};

// Agregar nueva combinación (solo configuración)
export const INPUT_COMBINATIONS = [
    {
        id: 'kick_attack',
        triggers: ['click', 'keyE'],  // Click + E
        animation: 'simple_kick',
        attackType: 'special',
        conditions: {
            weaponType: ['generic']  // Funciona sin arma
        }
    }
];
```

## Referencias y Fuentes de Inspiración

### Sistemas de Combate en Videojuegos

**Dark Souls:**
- Sistema de combos basado en timing
- Diferentes animaciones según arma equipada
- Ataques pesados con carga (hold button)

**Devil May Cry:**
- Sistema de combos extensivo con múltiples variantes
- Combos que cambian según dirección de movimiento
- Sistema de estilo (diferentes combos según estilo activo)

**Monster Hunter:**
- Animaciones específicas por tipo de arma
- Combos complejos con múltiples variantes
- Ataques cargados (hold para cargar)

**Bayonetta:**
- Sistema de dodge offset (dodge durante combo mantiene el combo)
- Combos con timing windows amplios
- Wicked Weaves (ataques especiales al final de combos)

### Conceptos Clave Implementados

1. **Input Buffer:** Técnica común en fighting games para hacer inputs más permisivos
2. **Cancel Windows:** Ventanas donde se puede cancelar una animación con otra
3. **Combo Scaling:** En algunos juegos, combos largos hacen menos daño (futuro)
4. **Directional Inputs:** Combos que cambian según dirección (futuro)

## Conclusión

La arquitectura propuesta proporciona una base sólida y escalable para un sistema de combate avanzado que:

1. **Integra todas las animaciones disponibles** de forma organizada y extensible
2. **Implementa sistema de combos** con input buffer y detección de secuencias
3. **Soporta combinaciones de teclas** para ataques especiales y variantes
4. **Prepara para sistema de armas** sin requerir refactor cuando se implemente
5. **Mantiene compatibilidad** con el sistema actual de animaciones
6. **Es altamente configurable** - nuevas animaciones, combos, armas solo requieren configuración

La implementación se divide en fases incrementales que permiten:
- Testing y validación en cada fase
- Implementación gradual sin romper funcionalidad existente
- Feedback temprano sobre feel y gameplay
- Flexibilidad para ajustar diseño según necesidad

El sistema está diseñado para crecer orgánicamente, agregando complejidad solo donde se necesita, mientras mantiene la simplicidad en áreas básicas.

