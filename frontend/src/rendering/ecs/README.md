# Sistema ECS (Entity Component System)

ECS (Entity Component System) es un patrón de arquitectura que separa datos de lógica.

**⚠️ IMPORTANTE: Este ECS está diseñado para ENTIDADES DINÁMICAS**

Este módulo implementa un sistema ECS completo para gestionar **entidades dinámicas** (personajes, NPCs, monstruos, objetos interactivos) en el juego.

## ¿Para qué se usa este ECS?

Este ECS está optimizado para **entidades que cambian constantemente** y necesitan:
- Física dinámica (gravedad, movimiento, colisiones)
- Input del usuario
- Animaciones complejas
- Lógica de combate
- Interacción en tiempo real

### Ejemplos de entidades que usan este ECS:

✅ **Personajes del jugador**
- Movimiento, saltos, combate
- Animaciones complejas
- Input del usuario

✅ **NPCs (Personajes No Jugadores)**
- Movimiento autónomo
- IA básica
- Animaciones

✅ **Monstruos/Enemigos**
- Movimiento y ataque
- IA de combate
- Animaciones de ataque

✅ **Objetos interactivos**
- Cajas que se mueven
- Puertas que se abren
- Proyectiles

### ❌ NO se usa para:

❌ **Partículas del mundo** (suelo, árboles, rocas estáticas)
- Usan el sistema `particles/` (ver análisis de arquitectura)
- Mayormente estáticas
- Renderizado optimizado con instanced rendering

❌ **Estructuras estáticas**
- No necesitan física ni animación
- Se renderizan como partículas del mundo

## Conceptos

### Entity (Entidad)
- ID único que identifica una entidad **dinámica**
- No contiene datos ni lógica
- Es un contenedor de componentes
- **Ejemplos**: ID del jugador, ID de un NPC, ID de un monstruo

### Component (Componente)
- Almacena solo datos (sin lógica)
- Representa una característica o propiedad de una entidad dinámica
- **Ejemplos**: 
  - `PositionComponent` - Posición del personaje
  - `PhysicsComponent` - Velocidad, gravedad, masa
  - `RenderComponent` - Mesh 3D del personaje
  - `InputComponent` - Estado de teclas presionadas
  - `AnimationComponent` - Estado de animación actual

### System (Sistema)
- Contiene solo lógica (sin datos)
- Opera sobre componentes específicos de entidades dinámicas
- **Ejemplos**: 
  - `PhysicsSystem` - Aplica gravedad y movimiento
  - `InputSystem` - Procesa input del usuario
  - `AnimationSystem` - Gestiona animaciones
  - `CombatSystem` - Maneja combate

## Estructura (por dominios)

```
ecs/
├── core/                     # Núcleo del motor ECS
│   ├── world.js             # ECSManager
│   └── system.js            # Clase base System
├── components/              # Componentes (datos puros)
│   ├── position.js, physics.js, render.js, input.js, animation.js, combo.js, combat.js, weapon.js
│   └── index.js
├── domains/
│   ├── animation/           # Animación: systems, state-machine (states + conditions), helpers
│   ├── combat/              # Combate: systems, combos, helpers
│   ├── input/               # Input: systems, helpers
│   ├── physics/             # Física: systems, helpers
│   ├── collision/           # Colisiones: systems, helpers
│   ├── render/              # Render: systems
│   └── weapon/              # Armas: systems, helpers
├── systems/                  # Re-exporta todos los sistemas desde domains/*/systems/
│   └── index.js
├── factories/               # Creación de entidades (PlayerFactory, etc.)
├── combos/                  # Sistema de combos (lógica de combate)
├── animation/               # Sistema de animaciones (helpers específicos)
│   └── README.md           # Documentación del sistema de animaciones
├── factories/               # Factories para crear entidades
│   └── player-factory.js   # Factory para crear jugador
├── models/                  # Sistema de carga de modelos 3D (JDG-035-3)
│   ├── model-loader.js     # Loader de modelos (GLTF/GLB)
│   ├── model-cache.js      # Cache de modelos
│   ├── model-utils.js      # Utilidades de carga y transformación
│   ├── bones-utils.js      # Utilidades para bones/esqueleto
│   └── vertex-groups-utils.js # (ELIMINADO) Utilidades para vertex groups (deprecated — eliminado)
└── index.js                 # Exportaciones principales
```

## Uso Básico

### 1. Crear ECS Manager

```javascript
import { ECSManager } from './ecs/index.js';

const ecs = new ECSManager();
```

### 2. Crear una Entidad

```javascript
const playerId = ecs.createEntity();
```

### 3. Agregar Componentes

