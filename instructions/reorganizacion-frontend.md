# Propuesta de Reorganización del Frontend

## Problemas Actuales

1. **Confusión de nombres**: `systems/` contiene managers/controllers, no sistemas ECS
2. **Constantes dispersas**: `constants.js` está en la raíz, debería estar en `config/`
3. **Configuración de debug dispersa**: `debug/config.js` debería estar en `config/` como `debug-config.js`
4. **Utilidades mal ubicadas**: `weapon-attachment.js` está en `utils/` pero trabaja con modelos 3D
5. **Partículas dispersas**: Todo lo relacionado con partículas del mundo está disperso en múltiples directorios (`renderers/`, `managers/`, `systems/`, `utils/`, `api/`)

## Estructura Propuesta

```
frontend/src/
├── api/                    # Cliente API y endpoints (mantener)
├── components/             # Componentes UI (mantener)
├── config/                 # Configuraciones y constantes
│   ├── animation-config.js
│   ├── animation-constants.js
│   ├── combat-*.js
│   ├── constants.js       # ← MOVER desde raíz
│   ├── debug-config.js    # ← MOVER desde debug/config.js (renombrar)
│   ├── ecs-constants.js
│   └── ...
├── core/                   # Núcleo de Three.js (mantener)
│   ├── camera.js
│   ├── controls.js
│   ├── renderer.js
│   └── scene.js
├── debug/                  # Debugging (mantener)
├── system.js               # Clase base System (NUEVO - mover desde ecs/)
├── ecs/                    # Sistema ECS para entidades dinámicas (mantener - bien estructurado)
│   ├── manager.js          # ECSManager
│   ├── components/         # Componentes para personajes, NPCs, monstruos
│   ├── systems/            # Sistemas ECS reales (extienden System de raíz)
│   ├── managers/
│   └── ...
├── particles/              # Sistema de Partículas del Mundo (NUEVO - similar a ECS)
│   ├── manager.js          # ParticleManager (similar a ECSManager)
│   ├── components/         # Componentes de partículas
│   │   ├── particle.js
│   │   ├── position.js
│   │   └── render.js
│   ├── systems/            # Sistemas de partículas
│   │   ├── render-system.js    # ← MOVER desde renderers/particle-renderer.js
│   │   ├── lod-system.js       # ← MOVER desde renderers/optimizations/lod-manager.js
│   │   └── culling-system.js   # ← MOVER desde utils/culling.js
│   ├── managers/           # Managers de partículas
│   │   ├── style-manager.js     # ← MOVER desde managers/style-manager.js
│   │   └── viewport-manager.js  # ← MOVER desde managers/viewport-manager.js
│   ├── optimizations/      # Optimizaciones específicas
│   │   └── batch-manager.js     # Agrupación para instanced rendering
│   ├── utils/              # Utilidades de partículas
│   │   └── sorting.js          # ← MOVER desde utils/sorting.js
│   └── api/                # Endpoints API de partículas
│       ├── particles.js         # ← MOVER desde api/endpoints/particles.js
│       └── dimensions.js       # ← MOVER desde api/endpoints/dimensions.js
├── managers/               # Managers y controladores del juego
│   ├── input-manager.js    # ← MOVER desde systems/
│   ├── camera-controller.js # ← MOVER desde systems/
│   ├── performance-manager.js
│   └── ...
├── renderers/              # Renderizadores (solo modelos 3D y UI)
│   ├── models/
│   │   ├── bones-utils.js
│   │   ├── weapon-attachment.js # ← MOVER desde utils/
│   │   └── ...
│   └── ...
├── state/                  # Estado global (mantener)
├── utils/                  # Utilidades genéricas (sin weapon-attachment)
│   ├── colors.js
│   ├── geometry.js
│   ├── math.js
│   └── ...
└── app.js, main.js         # Puntos de entrada (mantener)
```

## Cambios Propuestos

### 1. Mover `systems/` → `managers/`
**Razón**: Los archivos en `systems/` son managers/controllers, no sistemas ECS. Evita confusión con `ecs/systems/`.

**Archivos a mover:**
- `systems/input-manager.js` → `managers/input-manager.js`
- `systems/camera-controller.js` → `managers/camera-controller.js`
- `systems/collision-detector.js` → `managers/collision-detector.js`

**Archivos a actualizar:**
- Todos los imports que usen estos archivos
- `app.js` y otros archivos que importen desde `systems/`

### 2. Mover `constants.js` → `config/constants.js`
**Razón**: Centraliza todas las configuraciones y constantes en un solo lugar.

**Archivos a actualizar:**
- Todos los imports: `from '../constants.js'` → `from '../config/constants.js'`

