# Análisis de Arquitectura - Centralización de Valores Hardcodeados en Sistema de Animaciones y Combate (JDG-029)

## Situación Actual

### Problema Identificado

Después de las refactorizaciones de JDG-028 y JDG-028-2, aún existen valores hardcodeados dispersos en el código que deberían estar centralizados en archivos de configuración. Esto incluye:

1. **Strings mágicos** usados como estados, tipos y valores por defecto
2. **Números mágicos** usados como thresholds y valores de configuración
3. **Valores duplicados** en múltiples lugares que deberían tener una única fuente de verdad

### Strings Hardcodeados Encontrados

#### 1. Estado 'idle' (crítico - usado en múltiples lugares)

**Ubicaciones:**
- `animation-mixer-system.js:427`: `anim.currentState = 'idle';`
- `animation.js:17`: `this.currentState = options.currentState || 'idle';`
- `state-registry.js:81`: `return this.states.get('idle') || null;`
- `player-factory.js:245`: `currentState: 'idle',`
- `combat-system.js`: (implícito, usado como fallback)

**Problema:**
- 'idle' es un estado fundamental usado como fallback y valor por defecto
- Si el ID del estado cambia en `animation-config.js`, múltiples archivos deben actualizarse
- No hay validación de que 'idle' exista en `ANIMATION_STATES`

**Impacto:** Alto - Es un valor crítico usado en fallbacks y valores por defecto

#### 2. Tipo 'combat' (usado en checks de tipo)

**Ubicaciones:**
- `animation-state-system.js:57`: `if (activeState.type === 'combat')`
- `state-registry.js:65`: `if (state.type === 'combat')`

**Problema:**
- 'combat' es un tipo de estado definido en `animation-config.js`
- Se usa para lógica condicional pero no está centralizado como constante
- Si el nombre del tipo cambia, múltiples archivos deben actualizarse

**Impacto:** Medio - Usado en lógica condicional importante

#### 3. Tipo 'combo' (usado en condiciones)

**Ubicaciones:**
- `condition-factory.js:21-22`: `case 'combo':` y `return new ComboCondition(conditionConfig);`

**Problema:**
- 'combo' es un tipo de condición que debería estar centralizado
- Usado en switch statements que pueden fallar silenciosamente si hay typo

**Impacto:** Medio - Usado en factory pattern

#### 4. Tipo de arma 'generic' y 'sword' (valores por defecto)

**Ubicaciones:**
- `combat-system.js:61`: `let weaponType = 'generic';`
- `player-factory.js:255`: `weaponType: 'sword',`

**Problema:**
- 'generic' y 'sword' están definidos en `COMBAT_CONSTANTS.WEAPON_TYPES`
- Deberían usar las constantes en lugar de hardcodear los strings
- 'sword' se usa como valor por defecto para el arma del jugador

**Impacto:** Bajo - Ya existen las constantes, solo falta usarlas

#### 5. Nombres de Componentes ECS (usados en múltiples lugares)

**Ubicaciones:**
- `animation-state-system.js:14`: `this.requiredComponents = ['Animation', 'Input', 'Physics', 'Combo', 'Combat'];`
- `animation-state-system.js:34-38`: `ecs.getComponent(entityId, 'Animation')`, `ecs.getComponent(entityId, 'Input')`, etc.
- `combat-system.js:16`: `this.requiredComponents = ['Input', 'Combat'];`
- `animation-mixer-system.js:22`: `this.requiredComponents = ['Render', 'Animation'];`
- `input-system.js:13`: `this.requiredComponents = ['Input', 'Physics'];`
- `physics-system.js:13`: `this.requiredComponents = ['Physics', 'Position'];`
- `combo-system.js:15`: `this.requiredComponents = ['Input', 'Combo'];`
- `player-factory.js:220-251`: `ecs.addComponent(playerId, 'Position', ...)`, `ecs.addComponent(playerId, 'Physics', ...)`, etc.
- Y muchos otros lugares en todos los sistemas

**Problema:**
- Los nombres de componentes ECS están hardcodeados como strings en múltiples lugares
- Si se renombra un componente, hay que buscar y reemplazar en muchos archivos
- Typos pueden causar bugs silenciosos (ej: 'Aninmation' en lugar de 'Animation')
- No hay autocompletado ni validación de nombres de componentes
- Se usan para:
  - `requiredComponents` en sistemas
  - `ecs.getComponent(entityId, 'ComponentName')`
  - `ecs.addComponent(entityId, 'ComponentName', ...)`
  - `ecs.query('ComponentName', ...)`

**Impacto:** Medio-Alto - Usado extensivamente, errores pueden ser difíciles de detectar

**Evaluación:**
- **Opción A:** Crear archivo separado `ecs-constants.js` para constantes del sistema ECS
  - ✅ Separación de responsabilidades (ECS vs Animaciones)
  - ✅ Más organizado
  - ✅ No mezcla constantes de diferentes dominios
  
- **Opción B:** Agregar a `animation-constants.js`
  - ❌ Mezcla constantes de diferentes dominios
  - ❌ No todos los componentes están relacionados con animaciones
  - ✅ Un solo archivo para importar

**Recomendación:** Opción A - Crear `ecs-constants.js` separado para constantes del sistema ECS. Los nombres de componentes son parte del sistema ECS, no específicos de animaciones.