```javascript
import { PositionComponent, PhysicsComponent, RenderComponent, InputComponent } from './ecs/index.js';

// Agregar componente de posición
ecs.addComponent(playerId, 'Position', new PositionComponent(80, 80, 1));

// Agregar componente de física
ecs.addComponent(playerId, 'Physics', new PhysicsComponent({
    mass: 70,
    useGravity: true,
    isGrounded: false
}));

// Agregar componente de renderizado
const mesh = new THREE.Mesh(geometry, material);
ecs.addComponent(playerId, 'Render', new RenderComponent({ mesh }));

// Agregar componente de input
ecs.addComponent(playerId, 'Input', new InputComponent());

// Agregar componente de animación
ecs.addComponent(playerId, 'Animation', new AnimationComponent({
    currentState: 'idle',
    animationSpeed: 1.0
}));
```

### 4. Registrar Sistemas

```javascript
import { InputSystem, PhysicsSystem, RenderSystem, CollisionSystem, AnimationStateSystem, AnimationMixerSystem } from './ecs/systems/index.js';

const inputSystem = new InputSystem(inputManager);
const physicsSystem = new PhysicsSystem({ gravity: -9.8 });
const animationStateSystem = new AnimationStateSystem();
const animationMixerSystem = new AnimationMixerSystem();
const collisionSystem = new CollisionSystem(collisionDetector, bloqueId, dimension);
const renderSystem = new RenderSystem(cellSize);

ecs.registerSystem(inputSystem);        // Priority 0 - Ejecutar primero
ecs.registerSystem(physicsSystem);      // Priority 1
ecs.registerSystem(animationStateSystem); // Priority 2 - Determina estados de animación
ecs.registerSystem(animationMixerSystem);  // Priority 2.5 - Reproduce animaciones GLB
ecs.registerSystem(collisionSystem);    // Priority 2
ecs.registerSystem(renderSystem);       // Priority 3 - Ejecutar al final
```

### 5. Actualizar Sistemas

```javascript
function animate(deltaTime) {
    // Actualizar todos los sistemas
    ecs.update(deltaTime);
    
    // Renderizar escena
    renderer.render(scene, camera);
}
```

## Queries (Consultas)

Obtener entidades que tienen componentes específicos:

```javascript
// Entidades con Position y Physics
const entities = ecs.query('Position', 'Physics');

// Entidades con todos los componentes
const players = ecs.query('Position', 'Physics', 'Render', 'Input');
```

## Estadísticas

Obtener estadísticas del ECS:

```javascript
const stats = ecs.getStats();
console.log(stats);
// {
//   entities: 10,
//   components: { Position: 10, Physics: 8, Render: 8 },
//   systems: 3,
//   queries: 5
// }
```

## Componentes Disponibles

### PositionComponent
Almacena posición 3D en celdas (x, y, z).

### PhysicsComponent
Almacena propiedades físicas: velocidad, aceleración, masa, gravedad, fricción, etc.

### RenderComponent
Almacena referencia al mesh de Three.js y propiedades de renderizado.

### InputComponent
Almacena estado de input: teclas presionadas, dirección de movimiento, acciones (saltar, agacharse, etc.).

### AnimationComponent
Almacena estado de animación: estado actual (idle, walk, run, jump, crouch, combo_attack, etc.) y velocidad de animación.

### ComboComponent
Almacena estado de combo activo: ID del combo, paso actual, última animación ejecutada, y si el combo está completo.

### CombatComponent
Almacena estado de combate: si está atacando, tipo de ataque/defensa, si puede cancelar, y animación de combate activa.

### WeaponComponent (Opcional)
Almacena información del arma equipada: tipo de arma, ID del arma, y si tiene escudo. Preparado para sistema futuro de armamentos.

## Sistemas Disponibles

### InputSystem (Priority 0)
Procesa input del InputManager y actualiza InputComponent. Se ejecuta primero.

### CombatSystem (Priority 1.4)
Procesa combinaciones de teclas para acciones de combate (ataques pesados, cargados, especiales, parry, dodge, grab).

**Ver:** [../config/combat-actions-config.js](../config/combat-actions-config.js)

### ComboSystem (Priority 1.5)
Gestiona detección y ejecución de combos (secuencias de ataques consecutivos).

**Ver:** [combos/README.md](combos/README.md)

### PhysicsSystem (Priority 1)
Aplica física: gravedad, velocidad, aceleración, fricción. Usa timestep fijo para estabilidad.

### AnimationStateSystem (Priority 2)
Determina estado de animación según Input, Physics, Combo y Combat usando una máquina de estados escalable con configuración declarativa.

**Ver:** [animation/README.md](animation/README.md)

