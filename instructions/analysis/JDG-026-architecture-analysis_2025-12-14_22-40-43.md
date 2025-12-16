# Análisis de Arquitectura - Integración de Terreno en ECS (JDG-026)

## Situación Actual

### Frontend - Sistema ECS

**Estructura actual:**
```
ecs/
├── manager.js              # ECSManager - Núcleo del sistema
├── system.js               # Clase base System
├── components/              # Componentes (datos puros)
│   ├── position.js
│   ├── physics.js
│   ├── render.js
│   ├── input.js
│   ├── animation.js
│   └── ...
├── systems/                 # Sistemas (lógica pura)
│   ├── input-system.js
│   ├── physics-system.js
│   ├── render-system.js
│   ├── animation-state-system.js
│   └── ...
└── factories/
    └── player-factory.js
```

**Uso actual:**
- **Personajes**: 1-100 entidades dinámicas
- **Sistemas activos**: Input, Physics, Animation, Combat, Combo
- **Actualización**: Cada frame (60 FPS)
- **Optimización**: Queries eficientes, cache de componentes

### Frontend - Sistema de Terreno

**Estructura actual:**
```
renderers/
├── particle-renderer.js    # Renderizador de partículas
├── optimizations/
│   ├── lod-manager.js      # Level of Detail
│   └── particle-limiter.js # Limitación de partículas (150,000 max)
managers/
├── entity-manager.js       # Gestor de entidades de terreno
├── style-manager.js        # Cache de estilos
└── viewport-manager.js     # Gestión de viewport (160x160 celdas max)
utils/
├── culling.js              # Frustum culling
└── sorting.js             # Ordenamiento de partículas
```

**Características actuales:**
- **Partículas**: Hasta 150,000 partículas visibles
- **Viewport**: 160x160 celdas (40m x 40m con celda de 0.25m)
- **Renderizado**: Instanced rendering (muy eficiente)
- **Optimizaciones**: LOD, frustum culling, particle limiting
- **Naturaleza**: Mayormente estático (árboles, rocas, suelo)

**Problemas identificados:**

1. **Arquitectura dispersa**: Código de terreno en múltiples directorios (`renderers/`, `managers/`, `utils/`, `api/`)
2. **Separación artificial**: Terreno y personajes usan sistemas completamente diferentes
3. **Falta de flexibilidad**: Difícil agregar lógica a partículas individuales (ej: árboles que crecen, rocas que se mueven)
4. **Duplicación de conceptos**: `EntityManager` para terreno vs `ECSManager` para personajes
5. **Inconsistencia**: Mismo concepto (entidades del mundo) pero implementaciones diferentes

## Necesidades Futuras

### Categorías de Entidades/Funcionalidades

1. **Entidades Dinámicas** (estado actual - ECS):
   - Personajes (jugadores, NPCs)
   - Objetos interactivos (cajas, puertas)
   - Proyectiles
   - Requisitos: Física, animación, input, combate

2. **Entidades Semi-Dinámicas** (futuro):
   - Árboles que crecen
   - Plantas que se mueven con viento
   - Rocas que pueden caer
   - Requisitos: Cambios periódicos, física opcional, renderizado optimizado

3. **Entidades Estáticas** (estado actual - Terreno):
   - Suelo, rocas fijas, estructuras
   - Requisitos: Solo renderizado, sin lógica

### Requisitos de Escalabilidad

1. **Fácil agregar nuevos tipos de entidades**: Tanto dinámicas como estáticas
2. **Reutilización de código**: Sistemas comunes para diferentes tipos de entidades
3. **Separación de responsabilidades**: Renderizado vs lógica vs física
4. **Extensibilidad**: Agregar nuevos sistemas sin modificar código existente
5. **Mantenibilidad**: Código organizado y fácil de entender
6. **Performance**: Mantener eficiencia actual (instanced rendering para estáticos)

## Arquitectura Propuesta

### Opción 1: ECS Híbrido (RECOMENDADA)

**Concepto**: Usar ECS para todo, pero con optimizaciones especiales para entidades estáticas.

