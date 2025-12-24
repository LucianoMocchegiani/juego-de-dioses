# Frontend - Estructura Modular

Este directorio contiene el código fuente del frontend, organizado en una arquitectura modular y escalable.

## Estructura

```
src/
├── main.js                    # Punto de entrada, inicialización mínima
├── app.js                     # Aplicación principal (orquestación)
│
├── core/                      # Infraestructura base compartida
│   ├── scene.js              # Escena base Three.js
│   ├── camera.js             # Gestión de cámara
│   ├── controls.js           # Controles de cámara (OrbitControls wrapper)
│   ├── renderer.js           # Renderizador WebGL
│   ├── lights.js             # Gestión de luces
│   ├── helpers.js            # Helpers (grid, axes) con gestión dinámica
│   ├── geometries/           # Registry de geometrías (compartido)
│   │   └── registry.js      # Registry de geometrías (box, sphere, etc.)
│   ├── renderers/            # Renderizadores base
│   │   └── base-renderer.js  # Clase base abstracta
│   ├── performance/          # Gestión de rendimiento
│   │   └── performance-manager.js
│   └── input/                # Input centralizado
│       └── input-manager.js
│
├── state/                    # Gestión de estado
│   ├── store.js             # Store centralizado
│   ├── actions.js           # Acciones para modificar estado
│   └── selectors.js         # Selectores de estado
│
├── api/                      # Cliente API modular
│   ├── client.js            # Cliente base con configuración
│   └── endpoints/          # Endpoints por recurso
│       ├── bloques.js
│       ├── particles.js
│       └── agrupaciones.js
│
├── ecs/                      # Sistema ECS (Entity Component System)
│   ├── manager.js          # ECSManager - Núcleo del sistema
│   ├── system.js           # Clase base System
│   ├── components/         # Componentes (Position, Physics, Render, Input, Animation)
│   ├── systems/            # Sistemas (Input, Physics, Render, Collision, Animation)
│   ├── factories/          # Factories para crear entidades (PlayerFactory)
│   └── models/             # Sistema de carga de modelos 3D (GLTF/GLB)
│       ├── model-loader.js
│       ├── model-cache.js
│       ├── bones-utils.js
│       └── ...
│
├── terrain/                 # Sistema de terreno (JDG-035-2)
│   ├── manager.js          # TerrainManager
│   ├── components/         # Componentes de datos
│   ├── systems/            # Sistemas de procesamiento
│   ├── renderers/          # Renderizadores
│   ├── optimizations/      # Optimizaciones (LOD, culling, limiting)
│   ├── utils/              # Utilidades específicas
│   └── api/                # Clientes API
│
├── world/                   # Servicios de integración del mundo (JDG-035-3)
│   ├── camera-controller.js # Control de cámara (sigue jugador)
│   └── collision-detector.js # Colisiones con terreno
│
├── utils/                    # Utilidades organizadas
│   ├── colors.js           # Utilidades de colores
│   ├── geometry.js         # Utilidades de geometría
│   ├── math.js             # Utilidades matemáticas
│   └── helpers.js          # Helpers generales
│
├── constants.js             # Constantes
└── types.js                 # Tipos JSDoc
```

## Flujo de Ejecución

```
1. main.js inicializa la aplicación
   ↓
2. app.js orquesta el flujo
   ↓
3. TerrainManager carga dimensión y partículas
   ↓
4. Store actualiza estado
   ↓
5. Componentes UI se actualizan (reactivos al estado)
```

## Módulos Principales

### Core (`core/`)
Infraestructura base compartida: configuración Three.js, registry de geometrías, renderizadores base, gestión de performance, input centralizado.

**Contenido:**
- Configuración Three.js (scene, camera, renderer, controls, lights, helpers)
- `geometries/registry.js`: Registry compartido usado por terrain y otros sistemas
- `renderers/base-renderer.js`: Clase base abstracta para renderizadores
- `performance/performance-manager.js`: Métricas globales de rendimiento
- `input/input-manager.js`: Input centralizado usado por app y ECS

**Ver:** `core/README.md` para documentación completa.

### Terrain (`terrain/`)
Sistema completo de terreno: gestión de partículas, viewports, renderizado, optimizaciones.

**Ver:** `terrain/README.md` para documentación completa.

### World (`world/`)
Servicios que integran múltiples sistemas para el mundo virtual: control de cámara, detección de colisiones.

**Ver:** `world/README.md` para documentación completa.

### State (`state/`)
Sistema de gestión de estado centralizado (custom store simple).

**Ver:** `state/README.md` para documentación completa.

### API (`api/`)
Cliente API modular organizado por recurso.

**Ver:** `api/README.md` para documentación completa.

### ECS (`ecs/`)
Sistema ECS (Entity Component System) para gestionar entidades jugables y del mundo.

**Características:**
- Componentes: Position, Physics, Render, Input, Animation
- Sistemas: InputSystem, PhysicsSystem, RenderSystem, CollisionSystem, AnimationSystem
- Factories: PlayerFactory para crear jugadores
- Models: Sistema de carga de modelos 3D (GLTF/GLB) usado solo por ECS

**Ver:** `ecs/README.md` para documentación completa.

### Utils (`utils/`)
Funciones de utilidad organizadas por tipo.

**Ver:** `utils/README.md` para documentación completa.

## Convenciones

### Nomenclatura
- **Clases**: PascalCase (`ParticleRenderer`, `ViewportManager`)
- **Funciones**: camelCase (`calculateViewport`, `getStyle`)
- **Constantes**: UPPER_SNAKE_CASE (`MAX_INSTANCES_PER_MESH`)
- **Archivos**: camelCase (`particle-renderer.js`, `viewport-manager.js`)

### Patrones de Diseño
- **Registry Pattern**: Para geometrías y renderizadores
- **Strategy Pattern**: Para renderizadores especializados
- **Factory Pattern**: Para creación de geometrías y entidades
- **Observer Pattern**: Para gestión de estado
- **Component Pattern**: Para componentes UI
- **ECS Pattern**: Para gestión de entidades jugables (Entity Component System)

## Extensibilidad

### Agregar Nuevo Renderizador
1. Para terreno: Crear en `terrain/renderers/` (extender `BaseRenderer` de `core/renderers/`)
2. Para otros: Crear en el módulo correspondiente (ECS, etc.)

### Agregar Nueva Geometría
1. Agregar factory en `core/geometries/registry.js`
2. Registrar con `registry.register('tipo', factory)`

## Mantenimiento de READMEs

**IMPORTANTE:** Cada vez que se modifique un módulo o carpeta:

1. **Actualizar README del módulo/carpeta modificado**
2. **Verificar y actualizar READMEs padres si es necesario**
3. **Mantener documentación sincronizada con el código**

## Referencias

- Ver `frontend/README.md` para información general del frontend
- Ver análisis de arquitectura: `instructions/analysis/JDG-006-architecture-analysis_2025-12-05_11-51-20.md`

