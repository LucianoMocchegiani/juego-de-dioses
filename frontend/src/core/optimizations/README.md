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

## Próximas Optimizaciones

- **Frustum Culling:** Filtrar objetos no visibles antes de renderizar
- **LOD Manager:** Reducir calidad de objetos lejanos
- **Render Batcher:** Agrupar actualizaciones de renderizado
