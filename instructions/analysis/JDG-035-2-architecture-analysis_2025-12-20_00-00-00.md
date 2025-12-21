# Análisis de Arquitectura - Refactorización del Sistema de Terrenos (JDG-035-2)

## Situación Actual

### Frontend - Sistema de Terrenos (Disperso)

**Estructura actual dispersa:**
```
src/
├── app.js                    # Orquestación, carga de dimensiones/partículas
├── scene.js                  # Lógica de renderizado de partículas (temporal)
├── managers/
│   ├── viewport-manager.js   # Cálculo de viewports para terreno
│   ├── entity-manager.js     # Gestión de entidades de terreno (partículas)
│   ├── style-manager.js      # Cache de estilos de tipos de partículas
│   └── geometry-cache.js     # Cache de geometrías (usado por terreno)
├── renderers/
│   ├── particle-renderer.js  # Renderizador de partículas del terreno
│   └── optimizations/
│       ├── lod-manager.js    # Level of Detail para terreno
│       └── particle-limiter.js # Limitación de partículas del terreno
└── utils/
    ├── culling.js            # Frustum culling para partículas
    └── sorting.js            # Ordenamiento de partículas
```

**Problemas identificados:**

1. **Dispersión de responsabilidades**:
   - Lógica de terreno está repartida entre `managers/`, `renderers/`, `utils/` y raíz
   - `app.js` tiene lógica específica de terreno mezclada con orquestación general
   - `scene.js` mantiene código temporal de terreno que debería estar organizado

2. **Confusión con estructura ECS**:
   - `entity-manager.js` sugiere relación con ECS pero es solo para terreno/partículas
   - La estructura actual no diferencia claramente entre:
     - **Entidades dinámicas** (ECS): personajes, NPCs, monstruos (cambian cada frame, 60 FPS)
     - **Terreno/partículas modificables**: suelo, árboles, rocas (cambian cuando se modifican: romper, colocar, talar)

3. **Falta de cohesión**:
   - Componentes relacionados con terreno están en múltiples carpetas
   - No hay un módulo central que agrupe toda la funcionalidad de terreno
   - Difícil entender qué archivos pertenecen al sistema de terreno vs. otros sistemas

4. **Escalabilidad limitada**:
   - Agregar nuevas funcionalidades de terreno requiere tocar múltiples carpetas
   - No hay una interfaz clara para el sistema de terreno
   - Dificulta futuras extensiones (LOD avanzado, chunking, streaming)

### Frontend - Sistema ECS (Bien Estructurado)

**Estructura ECS actual (como referencia):**
```
ecs/
├── manager.js              # ECSManager - Núcleo del sistema
├── system.js               # Clase base System
├── components/              # Componentes (datos)
│   ├── position.js
│   ├── physics.js
│   ├── render.js
│   └── ...
├── systems/                 # Sistemas (lógica)
│   ├── input-system.js
│   ├── physics-system.js
│   ├── render-system.js
│   └── ...
├── factories/               # Factories para crear entidades
│   └── player-factory.js
├── conditions/              # Sistema de condiciones
└── states/                  # Sistema de estados
```

**Ventajas de la estructura ECS:**
- ✅ Todo relacionado con ECS está en una carpeta `ecs/`
- ✅ Separación clara: components (datos), systems (lógica), factories (creación)
- ✅ Fácil de entender y navegar
- ✅ Escalable: agregar nuevos componentes/sistemas es claro

## Necesidades Futuras

### Sistema de Terreno

1. **Organización similar a ECS**:
   - Agrupar toda la funcionalidad de terreno en un módulo dedicado
   - Separar responsabilidades: managers (gestión), renderers (visualización), utils (utilidades)
   - Crear una interfaz clara para el sistema de terreno

2. **Escalabilidad**:
   - Preparar para futuras mejoras: chunking, streaming, múltiples dimensiones activas
   - Facilidad para agregar nuevos tipos de renderizado de terreno
   - Soporte para diferentes estrategias de optimización

3. **Claridad arquitectónica**:
   - Diferenciar claramente entre:
     - `ecs/` - Entidades dinámicas (personajes, NPCs, monstruos) - cambios constantes cada frame
     - `terrain/` o `world/` - Terreno y partículas modificables - cambios cuando hay interacciones (romper, colocar, talar)
   - Documentación clara de qué sistema usar para qué tipo de entidad
   - El terreno necesita soporte para actualización dinámica cuando los personajes lo modifican

4. **Mantenibilidad**:
   - Código relacionado junto facilita mantenimiento
   - Cambios en terreno no afectan otros sistemas
   - Testing más fácil (todos los tests de terreno en un lugar)

## Arquitectura Propuesta