**Estructura:**
```
ecs/
├── manager.js              # ECSManager extendido
├── components/
│   ├── position.js
│   ├── physics.js
│   ├── render.js
│   ├── terrain.js          # NUEVO: Componente para partículas de terreno
│   └── ...
├── systems/
│   ├── input-system.js
│   ├── physics-system.js
│   ├── render-system.js
│   ├── terrain-render-system.js  # NUEVO: Sistema optimizado para terreno
│   └── ...
└── optimizations/           # NUEVO: Optimizaciones específicas
    ├── static-entity-batch.js  # Agrupa entidades estáticas
    └── instanced-renderer.js   # Renderizado instanciado
```

**Ventajas:**
- ✅ Arquitectura unificada
- ✅ Fácil agregar lógica a partículas (ej: árboles que crecen)
- ✅ Mismo patrón para todo
- ✅ Mantiene performance (instanced rendering para estáticos)

**Desventajas:**
- ⚠️ Requiere optimizaciones especiales para estáticos
- ⚠️ Más complejo que la opción actual

### Opción 2: Todo en ECS (Sin optimizaciones especiales)

**Concepto**: Cada partícula es una entidad ECS completa.

**Ventajas:**
- ✅ Máxima flexibilidad
- ✅ Arquitectura completamente unificada

**Desventajas:**
- ❌ Performance: Procesar 150,000 entidades cada frame es costoso
- ❌ Overhead: Cada partícula tiene overhead de ECS
- ❌ No aprovecha instanced rendering eficientemente

### Opción 3: Terreno Separado (Actual)

**Concepto**: Mantener terreno y ECS completamente separados.

**Ventajas:**
- ✅ Performance óptimo para terreno estático
- ✅ Separación clara de responsabilidades
- ✅ Código especializado y optimizado

**Desventajas:**
- ❌ Duplicación de conceptos
- ❌ Difícil agregar lógica a partículas
- ❌ Arquitectura inconsistente

### Opción 4: Sistema de Partículas (NUEVA - Recomendada)

**Concepto**: Crear un sistema similar a ECS pero específico para partículas del mundo, separado del ECS de entidades dinámicas.

**Razón del nombre**: 
- ECS está pensado para **entidades dinámicas** (personajes, NPCs, monstruos, objetos interactivos)
- El sistema de partículas maneja el **mundo estático/semi-estático** (suelo, árboles, rocas, estructuras)
- Usar "ECS" para partículas sería confuso y no refleja su propósito

**Estructura:**
```
ecs/                    # ECS para entidades dinámicas (personajes, NPCs, monstruos)
├── manager.js
├── components/
├── systems/
└── ...

particles/              # NUEVO: Sistema de Partículas del Mundo
├── manager.js          # ParticleManager (similar a ECSManager pero optimizado)
├── components/
│   ├── particle.js     # Componente de partícula (ID, tipo, estado)
│   ├── position.js    # Posición en celdas (x, y, z)
│   ├── render.js       # Renderizado (geometría, material, estilo)
│   └── state.js        # Estado (estática, semi-dinámica, dinámica)
├── systems/
│   ├── render-system.js    # Renderizado optimizado con instanced rendering
│   ├── lod-system.js       # Sistema de Level of Detail
│   ├── culling-system.js   # Sistema de frustum culling
│   └── growth-system.js    # FUTURO: Sistema de crecimiento (árboles)
└── optimizations/
    └── batch-manager.js    # Agrupación para instanced rendering
```

**Alternativa de nombre**: `world/` (más genérico, incluye partículas y estructuras)

**Ventajas:**
- ✅ Arquitectura similar a ECS (componentes, sistemas) pero específica para partículas
- ✅ Separación clara: ECS para entidades dinámicas, Particles para mundo estático
- ✅ Optimizaciones específicas para partículas (instanced rendering, LOD, culling)
- ✅ Fácil agregar lógica a partículas (sistemas especializados)
- ✅ No afecta performance del ECS de entidades dinámicas
- ✅ Puede tener diferentes ciclos de actualización (partículas menos frecuentes)
- ✅ Nombre claro: `particles/` refleja que son partículas del mundo, no entidades dinámicas

