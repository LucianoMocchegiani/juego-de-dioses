# Sistema de Terreno

Módulo dedicado para gestionar terreno y partículas modificables. Similar en estructura al sistema ECS, pero enfocado en partículas estáticas del terreno que pueden modificarse cuando los personajes interactúan con ellas.

## Estructura

```
terrain/
├── manager.js            # TerrainManager - Núcleo del sistema
├── components/           # Componentes/Conceptos del terreno (datos)
├── systems/              # Sistemas de procesamiento (lógica)
├── renderers/            # Renderizadores especializados
├── optimizations/        # Optimizaciones específicas
├── utils/                # Utilidades específicas de terreno
└── api/                  # Clientes API específicos de terreno
```

## Diferencias con ECS

- **ECS**: Entidades dinámicas (personajes, NPCs, monstruos) que cambian constantemente cada frame (60 FPS)
- **Terrain**: Partículas modificables (suelo, árboles, rocas) que cambian cuando hay interacciones (romper, colocar, talar)

## Componentes Migrados

### Components (Datos)
- `viewport.js` - Gestión de viewports (migrado de `managers/viewport-manager.js`)
- `style.js` - Gestión de estilos y cache (migrado de `managers/style-manager.js`)
- `geometry.js` - Cache de geometrías LOD (migrado de `managers/geometry-cache.js`)

### Systems (Lógica)
- `viewport-system.js` - Sistema de cálculo de viewports
- `style-system.js` - Sistema de cache y procesamiento de estilos
- `optimization-system.js` - Sistema que orquesta LOD, culling y limiting
- `update-system.js` - Sistema de actualización dinámica de partículas

### Renderers
- `particle-renderer.js` - Renderizador de partículas (migrado de `renderers/particle-renderer.js`)

### Optimizations
- `lod-manager.js` - Level of Detail (migrado de `renderers/optimizations/lod-manager.js`)
- `particle-limiter.js` - Limitación de partículas (migrado de `renderers/optimizations/particle-limiter.js`)
- `culling-manager.js` - Wrapper para frustum culling

### Utils
- `culling.js` - Utilidades de frustum culling (migrado de `utils/culling.js`)
- `sorting.js` - Utilidades de ordenamiento (migrado de `utils/sorting.js`)

### API
- `dimensions-client.js` - Cliente wrapper para DimensionsApi
- `particles-client.js` - Cliente wrapper para ParticlesApi

## Uso Básico

```javascript
import { TerrainManager } from './terrain/manager.js';

// En app.js
const terrain = new TerrainManager(
    scene.scene,
    particlesApi,
    dimensionsApi,
    geometryRegistry
);

// Cargar dimensión
const result = await terrain.loadDimension(dimension);

// Actualizar partícula cuando un personaje la rompe
await terrain.updateParticle(particleId, null); // null = eliminar

// Colocar nueva partícula
await terrain.updateParticle(particleId, newParticleData);

// Actualizar múltiples partículas (batch)
await terrain.updateParticles([id1, id2], [data1, null]); // data1 = actualizar, null = eliminar
```

## Estado de la Migración

✅ Fase 1: Estructura base creada
✅ Fase 2: Componentes migrados
✅ Fase 3: Sistemas creados
✅ Fase 4: Renderizadores migrados
✅ Fase 5: Utilidades migradas
✅ Fase 6: Wrappers API creados
✅ Fase 7: app.js actualizado para usar TerrainManager
⏳ Fase 8: Limpieza de archivos antiguos (pendiente - mantener por compatibilidad temporal)