### 3. Mover y renombrar `debug/config.js` → `config/debug-config.js`
**Razón**: Centraliza todas las configuraciones en `config/`. El nombre `debug-config.js` es más descriptivo y evita confusión con otros archivos `config.js`.

**Archivos a mover:**
- `debug/config.js` → `config/debug-config.js`

**Archivos a actualizar:**
- `debug/logger.js`: `from './config.js'` → `from '../config/debug-config.js'`
- `debug/inspector.js`: `from './config.js'` → `from '../config/debug-config.js'`
- `debug/metrics.js`: `from './config.js'` → `from '../config/debug-config.js'`
- `debug/events.js`: `from './config.js'` → `from '../config/debug-config.js'`
- `debug/validator.js`: `from './config.js'` → `from '../config/debug-config.js'`
- `debug/ui/debug-interface.js`: `from '../config.js'` → `from '../../config/debug-config.js'`
- `debug/ui/debug-panel.js`: `from '../config.js'` → `from '../../config/debug-config.js'`
- `debug/README.md`: Actualizar referencias al archivo

### 4. Mover `utils/weapon-attachment.js` → `renderers/models/weapon-attachment.js`
**Razón**: Trabaja directamente con modelos 3D y usa `bones-utils.js` del mismo directorio.

**Archivos a actualizar:**
- Imports en `weapon-attachment.js`: `from '../renderers/models/bones-utils.js'` → `from './bones-utils.js'`
- Todos los imports que usen `weapon-attachment.js`

### 5. Mover `ecs/system.js` → `src/system.js` (raíz)
**Razón**: La clase base `System` será reutilizada tanto por `ecs/` como por `particles/`. Moverla a la raíz permite compartirla sin duplicación y mantiene la arquitectura consistente.

**Archivos a mover:**
- `ecs/system.js` → `src/system.js`

**Archivos a actualizar:**

**Sistemas ECS (8 archivos):**
- `ecs/systems/input-system.js`: `from '../system.js'` → `from '../../system.js'`
- `ecs/systems/physics-system.js`: `from '../system.js'` → `from '../../system.js'`
- `ecs/systems/render-system.js`: `from '../system.js'` → `from '../../system.js'`
- `ecs/systems/collision-system.js`: `from '../system.js'` → `from '../../system.js'`
- `ecs/systems/animation-state-system.js`: `from '../system.js'` → `from '../../system.js'`
- `ecs/systems/animation-mixer-system.js`: `from '../system.js'` → `from '../../system.js'`
- `ecs/systems/combo-system.js`: `from '../system.js'` → `from '../../system.js'`
- `ecs/systems/combat-system.js`: `from '../system.js'` → `from '../../system.js'`

**Exports:**
- `ecs/index.js`: `export { System } from './system.js'` → `export { System } from '../system.js'`

**Futuros sistemas de `particles/`:**
- Usarán `from '../../system.js'` para extender la clase base

### 6. Crear módulo `particles/` y mover todo lo relacionado con partículas del mundo
**Razón**: Centralizar todo lo relacionado con partículas del mundo (suelo, árboles, rocas, estructuras) en un módulo estructurado similar a `ecs/`, pero específico para partículas. Esto separa claramente:
- `ecs/` → Entidades dinámicas (personajes, NPCs, monstruos, objetos interactivos)
- `particles/` → Partículas del mundo (suelo, árboles, rocas, estructuras estáticas/semi-estáticas)

**Estructura propuesta:**
```
particles/
├── manager.js          # ParticleManager (similar a ECSManager)
├── components/         # Componentes de partículas
│   ├── particle.js
│   ├── position.js
│   └── render.js
├── systems/            # Sistemas de partículas
│   ├── render-system.js
│   ├── lod-system.js
│   └── culling-system.js
├── managers/           # Managers de partículas
│   ├── style-manager.js
│   └── viewport-manager.js
├── optimizations/      # Optimizaciones específicas
│   └── batch-manager.js
├── utils/              # Utilidades de partículas
│   └── sorting.js
└── api/                # Endpoints API de partículas
    ├── particles.js
    └── dimensions.js
```

**Archivos a mover:**

**Sistemas (migrar lógica):**
- `renderers/particle-renderer.js` → Lógica a `particles/systems/render-system.js`
- `renderers/base-renderer.js` → Lógica base para `particles/systems/`
- `renderers/optimizations/lod-manager.js` → `particles/systems/lod-system.js`
- `utils/culling.js` → `particles/systems/culling-system.js`

**Managers:**
- `managers/style-manager.js` → `particles/managers/style-manager.js`
- `managers/viewport-manager.js` → `particles/managers/viewport-manager.js`
- `managers/entity-manager.js` → Eliminar o migrar a `particles/manager.js`