**Desventajas:**
- ⚠️ Duplicación de código base (similar a ECSManager pero optimizado)
- ⚠️ Dos sistemas que mantener (pero con propósitos claros y diferentes)

**Implementación:**
```javascript
// ECS para entidades dinámicas (personajes, NPCs, monstruos, objetos interactivos)
const entityECS = new ECSManager();
entityECS.registerSystem(new PhysicsSystem());
entityECS.registerSystem(new AnimationSystem());
entityECS.registerSystem(new InputSystem());

// Sistema de Partículas para el mundo (suelo, árboles, rocas, estructuras)
const particleSystem = new ParticleManager();  // Similar a ECSManager pero optimizado
particleSystem.registerSystem(new ParticleRenderSystem());
particleSystem.registerSystem(new LODSystem());
particleSystem.registerSystem(new CullingSystem());

// En el loop
function animate() {
    // Entidades dinámicas: cada frame (60 FPS)
    entityECS.update(deltaTime);
    
    // Partículas: menos frecuente (cada 3-5 frames o solo si cambió)
    if (particlesNeedUpdate) {
        particleSystem.update(deltaTime);
    }
}
```

**Nomenclatura clara:**
- `ecs/` → Entidades dinámicas (personajes, NPCs, monstruos)
- `particles/` → Partículas del mundo (suelo, árboles, rocas, estructuras)

## Comparación de Opciones

| Aspecto | Opción 1: ECS Híbrido | Opción 2: Todo ECS | Opción 3: Separado | Opción 4: ECS Separado |
|---------|----------------------|-------------------|-------------------|----------------------|
| **Unificación** | ✅ Alta | ✅ Total | ❌ Baja | ⚠️ Media |
| **Performance** | ✅ Óptima | ❌ Costosa | ✅ Óptima | ✅ Óptima |
| **Flexibilidad** | ✅ Alta | ✅ Máxima | ❌ Baja | ✅ Alta |
| **Mantenibilidad** | ✅ Buena | ⚠️ Media | ✅ Buena | ⚠️ Media |
| **Complejidad** | ⚠️ Media | ❌ Alta | ✅ Baja | ⚠️ Media |
| **Escalabilidad** | ✅ Alta | ✅ Alta | ❌ Baja | ✅ Alta |

## Recomendación: Opción 4 - Sistema de Partículas (Particles)

**Razón**: Combina los beneficios de ECS (flexibilidad, sistemas) con separación clara de responsabilidades y optimizaciones específicas.

### Arquitectura Detallada

```
ecs/                    # ECS para entidades dinámicas
├── manager.js          # ECSManager
├── components/
│   ├── position.js     # Para personajes, NPCs, monstruos
│   ├── physics.js      # Física dinámica
│   ├── render.js       # Renderizado de modelos 3D
│   ├── input.js        # Input del jugador
│   ├── animation.js    # Animaciones
│   └── ...
├── systems/
│   ├── input-system.js
│   ├── physics-system.js
│   ├── render-system.js
│   ├── animation-system.js
│   └── ...
└── ...

particles/              # NUEVO: Sistema de Partículas del Mundo
├── manager.js          # ParticleManager (similar a ECSManager)
│   ├── createParticle()
│   ├── addComponent()
│   ├── query()
│   └── registerSystem()
│
├── components/
│   ├── particle.js     # Componente de partícula
│   │   ├── particleId: number    # ID en BD
│   │   ├── isStatic: boolean     # true = estática
│   │   └── groupId: string       # Para agrupación
│   ├── position.js     # Posición en celdas (x, y, z)
│   ├── render.js       # Renderizado (geometría, material, estilo)
│   └── growth.js       # FUTURO: Para árboles que crecen
│
├── systems/
│   ├── render-system.js    # Renderizado optimizado (instanced rendering)
│   ├── lod-system.js       # Sistema de Level of Detail
│   ├── culling-system.js   # Sistema de frustum culling
│   └── growth-system.js    # FUTURO: Sistema de crecimiento
│
└── optimizations/
    ├── batch-manager.js    # Agrupa por geometría+material
    └── instanced-cache.js # Cache de instanced meshes
```

