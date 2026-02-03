# Frontend - Estructura Modular

Este directorio contiene el código fuente del frontend, organizado en una arquitectura modular y escalable.

## Estructura

```
src/
├── main.js                    # Punto de entrada (usa createApp del bootstrap)
├── app.js                     # Aplicación principal (recibe ports y store)
│
├── domain/                    # Modelos de dominio (world, particles, character)
├── application/              # Casos de uso (loadWorld, spawnPlayer, syncCelestial)
├── ports/                     # Contratos (APIs)
├── adapters/                  # Implementaciones HTTP (api-client, http-*)
│
├── driving/                   # Entrada: game loop, input, UI
│   ├── game/                  # game-bootstrap.js, game-loop.js
│   ├── input/                 # input-manager.js
│   └── ui/                    # Paneles (futuro)
│
├── rendering/                 # Todo lo 3D
│   ├── scene/                 # Scene3D, cámara, luces, renderer
│   ├── loaders/               # ModelLoader, ModelCache, bones-utils
│   ├── ecs/                   # ECSManager, systems, components, factories
│   ├── terrain/               # TerrainManager (ports inyectados)
│   ├── world/                 # CameraController, CollisionDetector, Celestial
│   ├── optimizations/        # ObjectPool, FrustumCuller, LOD, etc.
│   ├── geometries/           # GeometryRegistry
│   ├── renderers/            # BaseRenderer
│   └── performance/          # PerformanceManager
│
├── state/                     # Store, actions, selectors
├── config/                    # Constantes y configuraciones
├── shared/                    # Utilidades puras (math, geometry, colors, helpers, config, cursor-manager)
├── api/                       # Cliente API (usado por bootstrap y PlayerFactory)
├── utils/                     # weapon-attachment, weapon-utils (resto en shared/)
├── interfaces/                # Paneles de debug (base-interface, debug-panel, test-interface)
├── debug/                     # Logger, métricas, inspector
└── types.js                   # Tipos JSDoc
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

### Rendering (`rendering/`)
Todo lo 3D: escena, loaders, ECS, terreno, mundo, optimizaciones, geometrías, renderers, performance.

**Ver:** `rendering/README.md`.

### Driving (`driving/`)
Bootstrap (ports, store, createApp), game loop, InputManager, UI.

### Application (`application/`)
Casos de uso: loadWorld, spawnPlayer, syncCelestial (orquestan ports y store).

### State (`state/`)
Sistema de gestión de estado centralizado (custom store simple).

**Ver:** `state/README.md` para documentación completa.

### Shared (`shared/`)
Utilidades puras: math, geometry, colors, helpers, config, cursor-manager.

**Ver:** `shared/README.md`.

### API (`api/`)
Cliente API y endpoints (usado por bootstrap y PlayerFactory hasta migración completa).

**Ver:** `api/README.md`.

### Utils (`utils/`)
weapon-attachment, weapon-utils (el resto en shared/).

**Ver:** `utils/README.md`.

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
1. Para terreno: Crear en `rendering/terrain/renderers/` (extender `BaseRenderer` de `rendering/renderers/`)
2. Para otros: Crear en el módulo correspondiente (ECS, etc.)

### Agregar Nueva Geometría
1. Agregar factory en `rendering/geometries/registry.js`
2. Registrar con `registry.register('tipo', factory)`

## Mantenimiento de READMEs

**IMPORTANTE:** Cada vez que se modifique un módulo o carpeta:

1. **Actualizar README del módulo/carpeta modificado**
2. **Verificar y actualizar READMEs padres si es necesario**
3. **Mantener documentación sincronizada con el código**

## Referencias

- Ver `frontend/README.md` para información general del frontend
- Ver análisis de arquitectura: `instructions/analysis/JDG-006-architecture-analysis_2025-12-05_11-51-20.md`

