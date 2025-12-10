# Frontend - Estructura Modular

Este directorio contiene el código fuente del frontend, organizado en una arquitectura modular y escalable.

## Estructura

```
src/
├── main.js                    # Punto de entrada, inicialización mínima
├── app.js                     # Aplicación principal (orquestación)
│
├── core/                      # Núcleo de Three.js
│   ├── scene.js              # Escena base (configuración mínima)
│   ├── camera.js             # Gestión de cámara
│   ├── controls.js           # Controles de cámara (OrbitControls wrapper)
│   ├── renderer.js           # Renderizador WebGL
│   ├── lights.js             # Gestión de luces
│   └── helpers.js            # Helpers (grid, axes) con gestión dinámica
│
├── renderers/                 # Sistema de renderizadores
│   ├── base-renderer.js      # Renderizador base abstracto
│   ├── particle-renderer.js  # Renderizador genérico de partículas
│   ├── tree-renderer.js      # Renderizador especializado para árboles
│   ├── geometries/           # Registry de geometrías
│   │   └── registry.js      # Registry de geometrías (box, sphere, cylinder, etc.)
│   └── registry.js          # Registry de renderizadores
│
├── components/               # Componentes reutilizables
│   ├── ui/                   # Componentes UI
│   │   ├── button.js
│   │   ├── panel.js
│   │   ├── loading.js
│   │   └── info-panel.js
│   └── entities/             # Componentes de entidades
│       ├── tree-view.js
│       └── entity-info.js
│
├── state/                    # Gestión de estado
│   ├── store.js             # Store centralizado
│   ├── actions.js           # Acciones para modificar estado
│   └── selectors.js         # Selectores de estado
│
├── managers/                 # Gestores de alto nivel
│   ├── viewport-manager.js  # Gestión de viewport y carga de datos
│   ├── style-manager.js     # Gestión de cache de estilos
│   └── entity-manager.js    # Gestión de entidades y renderizadores
│
├── api/                      # Cliente API modular
│   ├── client.js            # Cliente base con configuración
│   └── endpoints/          # Endpoints por recurso
│       ├── dimensions.js
│       ├── particles.js
│       └── agrupaciones.js
│
├── ecs/                      # Sistema ECS (Entity Component System)
│   ├── manager.js          # ECSManager - Núcleo del sistema
│   ├── system.js           # Clase base System
│   ├── components/         # Componentes (Position, Physics, Render, Input, Animation)
│   ├── systems/            # Sistemas (Input, Physics, Render, Collision, Animation)
│   └── factories/          # Factories para crear entidades (PlayerFactory)
│
├── systems/                 # Sistemas de juego
│   ├── input-manager.js   # Gestor centralizado de input
│   ├── collision-detector.js # Detector de colisiones
│   └── camera-controller.js  # Controlador de cámara
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
3. ViewportManager calcula viewport
   ↓
4. ApiClient carga datos (partículas, tipos)
   ↓
5. StyleManager cachea estilos
   ↓
6. EntityManager selecciona renderizadores apropiados
   ↓
7. Renderizadores especializados renderizan entidades
   ↓
8. Store actualiza estado
   ↓
9. Componentes UI se actualizan (reactivos al estado)
```

## Módulos Principales

### Core (`core/`)
Configuración base de Three.js: escena, cámara, controles, renderizador, luces, helpers.

**Ver:** `core/README.md` para documentación completa.

### Renderers (`renderers/`)
Sistema de renderizadores especializados por tipo de entidad, con soporte para formas geométricas desde BD.

**Ver:** `renderers/README.md` para documentación completa.

### Components (`components/`)
Componentes UI reutilizables y componentes de entidades.

**Ver:** `components/README.md` para documentación completa.

### State (`state/`)
Sistema de gestión de estado centralizado (custom store simple).

**Ver:** `state/README.md` para documentación completa.

### Managers (`managers/`)
Gestores de alto nivel que coordinan múltiples sistemas.

**Ver:** `managers/README.md` para documentación completa.

### API (`api/`)
Cliente API modular organizado por recurso.

**Ver:** `api/README.md` para documentación completa.

### ECS (`ecs/`)
Sistema ECS (Entity Component System) para gestionar entidades jugables y del mundo.

**Características:**
- Componentes: Position, Physics, Render, Input, Animation
- Sistemas: InputSystem, PhysicsSystem, RenderSystem, CollisionSystem, AnimationSystem
- Factories: PlayerFactory para crear jugadores

**Ver:** `ecs/README.md` para documentación completa.

### Systems (`systems/`)
Sistemas de juego que operan sobre entidades del ECS o proporcionan servicios globales.

**Características:**
- InputManager: Gestión centralizada de input (teclado, mouse)
- CollisionDetector: Detección de colisiones con partículas sólidas
- CameraController: Controlador de cámara que sigue al jugador

**Ver:** `systems/README.md` para documentación completa.

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
1. Crear archivo en `renderers/` (ej: `plant-renderer.js`)
2. Extender `BaseRenderer`
3. Registrar en `renderers/registry.js`
4. Actualizar `EntityManager` para seleccionarlo

### Agregar Nueva Geometría
1. Agregar factory en `renderers/geometries/registry.js`
2. Registrar con `registry.register('tipo', factory)`

### Agregar Nuevo Componente UI
1. Crear archivo en `components/ui/` (ej: `modal.js`)
2. Implementar métodos `render()`, `update()`, `destroy()`
3. Exportar en `components/__init__.js`

## Mantenimiento de READMEs

**IMPORTANTE:** Cada vez que se modifique un módulo o carpeta:

1. **Actualizar README del módulo/carpeta modificado**
2. **Verificar y actualizar READMEs padres si es necesario**
3. **Mantener documentación sincronizada con el código**

## Referencias

- Ver `frontend/README.md` para información general del frontend
- Ver análisis de arquitectura: `instructions/analysis/JDG-006-architecture-analysis_2025-12-05_11-51-20.md`