**Nota:** También se encontraron strings de acciones hardcodeados en `input-system.js`:
- `'moveForward'`, `'moveBackward'`, `'moveLeft'`, `'moveRight'`, `'run'`, `'jump'`, `'crouch'`, `'parry'`, `'dodge'`, `'specialAttack'`, `'chargedAttack'`, `'heavyAttack'`, `'attack'`, `'grab'`
- Estos deberían estar en `INPUT_MAP` o en un archivo de constantes de acciones

**También se encontraron valores numéricos hardcodeados:**
- `input-system.js`: velocidades `30` (run), `15` (walk), threshold `0.01`, valores de dirección `1`, `-1`, `0`
- `combo-system.js`: multiplicador de timing `1.5`
- `physics-system.js`: gravedad `-9.8`, fixedTimestep `1/60`, velocidad de salto `5` (ya identificado)
- `render-system.js`: offsets por defecto `{ x: 0, y: 0, z: 0 }` (ya identificado)

### Números Hardcodeados Encontrados

#### 1. Threshold de progreso 1.0 (100%)

**Ubicaciones:**
- `animation-mixer-system.js:382`: `const animationFinished = progress >= 1.0 || ...`

**Problema:**
- 1.0 representa 100% de progreso de animación
- Debería ser una constante con nombre descriptivo
- Útil para futuros ajustes de precisión (ej: 0.99 para tolerancia)

**Impacto:** Bajo - Valor estándar pero debería ser configurable

#### 2. Valores por defecto de modelOffset y modelRotation

**Ubicaciones:**
- `animation-mixer-system.js:175-176`: `{ x: 0, y: 0, z: 0 }`

**Problema:**
- Valores por defecto hardcodeados
- Si cambiamos el formato o necesitamos valores diferentes, deben actualizarse en múltiples lugares

**Impacto:** Muy bajo - Valores estándar razonables

#### 3. Prioridad de sistemas (ya están en código pero podrían estar en config)

**Ubicaciones:**
- `animation-mixer-system.js:23`: `this.priority = 2.5;`
- `animation-state-system.js:15`: `this.priority = 2;`
- `combat-system.js:17`: `this.priority = 1.4;`

**Problema:**
- Prioridades de sistemas están hardcodeadas en cada clase
- No hay documentación centralizada del orden de ejecución
- Difícil de mantener cuando se agregan nuevos sistemas

**Impacto:** Medio - Afecta el orden de ejecución de sistemas

#### 4. Valores de offsets por defecto (0, 0, 0)

**Ubicaciones:**
- `animation-mixer-system.js:175-176`: Valores por defecto para offsets

**Problema:**
- Aunque son valores razonables, deberían estar en una constante para claridad

**Impacto:** Muy bajo

#### 6. Valores de física del jugador (player-factory.js)

**Ubicaciones:**
- `player-factory.js:224`: `mass: 70`
- `player-factory.js:227`: `groundFriction: 0.8`
- `player-factory.js:228`: `airFriction: 0.95`
- `player-factory.js:229`: `maxVelocity: { x: 5, y: 10, z: 5 }`
- `player-factory.js:246`: `animationSpeed: 1.0`
- `physics-system.js:66`: `physics.velocity.z = 5` (velocidad de salto)

**Problema:**
- Valores de física del jugador están hardcodeados
- Si necesitamos ajustar balance del juego, hay que cambiar código
- Diferentes tipos de personajes podrían tener diferentes valores
- Velocidad de salto también está hardcodeada

**Impacto:** Medio - Afecta gameplay y balance

#### 7. Valores por defecto de posición y celda

**Ubicaciones:**
- `player-factory.js:153-156`: `x = 80, y = 80, z = 1, cellSize = 0.25`

**Problema:**
- Valores por defecto hardcodeados para spawn del jugador
- cellSize podría ser una constante global del juego

**Impacto:** Bajo - Solo afecta valores por defecto

#### 8. Valores de mesh por defecto (geometría y colores)

**Ubicaciones:**
- `player-factory.js:112`: `new THREE.CylinderGeometry(0.3, 0.3, 1.0, 8)`
- `player-factory.js:113`: `color: 0x8B4513` (color cuerpo)
- `player-factory.js:115`: `body.position.y = 0.5`
- `player-factory.js:121`: `new THREE.SphereGeometry(0.25, 8, 8)`
- `player-factory.js:122`: `color: 0xFFDBB3` (color cabeza)
- `player-factory.js:124`: `head.position.y = 1.25`
- `player-factory.js:65`: `metalness: 0.1, roughness: 0.8`

**Problema:**
- Valores de geometría y materiales hardcodeados para mesh por defecto
- Colores y parámetros de material deberían estar en configuración
- Útil para ajustes visuales sin tocar código

**Impacto:** Bajo - Solo afecta mesh por defecto (fallback)

#### 9. Strings de acciones y valores numéricos en input-system.js

**Ubicaciones:**
- `input-system.js:121-131`: `'moveForward'`, `'moveBackward'`, `'moveLeft'`, `'moveRight'`, `'run'`, etc.
- `input-system.js:160`: `input.isRunning = this.checkAction('run');`
- `input-system.js:168`: `const speed = input.isRunning ? 30 : 15;` (velocidades walk/run)
- `input-system.js:151`: `if (length > 0.01)` (threshold para normalización)
- `input-system.js:34-37, 63-66`: Mouse buttons `0` (left), `2` (right)
- `input-system.js:122, 125, 128, 131`: Valores de dirección `1`, `-1`, `0`