### Frontend - Sistema de Terreno Modular

```
src/
├── app.js                    # Orquestación (sin lógica específica de terreno)
├── ecs/                      # Sistema ECS (entidades dinámicas)
│   └── ...
├── terrain/                  # ⭐ NUEVO: Sistema de Terreno (partículas modificables)
│   ├── manager.js            # TerrainManager - Núcleo del sistema
│   ├── components/           # Componentes/Conceptos del terreno
│   │   ├── viewport.js       # Gestión de viewports
│   │   ├── style.js          # Gestión de estilos/cache
│   │   └── geometry.js       # Gestión de geometrías/cache
│   ├── renderers/            # Renderizadores especializados
│   │   ├── base-terrain-renderer.js  # Clase base
│   │   ├── particle-renderer.js      # Renderizador de partículas (movido)
│   │   └── future-tree-renderer.js   # Futuro: renderizador de árboles
│   ├── systems/              # Sistemas de procesamiento
│   │   ├── viewport-system.js        # Cálculo y gestión de viewports
│   │   ├── style-system.js           # Cache y procesamiento de estilos
│   │   └── optimization-system.js    # LOD, culling, limiting
│   ├── optimizations/        # Optimizaciones específicas
│   │   ├── lod-manager.js            # Level of Detail
│   │   ├── particle-limiter.js       # Limitación de partículas
│   │   └── culling-manager.js        # Frustum culling
│   ├── utils/                # Utilidades específicas de terreno
│   │   ├── sorting.js                # Ordenamiento de partículas
│   │   └── geometry-utils.js         # Utilidades de geometría
│   ├── api/                  # Clientes API específicos de terreno
│   │   ├── dimensions-client.js      # Cliente para dimensiones
│   │   └── particles-client.js       # Cliente para partículas
│   └── README.md             # Documentación del sistema
└── ...
```

### Comparación de Estructuras

**ECS (Entidades Dinámicas)**:
```
ecs/
├── manager.js           # ECSManager
├── components/          # Position, Physics, Render, Animation...
├── systems/             # Input, Physics, Render, Animation...
└── factories/           # PlayerFactory, MonsterFactory...
```

**Terrain (Partículas Modificables)**:
```
terrain/
├── manager.js           # TerrainManager
├── components/          # Viewport, Style, Geometry...
├── systems/             # ViewportSystem, StyleSystem, OptimizationSystem, UpdateSystem...
└── renderers/           # ParticleRenderer, TreeRenderer...
```

**Similitudes estructurales:**
- Ambos tienen un `manager.js` central
- Ambos separan datos (components) de lógica (systems)
- Ambos tienen módulos especializados (factories vs renderers)
- Ambos pueden cambiar dinámicamente

**Diferencias conceptuales:**
- ECS: Entidades que cambian constantemente (cada frame, 60 FPS): posición, velocidad, animación, combate
- Terrain: Partículas que cambian cuando hay interacciones: personajes rompen partículas, talan árboles, colocan bloques
  - Carga inicial del terreno
  - Actualizaciones dinámicas cuando hay modificaciones (event-driven o por polling)
  - Necesita sincronización con backend cuando se modifican partículas

## Patrones de Diseño a Usar

### 1. Módulo/Namespace Pattern
- **Descripción**: Agrupar funcionalidad relacionada en un módulo dedicado
- **Aplicación**: Crear módulo `terrain/` que agrupe toda la funcionalidad de terreno
- **Beneficios**: Claridad, organización, fácil navegación

### 2. Manager Pattern
- **Descripción**: Clase central que orquesta y gestiona el sistema
- **Aplicación**: `TerrainManager` similar a `ECSManager`
- **Beneficios**: Punto único de entrada, fácil de usar desde `app.js`

### 3. System Pattern (inspirado en ECS)
- **Descripción**: Separar lógica en sistemas especializados
- **Aplicación**: `ViewportSystem`, `StyleSystem`, `OptimizationSystem`
- **Beneficios**: Separación de responsabilidades, fácil testear

### 4. Renderer Pattern (ya existente)
- **Descripción**: Abstraer diferentes formas de renderizar
- **Aplicación**: `BaseTerrainRenderer`, `ParticleRenderer`
- **Beneficios**: Extensibilidad, fácil agregar nuevos tipos de renderizado

### 5. Component Pattern (inspirado en ECS)
- **Descripción**: Agrupar datos relacionados
- **Aplicación**: `Viewport`, `Style`, `Geometry` como módulos de datos
- **Beneficios**: Organización de datos, fácil acceso y cache

## Beneficios de la Nueva Arquitectura

