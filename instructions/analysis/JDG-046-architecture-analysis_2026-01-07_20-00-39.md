# Análisis de Arquitectura - Optimización de FPS en Frontend (JDG-046)

## Situación Actual

### Frontend - Estructura de Renderizado

**Estructura actual:**
```
frontend/src/
├── app.js                    # Loop principal de animación
├── ecs/
│   ├── manager.js           # Orquesta todos los sistemas ECS
│   └── systems/
│       ├── render-system.js        # Actualiza posiciones de meshes cada frame
│       ├── collision-system.js     # Detección de colisiones
│       ├── animation-mixer-system.js # Mezcla de animaciones
│       ├── physics-system.js        # Física básica
│       └── weapon-equip-system.js   # Equipamiento de armas
├── core/
│   ├── renderer.js          # Wrapper de Three.js WebGLRenderer
│   └── scene.js             # Gestión de escena Three.js
└── terrain/
    ├── renderers/particle-renderer.js
    └── optimizations/particle-limiter.js
```

**Problemas identificados:**

1. **Ordenamiento de sistemas en cada frame (manager.js:241)**
   - El ECS Manager ordena todos los sistemas por prioridad en cada frame: `const sortedSystems = [...this.systems].sort((a, b) => a.priority - b.priority);`
   - Esto crea un nuevo array y ejecuta sort() en cada frame (60 veces por segundo)
   - **Impacto:** O(n log n) innecesario cada frame para un array que raramente cambia

2. **Actualización de color del cielo cada frame (renderer.js:46-107)**
   - `updateSkyColor()` se llama cada frame y realiza cálculos complejos de color RGB
   - Conversiones de color (hex ↔ RGB), cálculos de brillo, interpolaciones
   - **Impacto:** Operaciones de color innecesarias cuando el estado celestial no cambia significativamente

3. **Sincronización celestial síncrona en frame loop (app.js:428-434)**
   - Se verifica `currentTimeSeconds - this.lastCelestialSync >= this.celestialSyncInterval` cada frame
   - La sincronización en sí es async pero el check es síncrono
   - **Impacto:** Mínimo pero acumulativo

4. **Creación de objetos THREE cada frame (weapon-equip-system.js:86-89)**
   - Se crean nuevos `Vector3`, `Quaternion`, `Euler`, `Vector3` para cálculos de posición de armas
   - Estos objetos se crean en cada frame para cada entidad con arma
   - **Impacto:** Garbage collection frecuente, presión de memoria

5. **Render System itera sobre todas las entidades cada frame (render-system.js:28)**
   - No hay frustum culling visible antes de actualizar posiciones
   - Todas las entidades se actualizan incluso si están fuera del view frustum
   - **Impacto:** Operaciones innecesarias en objetos no visibles

6. **Falta de object pooling**
   - Objetos temporales (Vectores, Quaterniones, etc.) se crean y destruyen constantemente
   - No hay reutilización de objetos temporales
   - **Impacto:** Garbage collection frecuente causa stutters

7. **Debug metrics se miden cada frame cuando está habilitado (manager.js:236-258)**
   - `startFrame()`, `startSystem()`, `endSystem()`, `endFrame()` se ejecutan cada frame
   - Aunque son operaciones rápidas, se acumulan
   - **Impacto:** Overhead constante cuando debug está habilitado

8. **Sistema de colisiones consulta cache/partículas cada frame (collision-system.js:90-120)**
   - Verifica `loadedOccupiedCells` y `entityCollisionCache` para cada entidad cada frame
   - Aunque usa cache, el acceso a Map y Set para cada entidad cada frame es costoso
   - **Impacto:** Accesos a estructuras de datos en hot path

9. **Falta de instancing para entidades similares**
   - Cada entidad renderizada tiene su propio mesh
   - No se usa `InstancedMesh` de Three.js para entidades del mismo tipo (ej: partículas del mismo estilo)
   - **Impacto:** Draw calls excesivos

10. **No hay LOD (Level of Detail) para entidades**
    - Todas las entidades se renderizan con el mismo nivel de detalle
    - Entidades lejanas usan la misma complejidad que cercanas
    - **Impacto:** Overhead de GPU innecesario

