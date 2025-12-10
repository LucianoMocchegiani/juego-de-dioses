# Análisis de Arquitectura - Sistema de Animaciones Escalable (JDG-016)

## Situación Actual

### Frontend - Sistema de Animaciones

**Estructura actual:**
```
frontend/src/ecs/
├── systems/
│   ├── animation-system.js        # Determina estados (if/else hardcodeado)
│   ├── animation-mixer-system.js  # Reproduce animaciones (mapeo manual)
│   └── input-system.js            # Detecta input del usuario
├── components/
│   ├── animation.js               # Almacena currentState
│   └── input.js                   # Almacena flags (wantsToAttack, etc.)
└── system.js                      # Clase base para sistemas
```

**Problemas identificados:**

1. **AnimationSystem - Cadena if/else hardcodeada:**
   - Prioridades fijas en el orden del código (líneas 29-53)
   - Cada nueva acción requiere modificar código fuente
   - Cambiar prioridades requiere reordenar if/else
   - No hay separación entre condiciones y prioridades
   - Lógica de negocio mezclada con estructura de control

2. **AnimationMixerSystem - Mapeo manual:**
   - Mapeo estado → animación hardcodeado (líneas 308-318)
   - Cada nuevo estado requiere nuevo `else if`
   - No hay fallback automático claro para estados sin animación
   - `ANIMATION_FILES` hardcodeado (líneas 16-21)
   - Agregar animaciones requiere modificar código

3. **Falta de abstracción:**
   - No hay sistema de transiciones explícito
   - Prioridades mezcladas con lógica de condiciones
   - Condiciones acopladas directamente al código
   - No hay configuración externa
   - Difícil extender sin tocar múltiples archivos

4. **Proceso para agregar nueva acción (ej: `block`):**
   - Modificar `InputComponent`: agregar `wantsToBlock`
   - Modificar `InputSystem`: detectar input (ej: tecla Q)
   - Modificar `AnimationSystem`: agregar `if (input.wantsToBlock)`
   - Modificar `AnimationMixerSystem`: agregar mapeo `'block' → 'block'`
   - Modificar `ANIMATION_FILES`: agregar `'block': 'animations/block.glb'`
   - Reordenar prioridades si es necesario (mover if/else)
   - **Total: 6 archivos modificados, múltiples lugares en cada uno**

5. **Problemas de mantenibilidad:**
   - Código difícil de entender cuando hay muchas acciones
   - Prioridades no son evidentes sin leer todo el código
   - Cambios en un lugar pueden afectar otros lugares inesperadamente
   - No hay validación de configuración
   - Difícil hacer refactorizaciones seguras

## Necesidades Futuras

### Categorías de Acciones/Estados

1. **Acciones básicas actuales:**
   - `idle`, `walk`, `run`, `jump`, `crouch`, `attack`
   - Requisito: Mantener compatibilidad total

2. **Acciones de combate (futuro próximo):**
   - `block`, `dodge`, `parry`, `heavy_attack`, `light_attack`
   - Requisito: Prioridades específicas (block puede interrumpir attack)

3. **Acciones de interacción (futuro):**
   - `pickup`, `drop`, `use_item`, `interact`
   - Requisito: Pueden ocurrir mientras se mueve

4. **Acciones mágicas/especiales (futuro):**
   - `cast_spell`, `channel`, `transform`
   - Requisito: Prioridades más altas que movimiento básico

5. **Acciones de construcción (futuro):**
   - `build`, `mine`, `craft`
   - Requisito: Pueden requerir animaciones específicas por herramienta

### Requisitos de Escalabilidad

1. **Fácil agregar nuevos tipos**: Agregar acción solo requiere configuración, no código
2. **Reutilización de código**: Lógica de evaluación y reproducción reutilizable
3. **Separación de responsabilidades**: Estado, reproducción y configuración separados
4. **Extensibilidad**: Fácil agregar nuevos tipos de condiciones o prioridades
5. **Mantenibilidad**: Código claro y autodocumentado
6. **Performance**: No degradar rendimiento con más estados
8. **Flexibilidad**: Soportar diferentes entidades con diferentes configuraciones

## Arquitectura Propuesta

### Frontend - Estructura Modular

```
frontend/src/ecs/
├── systems/
│   ├── animation-state-system.js     # NUEVO: FSM para estados
│   ├── animation-mixer-system.js     # REFACTOR: Solo reproducción
│   └── input-system.js               # Sin cambios
├── components/
│   ├── animation.js                  # Sin cambios (compatibilidad)
│   └── input.js                      # Sin cambios
├── animation/
│   ├── config/
│   │   └── animation-config.js       # NUEVO: Configuración de estados
│   ├── states/
│   │   ├── state-registry.js         # NUEVO: Registro de estados
│   │   └── base-state.js             # NUEVO: Clase base para estados
│   └── conditions/
│       ├── condition-factory.js      # NUEVO: Factory de condiciones
│       └── base-condition.js         # NUEVO: Clase base para condiciones
└── system.js                         # Sin cambios
```