**Problema:**
- Strings de acciones hardcodeados (deberían estar en `INPUT_MAP` o constantes)
- Velocidades de movimiento hardcodeadas (30 run, 15 walk)
- Threshold de normalización hardcodeado (0.01)
- Mouse button indices hardcodeados (0, 2)
- Valores de dirección deberían ser constantes

**Impacto:** Medio - Afecta gameplay y movimiento

#### 10. Valores numéricos en combo-system.js

**Ubicaciones:**
- `combo-system.js:100`: `timeSinceLastInput > currentStep.timing * 1.5` (multiplicador de timing window)

**Problema:**
- Multiplicador de timing window hardcodeado (1.5)
- Debería estar en configuración para ajustar balance

**Impacto:** Bajo - Solo afecta timing de combos

#### 11. Valores numéricos en physics-system.js

**Ubicaciones:**
- `physics-system.js:20`: `this.gravity = options.gravity !== undefined ? options.gravity : -9.8;`
- `physics-system.js:26`: `this.fixedTimestep = options.fixedTimestep !== undefined ? options.fixedTimestep : 1/60;`
- `physics-system.js:66`: `physics.velocity.z = 5;` (velocidad de salto - ya identificado)

**Problema:**
- Gravedad y fixedTimestep tienen valores por defecto hardcodeados
- Aunque pueden sobrescribirse con options, los defaults deberían estar en constantes
- Útil para documentación y consistencia

**Impacto:** Bajo - Valores por defecto pero configurables

#### 12. Strings de acciones en combat-system.js (switch statement)

**Ubicaciones:**
- `combat-system.js:104-115`: `case 'dodge':`, `case 'specialAttack':`, `case 'parry':`, `case 'heavyAttack':`, `case 'chargedAttack':`, `case 'attack':`

**Problema:**
- Strings de acciones hardcodeados en switch statement
- Deberían usar constantes para evitar typos
- Ya están en `COMBAT_ACTIONS` pero se usan como strings en el switch

**Impacto:** Medio - Usado en lógica crítica de combate

#### 13. Strings de inputType en combo-system.js

**Ubicaciones:**
- `combo-system.js:68-74`: `inputType = 'heavyAttack'`, `'chargedAttack'`, `'specialAttack'`, `'attack'`

**Problema:**
- Strings de tipos de input hardcodeados
- Deberían usar constantes consistentes con `COMBAT_ACTIONS` o `INPUT_MAP`

**Impacto:** Medio - Usado en lógica de combos

#### 14. Valores hardcodeados en collision-system.js

**Ubicaciones:**
- `collision-system.js:41`: `this.cacheInvalidationThreshold = 2;`
- `collision-system.js:63`: `if (particle.estado_nombre === 'solido')`
- `collision-system.js:124, 129, 137, 154, 156, 157, 163, 164, 167, 181, 182, 187-190`: Múltiples valores numéricos (1, 2, 0, -10, 40, 80, etc.)

**Problema:**
- Threshold de invalidación de cache hardcodeado (2)
- Estado de partícula `'solido'` hardcodeado
- Valores de posición/respawn hardcodeados (80, 80, 1)
- Valores de límites de dimensión hardcodeados (-10, 40)
- Valores de corrección de posición (1, 0, etc.)

**Impacto:** Medio - Afecta sistema de colisiones y respawn

## Necesidades Futuras

### Categorías de Valores a Centralizar

1. **Estados de Animación:**
   - Estados fundamentales (idle, combat_stance, etc.)
   - Estados de fallback
   - Validación de que estados existen

2. **Tipos de Estado/Condición:**
   - Tipos de estado ('combat', 'combo', 'normal')
   - Tipos de condición ('input', 'physics', 'combo', 'combat', 'movement')
   - Usados en type checking y factory patterns

3. **Valores Numéricos:**
   - Thresholds de progreso (1.0, 0.95, etc.)
   - Valores por defecto (offsets, rotaciones)
   - Prioridades de sistemas
   - Valores de física (masa, fricción, velocidades)
   - Valores de geometría y materiales
   - Velocidades de movimiento (walk, run)
   - Thresholds de normalización
   - Mouse button indices
   - Valores de física del sistema (gravedad, timestep)

4. **Valores de Configuración del Sistema:**
   - Prioridades de ejecución de sistemas
   - Valores por defecto para componentes
   - Constantes matemáticas del sistema
   - Valores por defecto de spawn (posición, cellSize)
   - Configuración de física del jugador
   - Multiplicadores de timing (combos)

5. **Strings de Acciones:**
   - Nombres de acciones hardcodeados en sistemas
   - Deberían estar en `INPUT_MAP` o constantes para evitar typos

### Requisitos de Escalabilidad

1. **Fácil agregar nuevos tipos**: Debe ser solo agregar a configuración
2. **Validación centralizada**: Verificar que estados/tipos existen antes de usar
3. **Documentación clara**: Constantes con nombres descriptivos
4. **Refactoring seguro**: Cambiar valores en un solo lugar
5. **Type safety**: Reducir errores de tipeo con constantes

## Arquitectura Propuesta

### Solución: Constantes de Animación Centralizadas

Crear archivo `animation-constants.js` para centralizar:

1. **Estado IDs fundamentales**
2. **Tipos de estado**
3. **Tipos de condición**
4. **Valores numéricos del sistema**
5. **Prioridades de sistemas**

### Estructura Propuesta

```javascript
// frontend/src/config/ecs-constants.js (NUEVO)

/**
 * Constantes centralizadas para sistema ECS
 * 
 * Centraliza nombres de componentes para evitar typos y facilitar refactoring.
 */
export const ECS_CONSTANTS = {
    // Nombres de componentes ECS
    COMPONENT_NAMES: {
        POSITION: 'Position',
        PHYSICS: 'Physics',
        RENDER: 'Render',
        INPUT: 'Input',
        ANIMATION: 'Animation',
        COMBO: 'Combo',
        COMBAT: 'Combat',
        WEAPON: 'Weapon',
    },
};

// frontend/src/config/animation-constants.js

/**
 * Constantes centralizadas para sistema de animaciones
 */
export const ANIMATION_CONSTANTS = {
    // Estados fundamentales (usados como fallback y valores por defecto)
    STATE_IDS: {
        IDLE: 'idle',
        COMBAT_STANCE: 'combat_stance',
        // Agregar otros estados fundamentales según necesidad
    },
    
    // Tipos de estado (usados en type checking)
    STATE_TYPES: {
        COMBAT: 'combat',
        COMBO: 'combo',
        NORMAL: 'normal',
    },
    
    // Tipos de condición (usados en ConditionFactory)
    CONDITION_TYPES: {
        INPUT: 'input',
        PHYSICS: 'physics',
        MOVEMENT: 'movement',
        COMBO: 'combo',
        COMBAT: 'combat',
    },
    
    // Valores numéricos del sistema
    NUMERIC: {
        // Progreso de animación (100%)
        PROGRESS_COMPLETE: 1.0,
        
        // Valores por defecto
        DEFAULT_OFFSET_X: 0,
        DEFAULT_OFFSET_Y: 0,
        DEFAULT_OFFSET_Z: 0,
        DEFAULT_ROTATION_X: 0,
        DEFAULT_ROTATION_Y: 0,
        DEFAULT_ROTATION_Z: 0,
    },
    
    // Prioridades de sistemas (para documentación y validación)
    SYSTEM_PRIORITIES: {
        INPUT_SYSTEM: 0,
        PHYSICS_SYSTEM: 1,
        COMBAT_SYSTEM: 1.4,
        COMBO_SYSTEM: 1.5,
        ANIMATION_STATE_SYSTEM: 2,
        ANIMATION_MIXER_SYSTEM: 2.5,
        RENDER_SYSTEM: 3,
    },
    
    // Configuración de física del jugador
    PLAYER_PHYSICS: {
        MASS: 70,
        GROUND_FRICTION: 0.8,
        AIR_FRICTION: 0.95,
        MAX_VELOCITY: { x: 5, y: 10, z: 5 },
        JUMP_VELOCITY: 5, // Velocidad de salto en celdas/segundo
        ANIMATION_SPEED: 1.0,
    },
    
    // Valores por defecto de spawn
    DEFAULT_SPAWN: {
        X: 80,
        Y: 80,
        Z: 1,
        CELL_SIZE: 0.25,
    },
    
    // Configuración de mesh por defecto (fallback)
    DEFAULT_MESH: {
        BODY: {
            RADIUS: 0.3,
            HEIGHT: 1.0,
            SEGMENTS: 8,
            COLOR: 0x8B4513,
            POSITION_Y: 0.5,
        },
        HEAD: {
            RADIUS: 0.25,
            SEGMENTS: 8,
            COLOR: 0xFFDBB3,
            POSITION_Y: 1.25,
        },
        MATERIAL: {
            METALNESS: 0.1,
            ROUGHNESS: 0.8,
        },
    },
    
    // Valores del sistema de input
    INPUT: {
        // Velocidades de movimiento (celdas/segundo)
        WALK_SPEED: 15,
        RUN_SPEED: 30,
        
        // Thresholds
        DIRECTION_NORMALIZE_THRESHOLD: 0.01,
        
        // Valores de dirección
        DIRECTION: {
            FORWARD: -1,
            BACKWARD: 1,
            LEFT: -1,
            RIGHT: 1,
            NONE: 0,
        },
        
        // Mouse button indices
        MOUSE_BUTTONS: {
            LEFT: 0,
            RIGHT: 2,
            MIDDLE: 1,
        },
    },
    
    // Valores del sistema de física
    PHYSICS: {
        GRAVITY: -9.8, // celdas/segundo²
        FIXED_TIMESTEP: 1/60, // segundos (60 FPS)
    },
    
    // Valores del sistema de combos
    COMBO: {
        TIMING_MULTIPLIER: 1.5, // Multiplicador para timing window de expiración
    },
    
    // Valores del sistema de colisiones
    COLLISION: {
        // Threshold de invalidación de cache (en celdas)
        CACHE_INVALIDATION_THRESHOLD: 2,
        
        // Estado de partícula sólida
        PARTICLE_STATE_SOLID: 'solido',
        
        // Valores de respawn por defecto
        DEFAULT_RESPAWN: {
            X: 80,
            Y: 80,
            Z: 1,
        },
        
        // Valores de límites de dimensión por defecto
        DEFAULT_DIMENSION: {
            MIN_Z: -10,
            MAX_Z: 40,
        },
        
        // Valores de corrección de posición
        POSITION_CORRECTION: {
            MIN_Z: 1,
            VELOCITY_RESET: 0,
        },
    },
};
```

