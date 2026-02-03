# Optimizaciones de Rendimiento

Sistemas de optimización para el rendering (object pool, frustum culling, LOD, batching, instancing, frame scheduler, spatial partition). Ubicados en `rendering/` según la estructura elegida.

## Archivos

- **object-pool.js** – Pool de objetos reutilizables (Vector3, Quaternion, etc.).
- **frustum-culling.js** – Objetos visibles en el frustum de la cámara.
- **lod-manager.js** – Level of Detail por distancia a la cámara.
- **render-batcher.js** – Agrupación por material para reducir cambios de estado GPU.
- **instancing-manager.js** – InstancedMesh para entidades similares.
- **frame-scheduler.js** – Distribución de trabajo pesado entre frames.
- **spatial-partition.js** – Grid espacial (SpatialGrid) para queries eficientes.

Importar desde `rendering/optimizations/`:

```javascript
import { ObjectPool } from '../rendering/optimizations/object-pool.js';
import { FrustumCuller } from '../rendering/optimizations/frustum-culling.js';
import { LODManager } from '../rendering/optimizations/lod-manager.js';
import { RenderBatcher } from '../rendering/optimizations/render-batcher.js';
import { InstancingManager } from '../rendering/optimizations/instancing-manager.js';
import { FrameScheduler } from '../rendering/optimizations/frame-scheduler.js';
import { SpatialGrid } from '../rendering/optimizations/spatial-partition.js';
```
