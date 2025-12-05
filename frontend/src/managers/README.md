# Módulo Managers

Este módulo contiene gestores de alto nivel que coordinan múltiples sistemas.

## Estructura

```
managers/
├── viewport-manager.js      # Gestión de viewport y carga de datos
├── style-manager.js         # Gestión de cache de estilos
├── entity-manager.js        # Gestión de entidades y renderizadores
├── geometry-cache.js        # Cache de geometrías LOD
└── performance-manager.js   # Gestión de métricas de rendimiento
```

## Componentes

### ViewportManager (`viewport-manager.js`)
Gestiona el cálculo y validación del viewport.

**Responsabilidades:**
- Calcular viewport dinámicamente basado en límites del backend
- Priorizar altura para árboles
- Validar que no exceda límites del backend
- Ajustar viewport si es necesario

### StyleManager (`style-manager.js`)
Gestiona el cache de estilos de tipos de partículas.

**Responsabilidades:**
- Cachear estilos de tipos de partículas
- Obtener estilos desde cache
- Proporcionar estilos por defecto si no están en cache
- Invalidar cache cuando sea necesario (futuro)

### EntityManager (`entity-manager.js`)
Gestiona entidades y selección de renderizadores.

**Responsabilidades:**
- Seleccionar renderizador apropiado según tipo de entidad
- Coordinar renderizado de múltiples tipos de entidades
- Gestionar renderizadores especializados

### GeometryCache (`geometry-cache.js`)
Cache de geometrías LOD para reutilización.

**Responsabilidades:**
- Cachear geometrías con diferentes niveles LOD
- Reutilizar geometrías existentes en lugar de recrearlas
- Disposar geometrías al limpiar cache
- Proporcionar estadísticas del cache

### PerformanceManager (`performance-manager.js`)
Gestor de métricas de rendimiento.

**Responsabilidades:**
- Medir FPS en tiempo real
- Contar draw calls aproximado
- Notificar métricas a suscriptores
- Proporcionar métricas para debugging y optimización

## Uso

```javascript
import { ViewportManager } from './viewport-manager.js';
import { StyleManager } from './style-manager.js';
import { EntityManager } from './entity-manager.js';
import { GeometryCache } from './geometry-cache.js';
import { LODManager } from '../renderers/optimizations/lod-manager.js';

// ViewportManager
const viewportManager = new ViewportManager(dimension, maxCells);
const viewport = viewportManager.calculateViewport();

// StyleManager
const styleManager = new StyleManager();
styleManager.cacheStyles(tiposEstilos);
const estilo = styleManager.getStyle('madera');

// EntityManager
const entityManager = new EntityManager(rendererRegistry);
const renderer = entityManager.selectRenderer(particle, tipoEstilos);

// GeometryCache
const lodManager = new LODManager(geometryRegistry);
const geometryCache = new GeometryCache(geometryRegistry, lodManager);
const geometry = geometryCache.getGeometry('sphere', { radius: 1.0, segments: 16 }, 'medium', cellSize);

// PerformanceManager
const performanceManager = new PerformanceManager();
performanceManager.subscribe((metrics) => {
    console.log(`FPS: ${metrics.fps}, Draw Calls: ${metrics.drawCalls}`);
});
performanceManager.startProfiling();
// En cada frame:
performanceManager.measureFPS();
performanceManager.countDrawCalls(instancedMeshes);
```

## Referencias

- Ver `frontend/src/README.md` para información general