### AnimationMixerSystem (Priority 2.5)
Reproduce animaciones GLB usando Three.js AnimationMixer basándose en el estado determinado por AnimationStateSystem.

### CollisionSystem (Priority 2)
Detecta y resuelve colisiones con partículas sólidas del mundo.

### RenderSystem (Priority 3)
Actualiza posición y rotación de meshes. Se ejecuta al final.

## Ventajas del ECS

1. **Composición flexible:** Combina componentes para crear diferentes tipos de entidades
2. **Reutilización:** Los mismos componentes y sistemas sirven para diferentes entidades
3. **Separación clara:** Datos (componentes) vs. lógica (sistemas)
4. **Escalabilidad:** Fácil agregar nuevos componentes y sistemas
5. **Performance:** Sistemas optimizados pueden procesar componentes en batch
6. **Orden de ejecución:** Prioridades permiten controlar el orden de actualización

## Extensibilidad

Para agregar nuevos componentes:

1. Crear archivo en `ecs/components/`
2. Exportar desde `ecs/components/index.js`
3. Usar en entidades dinámicas

Para agregar nuevos sistemas:

1. Importar `System` desde `../../system.js` (clase base compartida)
2. Extender `System` en `ecs/systems/`
3. Implementar método `update(deltaTime)`
4. Registrar con `ecs.registerSystem()`

**Ejemplo:**
```javascript
import { System } from '../../system.js';

export class MyNewSystem extends System {
    constructor() {
        super();
        this.requiredComponents = ['Position', 'Physics'];
        this.priority = 1.5;
    }
    
    update(deltaTime) {
        const entities = this.getEntities();
        // Lógica del sistema
    }
}
```

## Ejemplos de Uso

### Crear un NPC

```javascript
// Crear NPC
const npcId = ecs.createEntity();

// Agregar componentes
ecs.addComponent(npcId, 'Position', new PositionComponent(50, 50, 1));
ecs.addComponent(npcId, 'Physics', new PhysicsComponent({
    mass: 60,
    useGravity: true
}));
ecs.addComponent(npcId, 'Render', new RenderComponent({ mesh: npcMesh }));
ecs.addComponent(npcId, 'Animation', new AnimationComponent({
    currentState: 'idle'
}));

// El NPC será procesado automáticamente por los sistemas ECS
```

### Crear un Monstruo

```javascript
// Crear monstruo
const monsterId = ecs.createEntity();

// Agregar componentes
ecs.addComponent(monsterId, 'Position', new PositionComponent(100, 100, 1));
ecs.addComponent(monsterId, 'Physics', new PhysicsComponent({
    mass: 80,
    useGravity: true
}));
ecs.addComponent(monsterId, 'Render', new RenderComponent({ mesh: monsterMesh }));
ecs.addComponent(monsterId, 'Combat', new CombatComponent({
    attackPower: 10,
    health: 100
}));

// El monstruo será procesado por PhysicsSystem, RenderSystem, CombatSystem
```

### Crear un Objeto Interactivo (Caja)

```javascript
// Crear caja que se puede mover
const boxId = ecs.createEntity();

// Agregar componentes
ecs.addComponent(boxId, 'Position', new PositionComponent(75, 75, 1));
ecs.addComponent(boxId, 'Physics', new PhysicsComponent({
    mass: 20,
    useGravity: true,
    isGrounded: false
}));
ecs.addComponent(boxId, 'Render', new RenderComponent({ mesh: boxMesh }));

// La caja caerá por gravedad y colisionará con el mundo
```

## Separación con Sistema de Partículas

Este ECS está separado del sistema de partículas del mundo:

- **`ecs/`** → Entidades dinámicas (personajes, NPCs, monstruos, objetos interactivos)
- **`particles/`** → Partículas del mundo (suelo, árboles, rocas, estructuras estáticas)

**Razón de la separación:**
- ECS optimizado para entidades que cambian constantemente (cada frame)
- Partículas optimizadas para renderizado masivo (instanced rendering, LOD, culling)
- Diferentes ciclos de actualización (ECS cada frame, partículas menos frecuente)
- Diferentes necesidades (física vs renderizado optimizado)

**Ver análisis de arquitectura:** `instructions/analysis/JDG-026-architecture-analysis_2025-12-14_22-40-43.md`

## Referencias

- Ver análisis de arquitectura: `instructions/analysis/JDG-010-architecture-analysis_2025-12-06_10-18-44.md`
- Ver action plan: `instructions/tasks/JDG-010-action-plan_2025-12-06_10-40-04.md`
- Ver análisis de partículas vs ECS: `instructions/analysis/JDG-026-architecture-analysis_2025-12-14_22-40-43.md`

