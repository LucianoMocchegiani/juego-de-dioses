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

## Recomendación: Opción 1 - ECS Híbrido

### Arquitectura Detallada

```
ecs/
├── manager.js
│   ├── createEntity()
│   ├── addComponent()
│   ├── query()                    # Optimizado con cache
│   └── registerSystem()
│
├── components/
│   ├── position.js                # Para todas las entidades
│   ├── physics.js                 # Solo para dinámicas
│   ├── render.js                  # Para todas las entidades
│   ├── terrain.js                 # NUEVO: Marca entidades de terreno
│   │   ├── isStatic: boolean     # true = estática, false = semi-dinámica
│   │   ├── particleId: number    # ID de partícula en BD
│   │   └── groupId: string       # Para agrupación en instanced rendering
│   └── ...
│
├── systems/
│   ├── input-system.js            # Solo entidades con InputComponent
│   ├── physics-system.js          # Solo entidades con PhysicsComponent
│   ├── render-system.js           # Entidades dinámicas (personajes)
│   ├── terrain-render-system.js   # NUEVO: Entidades estáticas/semi-dinámicas
│   │   ├── Agrupa por geometría+material
│   │   ├── Usa instanced rendering
│   │   ├── Aplica LOD y frustum culling
│   │   └── Solo actualiza si cambió (optimización)
│   └── ...
│
└── optimizations/
    ├── static-batch-manager.js    # NUEVO: Agrupa entidades estáticas
    └── instanced-render-cache.js  # NUEVO: Cache de instanced meshes
```

### Flujo de Ejecución

```
Frame Loop:
1. InputSystem → Procesa entidades con InputComponent (personajes)
2. PhysicsSystem → Procesa entidades con PhysicsComponent (dinámicas)
3. TerrainRenderSystem → Procesa entidades con TerrainComponent (estáticas)
   - Agrupa por geometría+material
   - Usa instanced rendering
   - Solo actualiza si cambió (cache)
4. RenderSystem → Procesa entidades dinámicas (personajes)
```

### Componentes para Terreno

```javascript
// TerrainComponent - Marca entidades de terreno
export class TerrainComponent {
    constructor(options = {}) {
        this.isStatic = options.isStatic ?? true;  // true = no cambia nunca
        this.particleId = options.particleId;      // ID en BD
        this.groupId = options.groupId;            // Para agrupación
        this.lastUpdate = Date.now();               // Para cache
    }
}

// PositionComponent - Ya existe, usado por todo
export class PositionComponent {
    constructor(x, y, z) {
        this.x = x;  // En celdas
        this.y = y;
        this.z = z;
    }
}

// RenderComponent - Ya existe, extendido para terreno
export class RenderComponent {
    constructor(options = {}) {
        this.mesh = options.mesh || null;
        this.geometryType = options.geometryType || 'box';
        this.material = options.material || null;
        this.style = options.style || null;  // Para terreno
    }
}
```

### Sistema de Renderizado de Terreno

```javascript
export class TerrainRenderSystem extends System {
    constructor() {
        super();
        this.requiredComponents = ['Terrain', 'Position', 'Render'];
        this.priority = 2.9; // Después de RenderSystem de personajes
        this.instancedMeshes = new Map();
        this.lastUpdate = 0;
    }
    
    update(deltaTime) {
        // Query: Entidades con TerrainComponent
        const terrainEntities = this.ecs.query('Terrain', 'Position', 'Render');
        
        // Agrupar por geometría+material (para instanced rendering)
        const groups = this.groupByGeometry(terrainEntities);
        
        // Crear/actualizar instanced meshes
        groups.forEach((group, key) => {
            if (this.needsUpdate(group)) {
                this.updateInstancedMesh(key, group);
            }
        });
    }
    
    groupByGeometry(entities) {
        // Agrupa entidades estáticas por geometría+material
        // Similar a ParticleRenderer actual
    }
    
    updateInstancedMesh(key, group) {
        // Usa instanced rendering (igual que ahora)
        // Pero con entidades ECS en lugar de partículas directas
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

## Migración Propuesta

### Fase 1: Preparación
1. Crear `TerrainComponent` en `ecs/components/`
2. Crear `TerrainRenderSystem` en `ecs/systems/`
3. Extender `ECSManager` con optimizaciones para estáticos
4. Crear módulo `ecs/optimizations/` para batch processing

### Fase 2: Migración de Terreno a ECS
1. Convertir partículas a entidades ECS con `TerrainComponent`
2. Migrar lógica de `ParticleRenderer` a `TerrainRenderSystem`
3. Mantener instanced rendering pero usando entidades ECS
4. Migrar optimizaciones (LOD, culling) a sistemas ECS

### Fase 3: Integración
1. Unificar `EntityManager` con `ECSManager`
2. Mover código de terreno a `ecs/`
3. Actualizar imports en todo el proyecto
4. Eliminar código duplicado

### Fase 4: Optimización
1. Optimizar queries para entidades estáticas
2. Implementar cache de instanced meshes
3. Ajustar prioridades de sistemas
4. Testing de performance

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

**Recomendación: Opción 1 - ECS Híbrido**

Esta arquitectura ofrece:
- ✅ Unificación arquitectónica (todo en ECS)
- ✅ Flexibilidad futura (fácil agregar lógica a partículas)
- ✅ Performance óptimo (mantiene instanced rendering)
- ✅ Escalabilidad (fácil agregar nuevos tipos de entidades)
- ✅ Mantenibilidad (código organizado y consistente)

La migración puede hacerse gradualmente, manteniendo compatibilidad y sin afectar performance actual. El sistema resultante será más flexible y preparado para futuras necesidades (árboles que crecen, objetos interactivos, etc.).