11. **AnimationMixer se actualiza para todas las entidades cada frame**
    - `mixer.update(deltaTime)` se llama para cada entidad con animaciones
    - Incluso si la animación no ha cambiado o la entidad no es visible
    - **Impacto:** Cálculos de animación innecesarios

12. **Falta de batching en operaciones de renderizado**
    - Cada sistema actualiza meshes individualmente
    - No hay agrupación de actualizaciones similares
    - **Impacto:** Falta de optimización por caché de CPU

### Base de Datos

No aplica directamente, pero:
- Las partículas se cargan desde el backend, pero no se analiza la eficiencia de carga

## Necesidades Futuras

### Optimización de Rendimiento

1. **60 FPS constante:** El juego debe mantener 60 FPS incluso con muchas entidades
2. **Escalabilidad:** El sistema debe funcionar bien con 100+ entidades simultáneas
3. **Reducción de GC:** Minimizar garbage collection para evitar stutters
4. **Optimización de GPU:** Reducir draw calls y mejorar uso de instancing
5. **Frustum Culling:** Solo renderizar lo que está visible
6. **LOD System:** Reducir complejidad de objetos lejanos

### Requisitos de Escalabilidad

1. **Fácil agregar optimizaciones:** Estructura que permita agregar optimizaciones sin romper código existente
2. **Reutilización de objetos:** Sistema de pooling para objetos temporales
3. **Separación de responsabilidades:** Optimizaciones como sistemas separados
4. **Extensibilidad:** Fácil agregar nuevas técnicas de optimización (occlusion culling, etc.)
5. **Mantenibilidad:** Código de optimización bien documentado y testeable

## Arquitectura Propuesta

### Frontend - Optimizaciones de Rendimiento

```
frontend/src/
├── core/
│   ├── optimizations/
│   │   ├── object-pool.js          # Pool de objetos reutilizables
│   │   ├── frustum-culling.js      # Sistema de frustum culling
│   │   ├── lod-manager.js          # Gestión de Level of Detail
│   │   └── render-batcher.js       # Agrupación de actualizaciones
│   └── performance/
│       ├── frame-scheduler.js      # Planificación de trabajo por frame
│       └── gc-optimizer.js         # Minimización de allocations
├── ecs/
│   └── systems/
│       ├── render-system.js        # Optimizado con frustum culling
│       └── optimized-render-system.js # Versión optimizada
```

### Sistema de Object Pooling

```javascript
// Ejemplo de uso
class ObjectPool {
    constructor(createFn, resetFn, initialSize = 10) {
        this.pool = [];
        this.createFn = createFn;
        this.resetFn = resetFn;
        // Pre-crear objetos iniciales
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn());
        }
    }
    
    acquire() {
        return this.pool.pop() || this.createFn();
    }
    
    release(obj) {
        this.resetFn(obj);
        this.pool.push(obj);
    }
}

// Uso en weapon-equip-system
const vectorPool = new ObjectPool(
    () => new THREE.Vector3(),
    (v) => v.set(0, 0, 0),
    20
);
```

### Sistema de Frustum Culling

```javascript
class FrustumCuller {
    constructor(camera, scene) {
        this.camera = camera;
        this.frustum = new THREE.Frustum();
        this.matrix = new THREE.Matrix4();
    }
    
    update() {
        this.matrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.matrix);
    }
    
    isVisible(mesh) {
        return this.frustum.intersectsObject(mesh);
    }
}
```

### Sistema de Render Batching

```javascript
class RenderBatcher {
    constructor() {
        this.batches = new Map(); // material -> meshes[]
    }
    
    add(mesh) {
        const materialKey = mesh.material.uuid || 'default';
        if (!this.batches.has(materialKey)) {
            this.batches.set(materialKey, []);
        }
        this.batches.get(materialKey).push(mesh);
    }
    
    render(renderer, scene, camera) {
        // Renderizar por batch (material) para mejor caché
        for (const [materialKey, meshes] of this.batches) {
            for (const mesh of meshes) {
                renderer.render(mesh, camera);
            }
        }
        this.batches.clear();
    }
}
```

## Patrones de Diseño a Usar

### 1. Object Pool Pattern
- **Descripción:** Reutilizar objetos en lugar de crearlos y destruirlos
- **Cómo se aplica:** Pool de Vectores, Quaterniones, Eulers para cálculos temporales
- **Beneficios:** Reduce garbage collection, mejora rendimiento constante

