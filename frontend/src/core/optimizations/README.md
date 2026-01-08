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
