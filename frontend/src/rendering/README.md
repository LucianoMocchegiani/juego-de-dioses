# Rendering

Capa de todo lo 3D: escena, loaders, ECS, terreno, mundo, optimizaciones, geometrías, renderers y performance.

## Estructura

- **scene/** – Scene3D, cámara, controles, luces, renderer, helpers.
- **loaders/** – ModelLoader, ModelCache, loadModel3D, bones-utils (carga de assets 3D).
- **ecs/** – ECSManager, systems, components, factories, combos, conditions, states.
- **terrain/** – TerrainManager (recibe particlesApi y bloquesApi inyectados), systems, renderers, optimizations.
- **world/** – CameraController, CollisionDetector, CelestialSystem, CelestialRenderer.
- **optimizations/** – Object pool, frustum culling, LOD, batching, instancing, frame scheduler, spatial partition.
- **geometries/** – GeometryRegistry.
- **renderers/** – BaseRenderer.
- **performance/** – PerformanceManager.

## Uso

Importar desde rutas concretas (app.js usa `rendering/ecs/`, `rendering/terrain/`, `rendering/world/`). El index re-exporta scene, optimizations, geometries, renderers y performance.