### Flujo de Ejecución

```
Frame Loop (60 FPS):
// ECS de Entidades Dinámicas (cada frame)
1. entityECS.InputSystem → Procesa entidades con InputComponent
2. entityECS.PhysicsSystem → Procesa entidades con PhysicsComponent
3. entityECS.AnimationSystem → Procesa animaciones
4. entityECS.RenderSystem → Procesa entidades dinámicas (personajes, NPCs)

// Sistema de Partículas (menos frecuente: cada 3-5 frames o solo si cambió)
5. particleSystem.RenderSystem → Procesa partículas
   - Agrupa por geometría+material
   - Usa instanced rendering
   - Solo actualiza si cambió (cache)
6. particleSystem.LODSystem → Aplica Level of Detail
7. particleSystem.CullingSystem → Aplica frustum culling
```

### Componentes para Terreno ECS

```javascript
// ParticleComponent - Componente de partícula de terreno
export class ParticleComponent {
    constructor(options = {}) {
        this.particleId = options.particleId;      // ID en BD
        this.isStatic = options.isStatic ?? true;  // true = no cambia nunca
        this.groupId = options.groupId;            // Para agrupación en instanced rendering
        this.lastUpdate = Date.now();               // Para cache
    }
}

// PositionComponent - Similar a ECS pero para terreno
export class TerrainPositionComponent {
    constructor(x, y, z) {
        this.x = x;  // En celdas
        this.y = y;
        this.z = z;
    }
}

// TerrainRenderComponent - Renderizado específico de terreno
export class TerrainRenderComponent {
    constructor(options = {}) {
        this.geometryType = options.geometryType || 'box';
        this.geometryParams = options.geometryParams || {};
        this.style = options.style || null;        // Estilo de partícula
        this.material = options.material || null;  // Material Three.js
        this.lodLevel = 'high';                    // Nivel de detalle
    }
}

// GrowthComponent - FUTURO: Para entidades que crecen
export class GrowthComponent {
    constructor(options = {}) {
        this.growthRate = options.growthRate || 0.1;
        this.maxSize = options.maxSize || 10;
        this.currentSize = options.currentSize || 1;
    }
}
```

### Sistema de Partículas

```javascript
// ParticleManager - Similar a ECSManager pero optimizado para partículas
export class ParticleManager {
    constructor() {
        this.particles = new Map();  // Map<particleId, Set<ComponentType>>
        this.components = new Map(); // Map<ComponentType, Map<particleId, ComponentData>>
        this.systems = [];
        this.instancedMeshes = new Map();
        this.updateFrequency = 3;   // Actualizar cada 3 frames (optimización)
        this.frameCount = 0;
    }
    
    createParticle(particleId) {
        // Crear partícula con ID de BD
        this.particles.set(particleId, new Set());
        return particleId;
    }
    
    addComponent(particleId, componentType, componentData) {
        // Similar a ECSManager pero optimizado para partículas estáticas
    }
    
    query(...componentTypes) {
        // Query optimizado para partículas (cache más agresivo)
    }
    
    update(deltaTime) {
        // Solo actualizar si es necesario (optimización para estáticos)
        this.frameCount++;
        if (this.frameCount % this.updateFrequency === 0 || this.hasChanges()) {
            this.systems.forEach(system => system.update(deltaTime));
            this.frameCount = 0;
        }
    }
    
    hasChanges() {
        // Verificar si hay cambios en partículas (dirty flags)
    }
}

// ParticleRenderSystem - Sistema de renderizado optimizado
export class ParticleRenderSystem {
    constructor() {
        this.requiredComponents = ['Particle', 'Position', 'Render'];
        this.priority = 1;
        this.instancedMeshes = new Map();
        this.batchManager = new BatchManager();
    }
    
    update(deltaTime) {
        // Query: Partículas con componentes necesarios
        const particles = this.particleManager.query('Particle', 'Position', 'Render');
        
        // Filtrar solo estáticas (las dinámicas se procesan diferente)
        const staticParticles = particles.filter(id => {
            const particle = this.particleManager.getComponent(id, 'Particle');
            return particle.isStatic;
        });
        
        // Agrupar por geometría+material (para instanced rendering)
        const groups = this.batchManager.groupByGeometry(staticParticles);
        
        // Crear/actualizar instanced meshes
        groups.forEach((group, key) => {
            if (this.needsUpdate(group)) {
                this.updateInstancedMesh(key, group);
            }
        });
    }
    
    updateInstancedMesh(key, group) {
        // Usa instanced rendering (igual que ParticleRenderer actual)
    }
}
```