**Utilidades:**
- `utils/sorting.js` → `particles/utils/sorting.js`

**Optimizaciones:**
- `renderers/optimizations/particle-limiter.js` → Lógica a `particles/optimizations/batch-manager.js`

**API:**
- `api/endpoints/particles.js` → `particles/api/particles.js`
- `api/endpoints/dimensions.js` → `particles/api/dimensions.js`

**Sistemas (mantener en managers/):**
- `systems/collision-detector.js` → `managers/collision-detector.js` (usado por ECS también)

**Archivos a actualizar:**
- Todos los imports que referencien estos archivos
- `app.js` y otros archivos que usen estos módulos
- READMEs correspondientes

## Estructura Final Esperada

```
src/
├── system.js      # Clase base System (compartida por ECS y Particles)
│
├── ecs/           # Sistema ECS para entidades DINÁMICAS
│   ├── manager.js
│   ├── components/    # Componentes para personajes, NPCs, monstruos
│   ├── systems/      # Sistemas ECS (extienden System de raíz)
│   └── ...
│
├── particles/     # Sistema de PARTÍCULAS del mundo
│   ├── manager.js    # ParticleManager (similar a ECSManager)
│   ├── components/   # Componentes de partículas
│   ├── systems/      # Sistemas de partículas (extienden System de raíz)
│   ├── managers/     # Managers de partículas (estilos, viewport)
│   ├── optimizations/ # Optimizaciones (batch processing)
│   ├── utils/        # Utilidades de partículas
│   └── api/          # API de partículas
│
├── managers/      # Managers y controladores del juego (input, camera, performance, collision)
├── config/        # Todas las configuraciones y constantes
├── renderers/models/  # Todo lo relacionado con modelos 3D (personajes, armas)
└── utils/         # Solo utilidades genéricas (colores, math, geometry)
```

## Beneficios

1. **Claridad**: 
   - `managers/` vs `ecs/systems/` - sin confusión
   - `ecs/` → Entidades dinámicas (personajes, NPCs, monstruos)
   - `particles/` → Partículas del mundo (suelo, árboles, rocas, estructuras)
   - `system.js` en raíz → Compartido por ambos sistemas
2. **Coherencia**: 
   - Todo lo de modelos 3D en `renderers/models/`
   - Todo lo de partículas en `particles/`
   - Separación clara entre entidades dinámicas y mundo estático
3. **Centralización**: 
   - Todas las constantes en `config/`
   - Todo el código de partículas en un solo módulo
4. **Mantenibilidad**: 
   - Más fácil encontrar y organizar código
   - Estructura modular similar a `ecs/` para `particles/`
   - Nomenclatura clara: no confunde con ECS
5. **Escalabilidad**: 
   - Fácil agregar nuevos sistemas de partículas
   - Separación clara entre entidades dinámicas (ECS) y mundo estático (particles)
   - Fácil agregar lógica a partículas (sistemas especializados)

## Pasos de Ejecución

### Fase 1: Reorganización Básica
1. Mover `ecs/system.js` a `src/system.js` (raíz)
2. Actualizar imports de `System` en todos los sistemas ECS
3. Actualizar export en `ecs/index.js`
4. Mover archivos de `systems/` a `managers/`
5. Actualizar imports de `systems/` → `managers/`
6. Mover `constants.js` a `config/`
7. Actualizar imports de `constants.js`
8. Mover y renombrar `debug/config.js` → `config/debug-config.js`
9. Actualizar imports de `debug/config.js` → `config/debug-config.js`
10. Mover `weapon-attachment.js` a `renderers/models/`
11. Actualizar imports de `weapon-attachment.js`

### Fase 2: Crear módulo Particles
12. Crear estructura de directorios `particles/`
13. Crear `ParticleManager` (similar a `ECSManager` pero optimizado)
14. Crear componentes base: `ParticleComponent`, `ParticlePositionComponent`, `ParticleRenderComponent`
15. Crear sistemas base que extiendan `System` de la raíz
16. Migrar lógica de `ParticleRenderer` a `particles/systems/render-system.js`
17. Migrar lógica de `LODManager` a `particles/systems/lod-system.js`
18. Migrar lógica de `FrustumCache` a `particles/systems/culling-system.js`
19. Mover managers de partículas a `particles/managers/`
20. Mover utilidades de partículas a `particles/utils/`
21. Mover API de partículas a `particles/api/`
22. Crear `particles/optimizations/batch-manager.js` (agrupación para instanced rendering)
23. Actualizar todos los imports relacionados con partículas
24. Actualizar READMEs (especialmente `ecs/README.md` con aclaraciones)
25. Verificar que todo funciona
