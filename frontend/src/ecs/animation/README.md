# Sistema de Animaciones Escalable

Este módulo implementa un sistema de animaciones escalable basado en una máquina de estados finita (FSM) con configuración declarativa.

## Propósito

Proporcionar un sistema de animaciones que:
- Permite agregar nuevas animaciones solo con configuración (sin modificar código)
- Maneja prioridades y condiciones de forma declarativa
- Es fácil de mantener y extender
- Separa la lógica de negocio de los datos de configuración

## Estructura

```
animation/
├── config/
│   └── animation-config.js    # Configuración declarativa de estados y animaciones
├── conditions/                 # Sistema de condiciones evaluables
│   ├── base-condition.js      # Clase base para condiciones
│   ├── input-condition.js     # Condiciones basadas en InputComponent
│   ├── physics-condition.js   # Condiciones basadas en PhysicsComponent
│   ├── movement-condition.js  # Condiciones basadas en movimiento
│   ├── condition-factory.js   # Factory para crear condiciones desde configuración
│   └── index.js               # Exportaciones
├── states/                     # Sistema de estados
│   ├── state-config.js        # Configuración de un estado individual
│   ├── state-registry.js      # Registry que gestiona todos los estados
│   └── index.js               # Exportaciones
└── index.js                    # Exportaciones principales
```

## Componentes Principales

### 1. Configuración (`config/`)

**Archivo:** `animation-config.js`

Define de forma declarativa:
- **ANIMATION_STATES**: Estados de animación con prioridades, condiciones y transiciones
- **ANIMATION_FILES**: Mapeo de estados a archivos GLB de animaciones

**Ejemplo:**
```javascript
{
    id: 'attack',
    priority: 10,  // Mayor = más prioridad
    conditions: [
        { type: 'input', property: 'wantsToAttack', operator: 'equals', value: true }
    ],
    animation: 'attack',
    canInterrupt: true,
    transitions: ['combat_stance']
}
```

### 2. Condiciones (`conditions/`)

**Responsabilidad:** Evaluar si un estado de animación debe activarse basándose en el contexto actual (input, physics, etc.)

#### Tipos de Condiciones:

- **InputCondition**: Evalúa propiedades del `InputComponent`
  ```javascript
  { type: 'input', property: 'wantsToAttack', operator: 'equals', value: true }
  ```

- **PhysicsCondition**: Evalúa propiedades del `PhysicsComponent`
  ```javascript
  { type: 'physics', property: 'velocity.z', operator: 'greaterThan', value: 0.1 }
  ```

- **MovementCondition**: Evalúa si hay movimiento basándose en `InputComponent`
  ```javascript
  { type: 'movement', operator: 'hasMovement' }
  ```

#### Operadores Soportados:

- `equals`: Igualdad estricta
- `greaterThan`: Mayor que
- `lessThan`: Menor que
- `hasMovement`: Verifica si hay movimiento (solo para MovementCondition)

### 3. Estados (`states/`)

**Responsabilidad:** Gestionar la configuración de estados y determinar qué estado debe estar activo.

- **StateConfig**: Encapsula la configuración de un estado individual
  - Propiedades: `id`, `priority`, `conditions`, `animation`, `canInterrupt`, `transitions`
  - Método: `canActivate(context, conditions)` - Verifica si el estado puede activarse

- **StateRegistry**: Registry que gestiona todos los estados
  - Ordena estados por prioridad
  - Cachea condiciones evaluables
  - Método: `determineActiveState(context)` - Determina el estado activo basándose en prioridades y condiciones

## Flujo de Ejecución

```
1. AnimationStateSystem.update() se ejecuta cada frame
   ↓
2. Para cada entidad con Animation + Input + Physics:
   ↓
3. Crea contexto con input y physics
   ↓
4. StateRegistry.determineActiveState(context)
   ↓
5. Itera estados por prioridad (mayor a menor)
   ↓
6. Para cada estado, evalúa condiciones usando ConditionFactory
   ↓
7. Primer estado que cumpla todas las condiciones → Estado activo
   ↓
8. Actualiza AnimationComponent.currentState
   ↓
9. AnimationMixerSystem lee currentState y reproduce la animación correspondiente
```