### 2. Spatial Partitioning
- **Descripción:** Dividir espacio en regiones para queries más eficientes
- **Cómo se aplica:** Octree o grid para frustum culling y detección de colisiones
- **Beneficios:** Reduce complejidad de búsquedas espaciales

### 3. Dirty Flag Pattern
- **Descripción:** Marcar objetos como "sucios" y solo actualizar cuando es necesario
- **Cómo se aplica:** Solo actualizar color del cielo cuando cambia el estado celestial
- **Beneficios:** Evita cálculos innecesarios

### 4. Component System Optimization
- **Descripción:** Optimizar queries y actualizaciones del ECS
- **Cómo se aplica:** Cache de queries, ordenar sistemas solo cuando cambian
- **Beneficios:** Reduce overhead del sistema ECS

### 5. Frame Scheduling
- **Descripción:** Distribuir trabajo pesado a lo largo de múltiples frames
- **Cómo se aplica:** Actualizar entidades lejanas cada 2-3 frames en lugar de cada frame
- **Beneficios:** Reduce carga por frame, mantiene 60 FPS

## Beneficios de la Nueva Arquitectura

1. **Mejora de FPS:** Reducción estimada de 30-50% en tiempo de frame con las optimizaciones implementadas
2. **Reducción de GC:** Object pooling reduce garbage collection en 70-90%
3. **Menos draw calls:** Instancing y batching reducen draw calls en 50-70%
4. **Mejor escalabilidad:** Sistema puede manejar 3-5x más entidades manteniendo 60 FPS
5. **Código más mantenible:** Optimizaciones encapsuladas en sistemas reutilizables
6. **Extensibilidad:** Fácil agregar nuevas optimizaciones sin modificar código existente

## Migración Propuesta

### Fase 1: Optimizaciones de Bajo Riesgo (Impacto Inmediato)

- Paso 1: Implementar object pooling para Vectores/Quaterniones/Eulers
  - Crear `object-pool.js`
  - Refactorizar `weapon-equip-system.js` para usar pools
  - **Impacto esperado:** Reducción de GC, +5-10 FPS

- Paso 2: Cachear ordenamiento de sistemas ECS
  - Solo reordenar cuando se agregan/remueven sistemas
  - Guardar `sortedSystems` en manager
  - **Impacto esperado:** +1-2 FPS

- Paso 3: Dirty flag para color del cielo
  - Solo actualizar cuando cambia estado celestial significativamente
  - Usar threshold para cambios mínimos
  - **Impacto esperado:** +1-2 FPS

### Fase 2: Optimizaciones de Medio Riesgo (Mejoras Significativas)

- Paso 4: Implementar frustum culling
  - Crear `frustum-culling.js`
  - Integrar en `render-system.js`
  - Solo actualizar entidades visibles
  - **Impacto esperado:** +10-20 FPS con muchas entidades

- Paso 5: LOD System básico
  - Crear `lod-manager.js`
  - Reducir calidad de animaciones/meshes para entidades lejanas
  - **Impacto esperado:** +5-15 FPS

- Paso 6: Render batching
  - Agrupar meshes por material
  - Reducir cambios de estado de GPU
  - **Impacto esperado:** +3-8 FPS

### Fase 3: Optimizaciones Avanzadas (Máximo Rendimiento)

- Paso 7: Instancing para entidades similares
  - Identificar entidades con mismo mesh/material
  - Convertir a `InstancedMesh`
  - **Impacto esperado:** +20-40 FPS con muchas entidades del mismo tipo

- Paso 8: Frame scheduling para entidades lejanas
  - Actualizar entidades lejanas cada 2-3 frames
  - Reducir carga por frame
  - **Impacto esperado:** +5-10 FPS

- Paso 9: Optimizar sistema de colisiones
  - Spatial partitioning (octree/grid)
  - Reducir queries innecesarias
  - **Impacto esperado:** +3-7 FPS

## Consideraciones Técnicas

### Frontend

1. **Compatibilidad:** Object pooling y frustum culling son compatibles con Three.js estándar
2. **Renderizado:** Las optimizaciones no cambian la API de renderizado, solo la eficiencia
3. **Extensibilidad:** Cada optimización es un sistema independiente, fácil de habilitar/deshabilitar
4. **Testing:** Las optimizaciones deben ser testeables y medibles

