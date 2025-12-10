# Sistema ECS (Entity Component System)

Este módulo implementa un sistema ECS completo para gestionar entidades, componentes y sistemas en el juego.

## Conceptos

### Entity (Entidad)
- ID único que identifica una entidad
- No contiene datos ni lógica
- Es un contenedor de componentes

### Component (Componente)
- Almacena solo datos (sin lógica)
- Representa una característica o propiedad
- Ejemplos: Position, Physics, Render, Input

### System (Sistema)
- Contiene solo lógica (sin datos)
- Opera sobre componentes específicos
- Ejemplos: PhysicsSystem, RenderSystem, InputSystem

## Estructura

```
ecs/
├── manager.js              # ECSManager - Núcleo del sistema
├── system.js               # Clase base System
├── components/              # Componentes
│   ├── position.js         # Componente de posición
│   ├── physics.js          # Componente de física
│   ├── render.js           # Componente de renderizado
│   ├── input.js            # Componente de input
│   ├── animation.js        # Componente de animación
│   └── index.js            # Exportaciones
├── systems/                 # Sistemas
│   ├── input-system.js     # Sistema de input
│   ├── physics-system.js    # Sistema de física
│   ├── render-system.js    # Sistema de renderizado
│   ├── collision-system.js # Sistema de colisiones
│   ├── animation-state-system.js # Máquina de estados para animaciones
│   ├── animation-mixer-system.js  # Sistema de reproducción de animaciones GLB
│   └── index.js            # Exportaciones
├── animation/               # Sistema de animaciones escalable
│   ├── config/             # Configuración declarativa de animaciones
│   ├── conditions/         # Sistema de condiciones evaluables
│   ├── states/             # Sistema de estados y registry
│   └── README.md           # Documentación del sistema de animaciones
├── factories/               # Factories para crear entidades
│   └── player-factory.js   # Factory para crear jugador
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
const collisionSystem = new CollisionSystem(collisionDetector, dimensionId, dimension);
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
Almacena estado de animación: estado actual (idle, walk, run, jump, crouch) y velocidad de animación.

## Sistemas Disponibles

### InputSystem (Priority 0)
Procesa input del InputManager y actualiza InputComponent. Se ejecuta primero.

### PhysicsSystem (Priority 1)
Aplica física: gravedad, velocidad, aceleración, fricción. Usa timestep fijo para estabilidad.

### AnimationStateSystem (Priority 2)
Determina estado de animación según Input y Physics usando una máquina de estados escalable con configuración declarativa.

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
3. Usar en entidades

Para agregar nuevos sistemas:

1. Extender `System` en `ecs/systems/`
2. Implementar método `update(deltaTime)`
3. Registrar con `ecs.registerSystem()`

## Referencias

- Ver análisis de arquitectura: `instructions/analysis/JDG-010-architecture-analysis_2025-12-06_10-18-44.md`
- Ver action plan: `instructions/tasks/JDG-010-action-plan_2025-12-06_10-40-04.md`