## Patrones de Diseño a Usar

### 1. ECS (Entity Component System)
- **Descripción**: Separación de datos (componentes) y lógica (sistemas)
- **Aplicación**: Base de toda la arquitectura
- **Beneficios**: Flexibilidad, reutilización, escalabilidad

### 2. Strategy Pattern
- **Descripción**: Diferentes estrategias de renderizado según tipo de entidad
- **Aplicación**: `RenderSystem` para dinámicas, `TerrainRenderSystem` para estáticas
- **Beneficios**: Fácil agregar nuevos tipos de renderizado

### 3. Batch Processing
- **Descripción**: Agrupar entidades similares para procesamiento eficiente
- **Aplicación**: Agrupar entidades estáticas por geometría+material
- **Beneficios**: Aprovecha instanced rendering, reduce draw calls

### 4. Cache Pattern
- **Descripción**: Cachear resultados de renderizado para entidades estáticas
- **Aplicación**: Solo actualizar instanced meshes si cambió
- **Beneficios**: Performance óptimo para estáticos

## Beneficios de la Nueva Arquitectura

1. **Unificación**: Todo usa ECS, arquitectura consistente
2. **Flexibilidad**: Fácil agregar lógica a partículas (árboles que crecen, etc.)
3. **Performance**: Mantiene eficiencia actual (instanced rendering)
4. **Escalabilidad**: Fácil agregar nuevos tipos de entidades
5. **Mantenibilidad**: Código organizado en un solo lugar
6. **Extensibilidad**: Sistemas pueden operar sobre cualquier tipo de entidad

## Migración Propuesta (Opción 4: Sistema de Partículas)

### Fase 1: Crear Base del Sistema de Partículas
1. Crear directorio `particles/`
2. Crear `ParticleManager` (reutilizar lógica de `ECSManager` pero optimizado)
3. Crear componentes base: `ParticleComponent`, `ParticlePositionComponent`, `ParticleRenderComponent`
4. Crear sistema base: `ParticleRenderSystem`

### Fase 2: Migrar Renderizado
1. Migrar lógica de `ParticleRenderer` a `ParticleRenderSystem`
2. Convertir partículas a entidades en `ParticleManager`
3. Mantener instanced rendering pero usando sistema de partículas
4. Implementar `BatchManager` para agrupación

### Fase 3: Migrar Optimizaciones
1. Crear `LODSystem` en `particles/systems/`
2. Crear `CullingSystem` en `particles/systems/`
3. Migrar lógica de `LODManager` y `FrustumCache` a sistemas de partículas
4. Implementar cache de instanced meshes

### Fase 4: Integración y Optimización
1. Integrar `ParticleManager` en `app.js`
2. Configurar ciclo de actualización (menos frecuente que entidades dinámicas)
3. Implementar dirty flags para actualizaciones incrementales
4. Testing de performance y ajustes
5. Eliminar código antiguo (`ParticleRenderer`, `EntityManager`, etc.)

## Consideraciones Técnicas

### Frontend

1. **Performance**:
   - Mantener instanced rendering para estáticos
   - Cache de queries para entidades estáticas
   - Solo actualizar si cambió (dirty flag)