### Cambios en Archivos

#### 1. Crear `animation-constants.js`

**Ubicación:** `frontend/src/config/animation-constants.js`

**Contenido:**
- Todas las constantes mencionadas arriba
- Documentación JSDoc para cada sección
- Validación opcional (helpers para verificar que estados existen)

#### 2. Actualizar `animation-mixer-system.js`

**Cambios:**
```javascript
// Antes
anim.currentState = 'idle';

// Después
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';
anim.currentState = ANIMATION_CONSTANTS.STATE_IDS.IDLE;
```

**También:**
- Reemplazar `progress >= 1.0` con `ANIMATION_CONSTANTS.NUMERIC.PROGRESS_COMPLETE`
- Usar constantes para offsets por defecto

#### 3. Actualizar `animation-state-system.js`

**Cambios:**
```javascript
// Antes
if (activeState.type === 'combat') {

// Después
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';
if (activeState.type === ANIMATION_CONSTANTS.STATE_TYPES.COMBAT) {
```

#### 4. Actualizar `state-registry.js`

**Cambios:**
```javascript
// Antes
return this.states.get('idle') || null;

// Después
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';
return this.states.get(ANIMATION_CONSTANTS.STATE_IDS.IDLE) || null;
```

**También:**
```javascript
// Antes
if (state.type === 'combat') {

// Después
if (state.type === ANIMATION_CONSTANTS.STATE_TYPES.COMBAT) {
```

#### 5. Actualizar `condition-factory.js`

**Cambios:**
```javascript
// Antes
case 'combo':
    return new ComboCondition(conditionConfig);
case 'combat':
    return new CombatCondition(conditionConfig);

// Después
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';
case ANIMATION_CONSTANTS.CONDITION_TYPES.COMBO:
    return new ComboCondition(conditionConfig);
case ANIMATION_CONSTANTS.CONDITION_TYPES.COMBAT:
    return new CombatCondition(conditionConfig);
```

#### 6. Actualizar `animation.js` (componente)

**Cambios:**
```javascript
// Antes
this.currentState = options.currentState || 'idle';

// Después
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';
this.currentState = options.currentState || ANIMATION_CONSTANTS.STATE_IDS.IDLE;
```

#### 7. Actualizar `combat-system.js`

**Cambios:**
```javascript
// Antes
let weaponType = 'generic';

// Después
// Ya usa COMBAT_CONSTANTS.WEAPON_TYPES.GENERIC
let weaponType = COMBAT_CONSTANTS.WEAPON_TYPES.GENERIC;
```

#### 8. Actualizar todos los sistemas para usar `ECS_CONSTANTS.COMPONENT_NAMES`

**Descripción:**
Reemplazar todos los strings hardcodeados de nombres de componentes con constantes de `ECS_CONSTANTS`.

**Archivos afectados:**
- `animation-state-system.js`
- `animation-mixer-system.js`
- `combat-system.js`
- `input-system.js`
- `physics-system.js`
- `combo-system.js`
- `player-factory.js`
- Y cualquier otro sistema que use nombres de componentes

**Ejemplo para `animation-state-system.js`:**
```javascript
// Antes
this.requiredComponents = ['Animation', 'Input', 'Physics', 'Combo', 'Combat'];
const animation = this.ecs.getComponent(entityId, 'Animation');
const input = this.ecs.getComponent(entityId, 'Input');

// Después
import { ECS_CONSTANTS } from '../../config/ecs-constants.js';

this.requiredComponents = [
    ECS_CONSTANTS.COMPONENT_NAMES.ANIMATION,
    ECS_CONSTANTS.COMPONENT_NAMES.INPUT,
    ECS_CONSTANTS.COMPONENT_NAMES.PHYSICS,
    ECS_CONSTANTS.COMPONENT_NAMES.COMBO,
    ECS_CONSTANTS.COMPONENT_NAMES.COMBAT
];
const animation = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.ANIMATION);
const input = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.INPUT);
```

**Ejemplo para `player-factory.js`:**
```javascript
// Antes
ecs.addComponent(playerId, 'Position', new PositionComponent(...));
ecs.addComponent(playerId, 'Physics', new PhysicsComponent(...));

// Después
import { ECS_CONSTANTS } from '../../config/ecs-constants.js';

ecs.addComponent(playerId, ECS_CONSTANTS.COMPONENT_NAMES.POSITION, new PositionComponent(...));
ecs.addComponent(playerId, ECS_CONSTANTS.COMPONENT_NAMES.PHYSICS, new PhysicsComponent(...));
```

#### 9. Actualizar `player-factory.js`