1. **Claridad estructural**:
   - Todo relacionado con terreno está en `terrain/`
   - Fácil distinguir entre entidades dinámicas (ECS) y terreno (Terrain)
   - Estructura similar a ECS facilita comprensión

2. **Mantenibilidad mejorada**:
   - Cambios en terreno solo afectan módulo `terrain/`
   - Código relacionado junto facilita debugging
   - Testing más simple (todos los tests en `terrain/`)

3. **Escalabilidad**:
   - Fácil agregar nuevos sistemas (chunking, streaming)
   - Fácil agregar nuevos renderizadores (árboles, plantas)
   - Interfaz clara para futuras extensiones

4. **Separación de responsabilidades**:
   - `app.js` solo orquesta, no contiene lógica específica de terreno
   - Cada sistema tiene responsabilidades claras
   - Fácil reutilizar componentes entre sistemas

5. **Consistencia con ECS**:
   - Estructura familiar para desarrolladores
   - Mismos patrones de diseño facilitan aprendizaje
   - Documentación clara de qué sistema usar para qué

## Migración Propuesta

### Fase 1: Crear Estructura Base
- Crear carpeta `terrain/` y subcarpetas (`components/`, `systems/`, `renderers/`, etc.)
- Crear `terrain/manager.js` (TerrainManager) como punto central
- Crear `terrain/README.md` con documentación

### Fase 2: Migrar Componentes de Datos
- Mover `managers/viewport-manager.js` → `terrain/components/viewport.js`
- Mover `managers/style-manager.js` → `terrain/components/style.js`
- Mover `managers/geometry-cache.js` → `terrain/components/geometry.js`
- Refactorizar para que sean módulos de datos puros (no managers)

### Fase 3: Migrar Sistemas de Procesamiento
- Crear `terrain/systems/viewport-system.js` (lógica de cálculo de viewports)
- Crear `terrain/systems/style-system.js` (lógica de cache y procesamiento de estilos)
- Crear `terrain/systems/optimization-system.js` (orquesta LOD, culling, limiting)
- Crear `terrain/systems/update-system.js` (sistema para actualizar partículas dinámicamente: romper, colocar, modificar)

### Fase 4: Migrar Renderizadores
- Mover `renderers/particle-renderer.js` → `terrain/renderers/particle-renderer.js`
- Mover `renderers/optimizations/` → `terrain/optimizations/`
- Crear `terrain/renderers/base-terrain-renderer.js` si es necesario

### Fase 5: Migrar Utilidades
- Mover `utils/culling.js` → `terrain/utils/culling.js` (o `terrain/optimizations/culling-manager.js`)
- Mover `utils/sorting.js` → `terrain/utils/sorting.js`

### Fase 6: Migrar Clientes API
- Mover/crear clientes API específicos de terreno en `terrain/api/`
- O mantener en `api/endpoints/` pero crear wrappers en `terrain/api/`

### Fase 7: Actualizar app.js
- Refactorizar `app.js` para usar `TerrainManager` en lugar de múltiples managers
- Eliminar lógica específica de terreno de `app.js`
- Simplificar orquestación

### Fase 8: Limpieza
- Eliminar archivos antiguos después de migración completa
- Actualizar todos los imports
- Actualizar documentación

## Consideraciones Técnicas

### Frontend

1. **Compatibilidad durante migración**:
   - Mantener exports temporales en ubicaciones antiguas durante migración
   - Migración incremental para no romper funcionalidad
   - Tests para asegurar que nada se rompe

2. **Performance**:
   - No debe afectar performance actual
   - Misma lógica, solo reorganizada
   - Posibles mejoras futuras por mejor organización

3. **Imports**:
   - Actualizar todos los imports que referencian archivos movidos
   - Usar imports relativos desde `terrain/`
   - Verificar que no hay dependencias circulares

4. **Testing**:
   - Mover tests existentes a `terrain/` si existen
   - Crear tests para `TerrainManager`
   - Asegurar cobertura de funcionalidad crítica
   - Tests para actualización dinámica de partículas (romper, colocar)

5. **Actualización Dinámica**:
   - El sistema debe soportar actualización de partículas cuando se modifican
   - Re-renderizado eficiente (solo partículas afectadas, no todo el terreno)
   - Sincronización con backend cuando se modifican partículas
   - Gestión de instanced meshes cuando se agregan/eliminan partículas

### Estructura de Archivos

1. **Nomenclatura**:
   - Usar `terrain/` (más descriptivo que `world/`)
   - Mantener convenciones existentes (kebab-case para archivos)
   - README.md para documentar el módulo

2. **Separación ECS vs Terrain**:
   - Documentar claramente:
     - ECS → Entidades dinámicas (personajes, NPCs, monstruos) - cambios constantes cada frame
     - Terrain → Partículas modificables (suelo, árboles, rocas) - cambios cuando hay interacciones
   - README en cada módulo con ejemplos de uso