2. **Renderizado**:
   - `TerrainRenderSystem` agrupa por geometría+material
   - Usa `THREE.InstancedMesh` igual que ahora
   - Aplica LOD y frustum culling

3. **Extensibilidad**:
   - Fácil agregar `PhysicsComponent` a partículas para hacerlas dinámicas
   - Sistemas pueden operar sobre cualquier entidad
   - Nuevos componentes no requieren cambios en sistemas existentes

### Compatibilidad

1. **Backward Compatibility**:
   - Mantener API actual durante migración
   - Migración gradual, no todo de una vez
   - Testing exhaustivo en cada fase

2. **Base de Datos**:
   - No requiere cambios (partículas ya tienen IDs)
   - `TerrainComponent` puede mapear a `particle_id`

## Ejemplo de Uso Futuro

```javascript
// Crear árbol que crece (semi-dinámico)
const treeId = ecs.createEntity();
ecs.addComponent(treeId, 'Position', new PositionComponent(10, 5, 0));
ecs.addComponent(treeId, 'Terrain', new TerrainComponent({
    isStatic: false,  // Puede cambiar
    particleId: 12345,
    groupId: 'trees'
}));
ecs.addComponent(treeId, 'Render', new RenderComponent({
    geometryType: 'cylinder',
    style: treeStyle
}));

// Agregar lógica de crecimiento (futuro)
ecs.addComponent(treeId, 'Growth', new GrowthComponent({
    growthRate: 0.1,
    maxSize: 10
}));

// Sistema de crecimiento (futuro)
class GrowthSystem extends System {
    update(deltaTime) {
        const entities = this.ecs.query('Growth', 'Render');
        entities.forEach(id => {
            const growth = this.ecs.getComponent(id, 'Growth');
            const render = this.ecs.getComponent(id, 'Render');
            // Lógica de crecimiento
            render.mesh.scale.y += growth.growthRate * deltaTime;
        });
    }
}
```

## Conclusión

**Recomendación: Opción 4 - Sistema de Partículas (`particles/`)**

Esta arquitectura ofrece:
- ✅ **Arquitectura similar a ECS**: Beneficios de componentes y sistemas, pero específica para partículas
- ✅ **Separación clara**: 
  - `ecs/` → Entidades dinámicas (personajes, NPCs, monstruos, objetos interactivos)
  - `particles/` → Partículas del mundo (suelo, árboles, rocas, estructuras)
- ✅ **Nomenclatura clara**: No confunde con ECS, refleja su propósito real
- ✅ **Performance óptimo**: Optimizaciones específicas para partículas (instanced rendering, LOD, culling)
- ✅ **Flexibilidad**: Fácil agregar lógica a partículas (sistemas especializados)
- ✅ **Escalabilidad**: Fácil agregar nuevos sistemas de partículas
- ✅ **Mantenibilidad**: Código organizado, cada sistema con su propósito claro
- ✅ **Optimización independiente**: Partículas pueden actualizarse menos frecuentemente

**Por qué `particles/` y no `terrain-ecs/`:**
- ✅ Refleja que son **partículas del mundo**, no "terreno" (puede haber partículas en aire, agua, etc.)
- ✅ No confunde con ECS (que es para entidades dinámicas)
- ✅ Consistente con nomenclatura del código (`ParticleRenderer`, `particles` API)
- ✅ Más específico y claro sobre su propósito

**Implementación:**
- `ParticleManager` puede reutilizar lógica de `ECSManager` pero optimizado para partículas
- Componentes específicos para partículas (`ParticleComponent`, `TerrainRenderComponent`)
- Sistemas especializados (renderizado, LOD, culling)
- Migración gradual desde sistema actual

La migración puede hacerse gradualmente, manteniendo compatibilidad y sin afectar performance actual. El sistema resultante será más flexible y preparado para futuras necesidades (árboles que crecen, objetos interactivos, etc.), con la ventaja de tener sistemas especializados para cada dominio: **ECS para entidades dinámicas, Particles para el mundo estático/semi-estático**.
