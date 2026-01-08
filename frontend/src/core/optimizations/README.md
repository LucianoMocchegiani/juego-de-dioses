# Optimizaciones de Rendimiento

Este directorio contiene sistemas de optimización para mejorar el rendimiento del juego.

## Object Pooling (`object-pool.js`)

Sistema reutilizable de object pooling para reducir garbage collection. Especialmente útil para objetos Three.js que se crean frecuentemente (Vector3, Quaternion, Euler, Matrix4).

### Uso Básico

```javascript
import { ObjectPool } from './core/optimizations/object-pool.js';
import * as THREE from 'three';

// Crear pool
const vectorPool = new ObjectPool(
    () => new THREE.Vector3(),
    (v) => v.set(0, 0, 0),
    20  // Pool inicial de 20 objetos
);

// Obtener objeto del pool
const vec = vectorPool.acquire();

// Usar objeto
vec.set(1, 2, 3);

// Devolver al pool
vectorPool.release(vec);
```

### Beneficios

- **Reduce garbage collection:** Los objetos se reutilizan en lugar de crearse y destruirse
- **Mejora FPS:** Menos pausas por GC resultan en frames más consistentes
- **Estadísticas:** Método `getStats()` para monitorear efectividad

## Frustum Culling (`frustum-culling.js`)

Sistema que determina qué objetos están visibles dentro del frustum de la cámara para evitar renderizar objetos fuera de vista.

### Uso Básico

```javascript
import { FrustumCuller } from './core/optimizations/frustum-culling.js';

// Crear frustum culler (requiere cámara)
const frustumCuller = new FrustumCuller(camera);

// Actualizar cada frame antes de renderizar
frustumCuller.update();

// Verificar si un objeto está visible
if (frustumCuller.isVisible(mesh)) {
    // Renderizar objeto
}

// Filtrar array de objetos visibles
const visibleObjects = frustumCuller.filterVisible(allObjects);
```

### Beneficios

- **Reduce draw calls:** Solo renderiza objetos visibles
- **Mejora FPS:** Especialmente útil con muchas entidades
- **Estadísticas:** Método `getStats()` para monitorear efectividad

## LOD Manager (`lod-manager.js`)

Sistema de Level of Detail que reduce calidad de entidades lejanas para mejorar rendimiento.

### Uso Básico

```javascript
import { LODManager } from './core/optimizations/lod-manager.js';

// Crear LOD manager (requiere cámara)
const lodManager = new LODManager(camera);

// Actualizar LOD para una entidad
lodManager.updateLOD(entityId, renderComponent, animationComponent);
```

### Beneficios

- **Reduce complejidad:** Entidades lejanas usan menor calidad
- **Mejora FPS:** Menos polígonos y animaciones simplificadas
- **Configurable:** Distancias near/far ajustables

## Render Batcher (`render-batcher.js`)

Sistema para agrupar actualizaciones de renderizado por material, reduciendo cambios de estado de GPU.

### Uso Básico

```javascript
import { RenderBatcher } from './core/optimizations/render-batcher.js';

// Crear render batcher
const batcher = new RenderBatcher();

// Agregar meshes al batch
batcher.add(mesh1);
batcher.add(mesh2);

// Obtener batches agrupados por material
const batches = batcher.getBatches();

// Limpiar al final del frame
batcher.clear();
```

### Beneficios

- **Reduce cambios de estado:** Agrupa por material
- **Mejora FPS:** Menos cambios de estado de GPU
- **Estadísticas:** Método `getStats()` para monitorear efectividad

## Instancing Manager (`instancing-manager.js`)

Sistema para agrupar entidades similares en InstancedMesh, reduciendo draw calls significativamente.

### Uso Básico

```javascript
import { InstancingManager } from './core/optimizations/instancing-manager.js';

// Crear instancing manager
const instancingManager = new InstancingManager(scene);

// Agregar entidad a grupo de instancias
const instanceIndex = instancingManager.addEntity(entityId, meshKey, geometry, material);

// Actualizar transformación de instancia
const matrix = new THREE.Matrix4();
matrix.compose(position, quaternion, scale);
instancingManager.updateInstanceTransform(meshKey, entityId, matrix);

// Remover entidad
instancingManager.removeEntity(entityId, meshKey);
```

### Beneficios

- **Reduce draw calls:** Agrupa entidades similares (50-70% reducción)
- **Mejora FPS:** +20-40 FPS con muchas entidades similares
- **Escalable:** Soporta hasta 1000 instancias por grupo

## Frame Scheduler (`frame-scheduler.js`)

Sistema para distribuir trabajo pesado a lo largo de múltiples frames, evitando sobrecarga en un solo frame.

### Uso Básico

```javascript
import { FrameScheduler } from './core/optimizations/frame-scheduler.js';

// Crear frame scheduler
const scheduler = new FrameScheduler();

// Registrar entidad para actualización cada N frames
scheduler.register(entityId, 2); // Actualizar cada 2 frames

// Obtener entidades que deben actualizarse este frame
const entitiesToUpdate = scheduler.getEntitiesToUpdate();

// Desregistrar entidad
scheduler.unregister(entityId);
```

### Beneficios

- **Distribuye carga:** Evita picos de CPU en un frame
- **Mejora FPS:** +5-10 FPS con muchas entidades
- **Configurable:** Frecuencia de actualización por entidad

## Spatial Partition (`spatial-partition.js`)

Sistema de grid espacial para organizar entidades y optimizar queries espaciales (colisiones, frustum culling, etc.).

### Uso Básico

```javascript
import { SpatialGrid } from './core/optimizations/spatial-partition.js';

// Crear spatial grid
const grid = new SpatialGrid(cellSize);

// Insertar/actualizar entidad
grid.insert(entityId, x, y, z);

// Query en rango
const entitiesInRange = grid.queryRange(x, y, z, radius);

// Query en bounding box
const entitiesInBox = grid.queryBox(minX, minY, minZ, maxX, maxY, maxZ);

// Remover entidad
grid.remove(entityId);
```

### Beneficios

- **Queries eficientes:** Reduce complejidad de O(n) a O(1) en mejor caso
- **Optimiza colisiones:** Solo verifica entidades cercanas
- **Mejora FPS:** +3-7 FPS en sistemas con muchas entidades
