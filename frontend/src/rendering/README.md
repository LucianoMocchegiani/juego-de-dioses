# Rendering

Arquitectura: Hexagonal (ports/adapters) combinada con ECS para entidades dinámicas. El código de rendering depende de contratos (`frontend/src/ports/contracts.js`) y no de implementaciones concretas.

Capa de todo lo 3D: escena, loaders, ECS, terreno, mundo, optimizaciones, geometrías, renderers y performance.

## Estructura

- **scene/** – Scene3D, cámara, controles, luces, renderer, helpers.
- **loaders/** – ModelLoader, ModelCache, loadModel3D, bones-utils (carga de assets 3D).
- **ecs/** – ECSManager, systems, components, factories, combos, conditions, states.
- **terrain/** – TerrainManager (recibe particlesApi y bloquesApi inyectados), systems, renderers, optimizations.
- **world/** – CameraController, CollisionDetector, CelestialSystem, CelestialRenderer.
- **optimizations/** – Object pool, frustum culling, LOD, batching, instancing, frame scheduler, spatial partition.
- **optimizations/** – Object pool, frustum culling, LOD, batching, instancing, frame scheduler, spatial partition.
  - **particles-pipeline/** – Helpers modulares para el pipeline de partículas: `culling.js`, `lod.js`, `limiter.js`, `grouper.js`, `instancer.js`. Estos módulos están diseñados para ser usados por `terrain/renderers/particle-renderer.js` que actúa como orquestador.
- **geometries/** – GeometryRegistry.
- **renderers/** – BaseRenderer.
- **performance/** – PerformanceManager.

## Uso

Importar desde rutas concretas (app.js usa `rendering/ecs/`, `rendering/terrain/`, `rendering/world/`). El index re-exporta scene, optimizations, geometries, renderers y performance.

## Nota sobre el renderizado de partículas

El renderizado de partículas ahora sigue un enfoque en pipeline: `particle-renderer.js` actúa como orquestador y delega etapas (culling → LOD → limiting → grouping → instancing) a los helpers en `rendering/optimizations/particles-pipeline/`. Esto mejora testabilidad y facilita futuras optimizaciones sin cambiar la API pública del renderer.