### Performance

1. **Medición:** Usar `PerformanceManager` existente para medir mejoras
2. **Profiling:** Usar Chrome DevTools Performance para identificar bottlenecks
3. **Incremental:** Implementar optimizaciones una a la vez y medir impacto
4. **Trade-offs:** Algunas optimizaciones pueden afectar precisión (ej: LOD reduce calidad)

### Memory

1. **Object Pooling:** Pre-asignar memoria puede aumentar uso inicial pero reduce allocations
2. **Cache:** Spatial partitioning requiere memoria adicional para estructuras de datos
3. **Balance:** Encontrar balance entre memoria y rendimiento

## Ejemplo de Uso Futuro

```javascript
// En app.js, después de las optimizaciones:
constructor() {
    // ... código existente ...
    
    // Inicializar optimizaciones
    this.frustumCuller = new FrustumCuller(this.scene.camera.camera, this.scene.scene);
    this.objectPool = {
        vector3: new ObjectPool(() => new THREE.Vector3(), v => v.set(0, 0, 0), 50),
        quaternion: new ObjectPool(() => new THREE.Quaternion(), q => q.set(0, 0, 0, 1), 20),
        euler: new ObjectPool(() => new THREE.Euler(), e => e.set(0, 0, 0), 20)
    };
    this.lodManager = new LODManager(this.scene.camera.camera);
    this.renderBatcher = new RenderBatcher();
    
    // Configurar ECS con optimizaciones
    this.ecs.setOptimizations({
        frustumCulling: true,
        lod: true,
        objectPool: this.objectPool
    });
}

startAnimation() {
    const animate = () => {
        requestAnimationFrame(animate);
        
        const currentTime = performance.now();
        const deltaTime = this.lastTime ? (currentTime - this.lastTime) / 1000 : 0;
        this.lastTime = currentTime;
        
        // Actualizar frustum culling (una vez por frame)
        this.frustumCuller.update();
        
        // Actualizar LOD
        this.lodManager.update();
        
        // Actualizar sistemas ECS (ahora con frustum culling)
        if (this.ecs) {
            this.ecs.update(deltaTime);
        }
        
        // Renderizar con batching
        this.renderBatcher.render(
            this.scene.renderer.renderer,
            this.scene.scene,
            this.scene.camera.camera
        );
        
        // Medir FPS
        this.performanceManager.measureFPS();
    };
    
    animate();
}
```

## Métricas de Éxito

### KPIs a Medir

1. **FPS promedio:** Objetivo: 60 FPS constante (actual: variable, 30-60 FPS)
2. **Frame time:** Objetivo: < 16.67ms por frame (actual: variable, 16-33ms)
3. **GC frequency:** Objetivo: < 1 GC por segundo (actual: variable)
4. **Draw calls:** Objetivo: < 100 draw calls por frame (actual: desconocido, probablemente > 200)
5. **Memory allocations:** Objetivo: < 1MB allocado por segundo (actual: desconocido)

### Herramientas de Medición

1. **Chrome DevTools Performance:** Para profiling detallado
2. **PerformanceManager existente:** Para métricas en tiempo real
3. **DebugMetrics (F4):** Para ver métricas durante gameplay
4. **Memory Profiler:** Para detectar leaks y allocations

## Conclusión

El frontend tiene varias oportunidades de optimización que pueden mejorar significativamente el FPS sin cambiar la funcionalidad del juego. Las optimizaciones propuestas se pueden implementar de forma incremental, empezando por las de bajo riesgo (object pooling, cache de ordenamiento) y progresando hacia optimizaciones más avanzadas (frustum culling, instancing, LOD).

El impacto esperado combinado de todas las optimizaciones es de **30-50% de mejora en FPS**, permitiendo que el juego mantenga 60 FPS constantes incluso con muchas entidades activas. Además, la reducción de garbage collection mejorará la suavidad del juego eliminando stutters.

La arquitectura propuesta es modular y extensible, permitiendo agregar nuevas optimizaciones en el futuro sin romper código existente. Cada optimización es un sistema independiente que se puede habilitar/deshabilitar según necesidades.