**Cambios:**
```javascript
// Antes
currentState: 'idle',
mass: 70,
groundFriction: 0.8,
airFriction: 0.95,
maxVelocity: { x: 5, y: 10, z: 5 },
animationSpeed: 1.0,
weaponType: 'sword',
x = 80, y = 80, z = 1, cellSize = 0.25,

// Después
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';
import { COMBAT_CONSTANTS } from '../../config/combat-constants.js';

currentState: ANIMATION_CONSTANTS.STATE_IDS.IDLE,
mass: ANIMATION_CONSTANTS.PLAYER_PHYSICS.MASS,
groundFriction: ANIMATION_CONSTANTS.PLAYER_PHYSICS.GROUND_FRICTION,
airFriction: ANIMATION_CONSTANTS.PLAYER_PHYSICS.AIR_FRICTION,
maxVelocity: ANIMATION_CONSTANTS.PLAYER_PHYSICS.MAX_VELOCITY,
animationSpeed: ANIMATION_CONSTANTS.PLAYER_PHYSICS.ANIMATION_SPEED,
weaponType: COMBAT_CONSTANTS.WEAPON_TYPES.SWORD,
x = ANIMATION_CONSTANTS.DEFAULT_SPAWN.X,
y = ANIMATION_CONSTANTS.DEFAULT_SPAWN.Y,
z = ANIMATION_CONSTANTS.DEFAULT_SPAWN.Z,
cellSize = ANIMATION_CONSTANTS.DEFAULT_SPAWN.CELL_SIZE,
```

**También para mesh por defecto:**
```javascript
// Antes
const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.0, 8);
const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
body.position.y = 0.5;

// Después
const bodyGeometry = new THREE.CylinderGeometry(
    ANIMATION_CONSTANTS.DEFAULT_MESH.BODY.RADIUS,
    ANIMATION_CONSTANTS.DEFAULT_MESH.BODY.RADIUS,
    ANIMATION_CONSTANTS.DEFAULT_MESH.BODY.HEIGHT,
    ANIMATION_CONSTANTS.DEFAULT_MESH.BODY.SEGMENTS
);
const bodyMaterial = new THREE.MeshStandardMaterial({
    color: ANIMATION_CONSTANTS.DEFAULT_MESH.BODY.COLOR,
    metalness: ANIMATION_CONSTANTS.DEFAULT_MESH.MATERIAL.METALNESS,
    roughness: ANIMATION_CONSTANTS.DEFAULT_MESH.MATERIAL.ROUGHNESS
});
body.position.y = ANIMATION_CONSTANTS.DEFAULT_MESH.BODY.POSITION_Y;
```

#### 10. Actualizar `physics-system.js`

**Cambios:**
```javascript
// Antes
physics.velocity.z = 5; // Velocidad de salto
this.gravity = options.gravity !== undefined ? options.gravity : -9.8;
this.fixedTimestep = options.fixedTimestep !== undefined ? options.fixedTimestep : 1/60;

// Después
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';
physics.velocity.z = ANIMATION_CONSTANTS.PLAYER_PHYSICS.JUMP_VELOCITY;
this.gravity = options.gravity !== undefined ? options.gravity : ANIMATION_CONSTANTS.PHYSICS.GRAVITY;
this.fixedTimestep = options.fixedTimestep !== undefined ? options.fixedTimestep : ANIMATION_CONSTANTS.PHYSICS.FIXED_TIMESTEP;
```

#### 11. Actualizar `combat-system.js` (strings de acciones en switch)

**Cambios:**
```javascript
// Antes
switch (inputAction) {
    case 'dodge':
        return input.wantsToDodge;
    case 'specialAttack':
        return input.wantsToSpecialAttack;
    // ...
}

// Después
import { COMBAT_CONSTANTS } from '../../config/combat-constants.js';

switch (inputAction) {
    case COMBAT_CONSTANTS.ACTION_IDS.DODGE:
        return input.wantsToDodge;
    case COMBAT_CONSTANTS.ACTION_IDS.SPECIAL_ATTACK:
        return input.wantsToSpecialAttack;
    // ...
}
```

#### 12. Actualizar `combo-system.js` (strings de inputType)

**Cambios:**
```javascript
// Antes
if (input.wantsToHeavyAttack) {
    inputType = 'heavyAttack';
} else if (input.wantsToChargedAttack) {
    inputType = 'chargedAttack';
}
if (currentStep && timeSinceLastInput > currentStep.timing * 1.5) {

// Después
import { COMBAT_CONSTANTS } from '../../config/combat-constants.js';
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';

if (input.wantsToHeavyAttack) {
    inputType = COMBAT_CONSTANTS.ACTION_IDS.HEAVY_ATTACK;
} else if (input.wantsToChargedAttack) {
    inputType = COMBAT_CONSTANTS.ACTION_IDS.CHARGED_ATTACK;
}
if (currentStep && timeSinceLastInput > currentStep.timing * ANIMATION_CONSTANTS.COMBO.TIMING_MULTIPLIER) {
```

#### 13. Actualizar `collision-system.js`

**Cambios:**
```javascript
// Antes
this.cacheInvalidationThreshold = 2;
if (particle.estado_nombre === 'solido') {
    // ...
}
position.z = 1;
position.x = 80;
position.y = 80;
const minZ = this.dimension.profundidad_maxima || -10;
const maxZ = this.dimension.altura_maxima || 40;

// Después
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';

this.cacheInvalidationThreshold = ANIMATION_CONSTANTS.COLLISION.CACHE_INVALIDATION_THRESHOLD;
if (particle.estado_nombre === ANIMATION_CONSTANTS.COLLISION.PARTICLE_STATE_SOLID) {
    // ...
}
position.z = ANIMATION_CONSTANTS.COLLISION.POSITION_CORRECTION.MIN_Z;
position.x = ANIMATION_CONSTANTS.COLLISION.DEFAULT_RESPAWN.X;
position.y = ANIMATION_CONSTANTS.COLLISION.DEFAULT_RESPAWN.Y;
const minZ = this.dimension.profundidad_maxima || ANIMATION_CONSTANTS.COLLISION.DEFAULT_DIMENSION.MIN_Z;
const maxZ = this.dimension.altura_maxima || ANIMATION_CONSTANTS.COLLISION.DEFAULT_DIMENSION.MAX_Z;
```