### Jerarquía de Clases

```
AnimationStateSystem (System)
├── StateRegistry
│   ├── BaseState
│   │   ├── IdleState
│   │   ├── WalkState
│   │   ├── RunState
│   │   ├── AttackState
│   │   └── ...
│   └── StateConfig (datos)
│       ├── priority: number
│       ├── conditions: Condition[]
│       └── animationName: string
│
AnimationMixerSystem (System) - Refactorizado
├── AnimationConfig
│   ├── stateToAnimation: Map<string, string>
│   └── animationFiles: Map<string, string>
│
Condition (clase base)
├── InputCondition (input.wantsToAttack)
├── PhysicsCondition (physics.velocity.z > 0.1)
├── MovementCondition (input.moveDirection !== 0)
└── CompositeCondition (AND/OR de múltiples condiciones)
```

### Configuración Declarativa

```javascript
// animation/config/animation-config.js
export const ANIMATION_STATES = [
    {
        id: 'attack',
        priority: 10,  // Mayor = más prioridad
        conditions: [
            { type: 'input', property: 'wantsToAttack', operator: 'equals', value: true }
        ],
        animation: 'attack',
        canInterrupt: true,
        transitions: ['combat_stance']  // Estados permitidos después
    },
    {
        id: 'jump',
        priority: 9,
        conditions: [
            { type: 'physics', property: 'velocity.z', operator: 'greaterThan', value: 0.1 }
        ],
        animation: 'jump',
        transitions: ['idle', 'walk', 'run']
    },
    {
        id: 'run',
        priority: 5,
        conditions: [
            { type: 'input', property: 'isRunning', operator: 'equals', value: true },
            { type: 'movement', operator: 'hasMovement' }
        ],
        animation: 'run',
        transitions: ['idle', 'walk', 'attack']
    },
    {
        id: 'walk',
        priority: 4,
        conditions: [
            { type: 'movement', operator: 'hasMovement' }
        ],
        animation: 'walk',
        transitions: ['idle', 'run', 'attack']
    },
    {
        id: 'idle',
        priority: 1,
        conditions: [],  // Estado por defecto
        animation: 'combat_stance',
        transitions: ['walk', 'run', 'attack', 'jump']
    }
];

export const ANIMATION_FILES = {
    'walk': 'animations/Animation_Walking_withSkin.glb',
    'run': 'animations/Animation_Running_withSkin.glb',
    'combat_stance': 'animations/Animation_Combat_Stance_withSkin.glb',
    'attack': 'animations/Animation_Left_Slash_withSkin.glb',
    // Fácil agregar nuevas:
    // 'block': 'animations/Animation_Block_withSkin.glb',
};
```

## Patrones de Diseño a Usar

### 1. State Machine (Máquina de Estados Finita)
- **Descripción**: Sistema que gestiona estados y transiciones entre ellos
- **Cómo se aplica**: `AnimationStateSystem` evalúa condiciones en orden de prioridad y determina el estado actual
- **Beneficios**: 
  - Estados explícitos y bien definidos
  - Transiciones claras y configurables
  - Fácil agregar nuevos estados

### 2. Configuration Pattern
- **Descripción**: Separar configuración de lógica de negocio
- **Cómo se aplica**: Estados, prioridades y condiciones en archivo de configuración
- **Beneficios**:
  - Fácil modificar sin tocar código
  - Validación centralizada

### 3. Strategy Pattern
- **Descripción**: Encapsular algoritmos intercambiables
- **Cómo se aplica**: Diferentes tipos de condiciones (InputCondition, PhysicsCondition, etc.)
- **Beneficios**:
  - Fácil agregar nuevos tipos de condiciones
  - Condiciones reutilizables

### 4. Registry Pattern
- **Descripción**: Registrar y descubrir elementos dinámicamente
- **Cómo se aplica**: `StateRegistry` registra estados y los puede buscar por ID
- **Beneficios**:
  - Estados descubribles dinámicamente
  - Fácil agregar estados en runtime (si es necesario)
  - Centralizado y organizado

### 5. Factory Pattern
- **Descripción**: Crear objetos sin especificar clase exacta
- **Cómo se aplica**: `ConditionFactory` crea condiciones basadas en configuración
- **Beneficios**:
  - Desacoplamiento entre configuración y implementación
  - Fácil agregar nuevos tipos de condiciones
  - Validación centralizada

## Beneficios de la Nueva Arquitectura

1. **Escalabilidad**: Agregar nueva acción requiere solo agregar entrada en configuración
2. **Mantenibilidad**: Código más claro, separación de responsabilidades
3. **Flexibilidad**: Prioridades y condiciones modificables sin tocar código
5. **Extensibilidad**: Fácil agregar nuevos tipos de condiciones o estados
6. **Performance**: Evaluación optimizada, solo evalúa hasta encontrar estado válido
7. **Documentación implícita**: La configuración documenta los estados y sus condiciones
8. **Validación**: Puede validar configuración al inicio (prioridades duplicadas, estados faltantes, etc.)