## Cómo Usar

### Agregar un Nuevo Estado de Animación

**1. Agregar estado en `config/animation-config.js`:**

```javascript
export const ANIMATION_STATES = [
    // ... estados existentes ...
    {
        id: 'block',
        priority: 11,  // Mayor que attack (10)
        conditions: [
            { type: 'input', property: 'wantsToBlock', operator: 'equals', value: true }
        ],
        animation: 'block',
        canInterrupt: true,
        transitions: ['combat_stance']
    }
];
```

**2. Agregar archivo de animación en `ANIMATION_FILES`:**

```javascript
export const ANIMATION_FILES = {
    // ... archivos existentes ...
    'block': 'animations/Animation_Block_withSkin.glb'
};
```

**3. Agregar detección de input (si es necesario) en `InputSystem`:**

```javascript
input.wantsToBlock = input.isKeyPressed('KeyQ');
```

**¡Eso es todo!** No se requiere modificar código de animaciones.

### Agregar un Nuevo Tipo de Condición

**1. Crear nueva condición en `conditions/`:**

```javascript
// conditions/health-condition.js
import { BaseCondition } from './base-condition.js';

export class HealthCondition extends BaseCondition {
    evaluate(context) {
        const { health } = context;
        const value = this.getPropertyValue(health, this.property);
        return this.compare(value, this.value);
    }
}
```

**2. Registrar en `ConditionFactory`:**

```javascript
// conditions/condition-factory.js
import { HealthCondition } from './health-condition.js';

export class ConditionFactory {
    static create(conditionConfig) {
        switch (conditionConfig.type) {
            // ... casos existentes ...
            case 'health':
                return new HealthCondition(conditionConfig);
            default:
                throw new Error(`Unknown condition type: ${conditionConfig.type}`);
        }
    }
}
```

## Patrones de Diseño Utilizados

### 1. State Machine (Máquina de Estados Finita)
- Cada animación es un estado con condiciones de activación
- Estados tienen prioridades para resolver conflictos
- Transiciones definidas entre estados

### 2. Configuration Pattern
- Separación de datos (configuración) de lógica (evaluación)
- Facilita agregar/modificar animaciones sin tocar código

### 3. Strategy Pattern
- Cada tipo de condición es una estrategia diferente de evaluación
- Permite agregar nuevos tipos de condiciones fácilmente

### 4. Registry Pattern
- `StateRegistry` centraliza la gestión de estados
- Facilita búsqueda y acceso a estados por ID

### 5. Factory Pattern
- `ConditionFactory` crea instancias de condiciones desde configuración
- Desacopla la creación de condiciones de su uso

## Ventajas del Sistema

1. **Escalabilidad**: Agregar nuevas animaciones solo requiere configuración
2. **Mantenibilidad**: Lógica centralizada y bien organizada
3. **Flexibilidad**: Prioridades y condiciones fáciles de modificar
4. **Extensibilidad**: Fácil agregar nuevos tipos de condiciones
5. **Claridad**: Configuración declarativa es fácil de entender
6. **Testeable**: Componentes pequeños y desacoplados

## Integración con ECS

Este módulo se integra con el sistema ECS a través de:

- **AnimationStateSystem** (`../systems/animation-state-system.js`): Sistema ECS que usa este módulo
- **AnimationMixerSystem** (`../systems/animation-mixer-system.js`): Sistema que reproduce las animaciones GLB basándose en los estados

## Referencias

- **Análisis de Arquitectura**: `instructions/analysis/JDG-016-architecture-analysis_2025-12-09_19-59-40.md`
- **Ticket**: `instructions/tickets/JDG-016_work-ticket_2025-12-09_19-59-40.md`
- **ECS README**: `../README.md`
- **AnimationStateSystem**: `../systems/animation-state-system.js`
- **AnimationMixerSystem**: `../systems/animation-mixer-system.js`