### Extensión Opcional: Helpers de Validación

Crear helpers para validar que constantes existen:

```javascript
// frontend/src/config/animation-constants.js

/**
 * Validar que un estado existe en ANIMATION_STATES
 * @param {string} stateId - ID del estado a validar
 * @param {Array} animationStates - Array de ANIMATION_STATES
 * @returns {boolean}
 */
export function validateStateExists(stateId, animationStates) {
    return animationStates.some(state => state.id === stateId);
}

/**
 * Obtener estado por defecto validado
 * @param {Array} animationStates - Array de ANIMATION_STATES
 * @returns {string} ID del estado idle o null si no existe
 */
export function getDefaultState(animationStates) {
    const idleState = ANIMATION_CONSTANTS.STATE_IDS.IDLE;
    if (validateStateExists(idleState, animationStates)) {
        return idleState;
    }
    console.warn(`Estado por defecto '${idleState}' no existe en ANIMATION_STATES`);
    return null;
}
```

## Beneficios de la Nueva Arquitectura

### 1. Single Source of Truth

**Antes:**
- 'idle' hardcodeado en 5+ lugares
- 'combat' hardcodeado en 2 lugares
- 'combo' hardcodeado en 1 lugar

**Después:**
- Todos los valores en `animation-constants.js`
- Cambios en un solo lugar se reflejan en todo el código

### 2. Refactoring Seguro

**Antes:**
- Cambiar ID de estado requiere buscar y reemplazar en múltiples archivos
- Riesgo de olvidar algún lugar

**Después:**
- Cambiar en `animation-constants.js` actualiza todo automáticamente
- TypeScript/IDE puede detectar usos de constantes

### 3. Prevención de Errores

**Antes:**
- Typos en strings pueden pasar desapercibidos
- `'idle'` vs `'Idle'` puede causar bugs silenciosos

**Después:**
- Constantes previenen typos
- IDE autocompletado ayuda a encontrar constantes correctas

### 4. Documentación Mejorada

**Antes:**
- Valores mágicos sin contexto
- No está claro qué representa cada valor

**Después:**
- Constantes con nombres descriptivos
- JSDoc explica propósito de cada constante
- Agrupa valores relacionados

### 5. Validación Centralizada

**Antes:**
- No hay validación de que estados existen
- Errores en runtime cuando se usa estado inexistente

**Después:**
- Helpers de validación opcionales
- Errores tempranos en desarrollo

### 6. Escalabilidad

**Antes:**
- Agregar nuevo tipo requiere buscar todos los lugares donde se usa
- Difícil mantener consistencia

**Después:**
- Agregar nueva constante es trivial
- Sistema de tipos ayuda a mantener consistencia

## Migración Propuesta

### Fase 1: Crear Archivos de Constantes

**Objetivo:** Crear `ecs-constants.js` y `animation-constants.js` con todas las constantes identificadas.

**Pasos:**
1. Crear `frontend/src/config/ecs-constants.js` con `COMPONENT_NAMES`
2. Crear `frontend/src/config/animation-constants.js` con todas las constantes de animación
3. Agregar todas las constantes (STATE_IDS, STATE_TYPES, CONDITION_TYPES, NUMERIC, SYSTEM_PRIORITIES, PLAYER_PHYSICS, etc.)
4. Agregar documentación JSDoc completa
5. Agregar helpers de validación opcionales

**Criterio de éxito:**
- Archivos creados con todas las constantes
- Documentación completa
- Sin dependencias circulares
- Separación clara entre constantes ECS y constantes de animación

### Fase 2: Migrar Nombres de Componentes ECS

**Objetivo:** Reemplazar nombres de componentes hardcodeados con `ECS_CONSTANTS.COMPONENT_NAMES`.

**Prioridad:** Alta - Usado extensivamente, errores pueden ser difíciles de detectar

**Pasos:**
1. Crear `ecs-constants.js` con `COMPONENT_NAMES`
2. Actualizar todos los sistemas para usar constantes
3. Actualizar `player-factory.js` para usar constantes
4. Buscar y reemplazar en todos los archivos ECS
5. Verificar que no hay regresiones
6. Testing completo

**Archivos a modificar:**
- Todos los archivos en `frontend/src/ecs/systems/`
- `frontend/src/ecs/factories/player-factory.js`
- Cualquier otro archivo que use `ecs.getComponent()`, `ecs.addComponent()`, o `requiredComponents`

**Criterio de éxito:**
- Todos los nombres de componentes usan constantes
- No hay strings hardcodeados de nombres de componentes
- Funcionalidad no cambia
- No hay errores de lint

### Fase 3: Migrar Strings Críticos de Animación ('idle', 'combat', 'combo')

**Objetivo:** Reemplazar strings hardcodeados más críticos.

**Prioridad:**
1. `'idle'` - Usado en fallbacks y valores por defecto
2. `'combat'` - Usado en type checking
3. `'combo'` - Usado en ConditionFactory