## Migración Propuesta

### Fase 1: Crear Nueva Estructura (Sin tocar código actual)
- [ ] Crear `animation/config/animation-config.js` con configuración actual
- [ ] Crear `animation/states/` con clases base
- [ ] Crear `animation/conditions/` con condiciones básicas
- [ ] Crear `animation-state-system.js` nuevo sistema (comentado/no usado)
- [ ] **Objetivo**: Tener nuevo sistema listo pero no activo

### Fase 2: Implementar Condition System
- [ ] Implementar `BaseCondition` y clases derivadas
- [ ] Implementar `ConditionFactory`
- [ ] **Objetivo**: Sistema de condiciones funcionando

### Fase 3: Implementar State Machine
- [ ] Implementar `StateRegistry` y registro de estados
- [ ] Implementar `AnimationStateSystem` usando configuración
- [ ] Comparar output con `AnimationSystem` actual (debe ser idéntico)
- [ ] **Objetivo**: Nuevo sistema produce mismos resultados que actual

### Fase 4: Refactorizar AnimationMixerSystem
- [ ] Extraer configuración `ANIMATION_FILES` a `AnimationConfig`
- [ ] Crear sistema de mapeo declarativo
- [ ] Implementar fallback automático
- [ ] Mantener compatibilidad con código actual
- [ ] **Objetivo**: Mixer system usa configuración pero funciona igual

### Fase 5: Migración Gradual
- [ ] Hacer `AnimationStateSystem` funcionar en paralelo a `AnimationSystem`
- [ ] Comparar outputs frame por frame
- [ ] Migrar una entidad a la vez (si hay múltiples)
- [ ] **Objetivo**: Ambos sistemas funcionando, nuevo sistema validado

### Fase 6: Reemplazo
- [ ] Reemplazar `AnimationSystem` por `AnimationStateSystem` en `app.js`
- [ ] Remover `AnimationSystem` antiguo
- [ ] Actualizar documentación
- [ ] **Objetivo**: Solo nuevo sistema activo, código antiguo removido

### Fase 7: Limpieza y Optimización
- [ ] Optimizar evaluación de condiciones (caching, early exit)
- [ ] Agregar validación de configuración
- [ ] Documentar cómo agregar nuevas acciones
- [ ] **Objetivo**: Sistema optimizado y documentado

## Consideraciones Técnicas

### Frontend

1. **Compatibilidad**: 
   - Mantener `AnimationComponent` sin cambios
   - Mantener misma interfaz pública
   - Nuevo sistema debe producir mismos resultados

2. **Performance**:
   - Evaluar condiciones en orden de prioridad (de mayor a menor)
   - Salir temprano cuando se encuentra estado válido
   - Cachear condiciones que no cambian frecuentemente
   - Benchmark comparativo: nuevo vs actual

3. **Extensibilidad**:
   - Sistema de plugins para condiciones personalizadas
   - Hooks para modificar comportamiento sin tocar core
   - Soporte para múltiples configuraciones (diferentes entidades)

### Ejemplo de Uso Futuro

```javascript
// Agregar nueva acción "block" - SOLO configuración
// animation/config/animation-config.js

export const ANIMATION_STATES = [
    // ... estados existentes ...
    {
        id: 'block',
        priority: 11,  // Más alta que attack
        conditions: [
            { type: 'input', property: 'wantsToBlock', operator: 'equals', value: true }
        ],
        animation: 'block',
        canInterrupt: true,
        transitions: ['combat_stance', 'attack']
    }
];

export const ANIMATION_FILES = {
    // ... animaciones existentes ...
    'block': 'animations/Animation_Block_withSkin.glb',
};

// InputSystem - Solo agregar detección (1 línea)
input.wantsToBlock = input.isKeyPressed('KeyQ');

// ¡Eso es todo! No más cambios necesarios.
```

## Conclusión

La arquitectura actual del sistema de animaciones funciona correctamente para el estado actual del juego, pero tiene limitaciones importantes de escalabilidad. Agregar nuevas acciones requiere modificar múltiples archivos y lugares del código, lo que hace el sistema difícil de mantener conforme crece el juego.

La arquitectura propuesta utiliza patrones de diseño probados (State Machine, Configuration, Strategy) para crear un sistema escalable donde:
- Agregar nuevas acciones solo requiere configuración
- Prioridades y condiciones son modificables sin tocar código
- El código es más mantenible
- Se mantiene compatibilidad con el sistema actual durante la migración

La migración propuesta es incremental y cuidadosa, permitiendo validar el nuevo sistema antes de reemplazar completamente el actual. Esto minimiza riesgos y permite ajustes basados en feedback.

Los beneficios a largo plazo (escalabilidad, mantenibilidad, extensibilidad) justifican el esfuerzo de refactorización, especialmente considerando que el juego está en desarrollo activo y se espera agregar muchas más acciones en el futuro.