3. **Dependencias**:
   - `terrain/` puede usar `ecs/` si es necesario (ej: colisiones con terreno)
   - `ecs/` puede notificar a `terrain/` cuando se modifican partículas (eventos)
   - `ecs/` NO debe depender directamente de `terrain/` (separación de responsabilidades)
   - `app.js` orquesta ambos sistemas y maneja comunicación entre ellos
   - Comunicación ECS ↔ Terrain: eventos o callbacks para notificar cambios de partículas

## Ejemplo de Uso Futuro

```javascript
// En app.js
import { TerrainManager } from './terrain/manager.js';
import { ECSManager } from './ecs/index.js';

export class App {
    constructor(container) {
        // Inicializar ECS para entidades dinámicas
        this.ecs = new ECSManager();
        
        // Inicializar Terrain para partículas modificables
        this.terrain = new TerrainManager(this.scene.scene, this.particlesApi);
        
        // Cargar terreno
        await this.loadTerrain();
    }
    
    async loadTerrain() {
        // El TerrainManager maneja toda la complejidad internamente
        const dimension = await this.dimensionsApi.getDimensionByName(DEMO_DIMENSION_NAME);
        await this.terrain.loadDimension(dimension);
    }
}
```

```javascript
// En terrain/manager.js
export class TerrainManager {
    constructor(scene, apiClient) {
        this.scene = scene;
        this.apiClient = apiClient;
        this.viewportSystem = new ViewportSystem();
        this.styleSystem = new StyleSystem();
        this.optimizationSystem = new OptimizationSystem();
        this.updateSystem = new UpdateSystem(apiClient); // Sistema de actualización dinámica
        this.renderer = new ParticleRenderer();
        this.currentMeshes = new Map();
        this.currentParticles = new Map(); // Cache de partículas actuales
    }
    
    async loadDimension(dimension) {
        // 1. Calcular viewport
        const viewport = this.viewportSystem.calculateViewport(dimension);
        
        // 2. Cargar partículas y estilos
        const [particles, styles] = await Promise.all([
            this.particlesApi.getParticles(dimension.id, viewport),
            this.particlesApi.getParticleTypes(dimension.id, viewport)
        ]);
        
        // 3. Cachear estilos y partículas
        this.styleSystem.cacheStyles(styles);
        this.currentParticles = new Map(particles.map(p => [p.id, p]));
        
        // 4. Renderizar
        const meshes = this.renderer.render(particles, styles, dimension.cellSize);
        this.currentMeshes = meshes;
        
        // 5. Aplicar optimizaciones
        this.optimizationSystem.applyLOD(meshes);
        this.optimizationSystem.applyCulling(meshes);
    }
    
    // Actualizar partícula cuando un personaje la rompe/coloca
    async updateParticle(particleId, newData) {
        // 1. Actualizar en backend (si aplica)
        await this.updateSystem.updateParticleInBackend(particleId, newData);
        
        // 2. Actualizar cache local
        if (newData === null) {
            // Partícula eliminada (rota)
            this.currentParticles.delete(particleId);
        } else {
            // Partícula modificada/colocada
            this.currentParticles.set(particleId, newData);
        }
        
        // 3. Re-renderizar solo la partícula afectada (optimización)
        this.updateSystem.updateParticleRender(particleId, newData, this.currentMeshes, this.renderer);
    }
    
    // Método para cuando un personaje rompe múltiples partículas (ej: talar árbol)
    async updateParticles(particleIds, newDataArray) {
        // Similar a updateParticle pero en batch para eficiencia
        await this.updateSystem.updateParticlesBatch(particleIds, newDataArray, this.currentMeshes, this.renderer);
    }
}
```

## Conclusión

La refactorización del sistema de terreno en un módulo dedicado `terrain/` mejorará significativamente la organización, claridad y mantenibilidad del código. La estructura similar a ECS facilitará la comprensión y el desarrollo futuro, mientras que la separación clara entre entidades dinámicas (ECS) y terreno modificable (Terrain) eliminará la confusión actual.

El sistema de terreno necesita soportar cambios dinámicos cuando los personajes interactúan con él (romper partículas, talar árboles, colocar bloques), requiriendo:
- Sistema de actualización eficiente para modificar partículas
- Re-renderizado optimizado (solo partículas afectadas)
- Sincronización con backend cuando se modifican partículas
- Comunicación clara entre ECS y Terrain para notificar cambios

La migración debe ser incremental para mantener la funcionalidad existente, y el resultado será un código más organizado, escalable y fácil de mantener, con soporte completo para terreno dinámico y modificable.