**Pasos:**
1. Actualizar imports en archivos afectados
2. Reemplazar strings con constantes
3. Verificar que no hay regresiones
4. Testing completo

**Archivos a modificar:**
- `animation-mixer-system.js`
- `animation-state-system.js`
- `state-registry.js`
- `condition-factory.js`
- `animation.js`
- `player-factory.js`

**Criterio de éxito:**
- Todos los strings críticos reemplazados
- Funcionalidad no cambia
- No hay errores de lint

### Fase 4: Migrar Números y Otros Valores

**Objetivo:** Reemplazar números hardcodeados y valores por defecto.

**Pasos:**
1. Reemplazar `1.0` con `PROGRESS_COMPLETE`
2. Reemplazar offsets por defecto con constantes
3. Usar `WEAPON_TYPES.GENERIC` en `combat-system.js`
4. Documentar prioridades de sistemas

**Criterio de éxito:**
- Números críticos centralizados
- Valores por defecto en constantes
- Documentación actualizada

### Fase 4: Validación y Testing

**Objetivo:** Agregar validación opcional y testing completo.

**Pasos:**
1. Agregar helpers de validación (opcional)
2. Testing completo de todas las animaciones
3. Verificar que no hay regresiones
4. Actualizar documentación

**Criterio de éxito:**
- Todas las animaciones funcionan correctamente
- No hay errores en consola
- Documentación actualizada

## Consideraciones Técnicas

### Compatibilidad

**✅ No rompe funcionalidad existente:**
- Solo reemplaza strings/valores con constantes
- El comportamiento es idéntico
- Cambios son puramente de refactoring

**✅ Compatible con sistema ECS:**
- No cambia estructura de componentes
- No cambia estructura de sistemas
- Solo cambia cómo se referencian valores

**✅ Compatible con configuración existente:**
- `ANIMATION_STATES` sigue funcionando igual
- `COMBAT_ACTIONS` sigue funcionando igual
- Solo agrega nueva capa de constantes

### Testing

**Tests necesarios:**
1. ✅ Verificar que todas las animaciones funcionan
2. ✅ Verificar que fallbacks funcionan (idle cuando no hay estado)
3. ✅ Verificar que type checking funciona (combat, combo)
4. ✅ Verificar que ConditionFactory funciona con constantes
5. ✅ Verificar que valores por defecto funcionan

### Performance

**Impacto:**
- ✅ Cero impacto de performance
- ✅ Acceso a constante es O(1) (igual que string literal)
- ✅ No hay overhead adicional

### Extensibilidad

**Futuras mejoras:**
- Agregar más estados fundamentales es trivial
- Agregar nuevos tipos es simple
- Validación puede extenderse según necesidad

## Riesgos y Mitigación

### Riesgo 1: Cambios incompletos

**Riesgo:** Algunos strings/números pueden quedar sin migrar.

**Mitigación:**
1. Buscar exhaustivamente con grep antes de migrar
2. Usar ESLint rules para detectar strings mágicos (futuro)
3. Code review cuidadoso

### Riesgo 2: Constantes incorrectas

**Riesgo:** Constantes pueden tener valores incorrectos.

**Mitigación:**
1. Validación en helpers opcionales
2. Testing exhaustivo
3. Comparar valores antes/después de migración

### Riesgo 3: Dependencias circulares

**Riesgo:** `animation-constants.js` puede crear dependencias circulares.

**Mitigación:**
1. Solo exportar constantes, no funciones que usan otros módulos
2. Helpers de validación pueden estar en archivo separado si es necesario
3. Verificar imports antes de commit

## Conclusión

### ✅ Centralización Recomendada

**La centralización es beneficiosa porque:**

1. **Elimina valores mágicos** dispersos en el código
2. **Facilita refactoring** cambiando valores en un solo lugar
3. **Previene errores** de tipeo con constantes
4. **Mejora documentación** con nombres descriptivos
5. **No rompe funcionalidad** existente
6. **Mejora escalabilidad** para futuras expansiones

### Plan de Acción

1. ✅ Crear `animation-constants.js` con todas las constantes
2. ✅ Migrar strings críticos ('idle', 'combat', 'combo')
3. ✅ Migrar números y valores por defecto
4. ✅ Agregar validación opcional
5. ✅ Testing completo y actualización de documentación

### Resultado Esperado

Después de la migración:
- **Código más mantenible:** Valores centralizados en un solo lugar
- **Menos errores:** Constantes previenen typos
- **Mejor documentación:** Nombres descriptivos y JSDoc
- **Refactoring seguro:** Cambios en un solo lugar
- **Escalable:** Fácil agregar nuevas constantes

## Referencias

- Ticket: JDG-029
- Relacionado con: JDG-028, JDG-028-2
- Archivos afectados:
  - `frontend/src/config/animation-constants.js` (nuevo)
  - `frontend/src/ecs/systems/animation-mixer-system.js`
  - `frontend/src/ecs/systems/animation-state-system.js`
  - `frontend/src/ecs/animation/states/state-registry.js`
  - `frontend/src/ecs/animation/conditions/condition-factory.js`
  - `frontend/src/ecs/components/animation.js`
  - `frontend/src/ecs/factories/player-factory.js`
  - `frontend/src/ecs/systems/combat-system.js`
  - `frontend/src/ecs/systems/physics-system.js`

