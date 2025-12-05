# Módulo Renderers

Este módulo contiene el sistema de renderizadores especializados por tipo de entidad, con soporte para formas geométricas desde la base de datos.

## Estructura

```
renderers/
├── base-renderer.js          # Renderizador base abstracto
├── particle-renderer.js       # Renderizador genérico de partículas
├── tree-renderer.js          # Renderizador especializado para árboles (futuro)
├── geometries/               # Registry de geometrías
│   └── registry.js          # Registry de geometrías (box, sphere, cylinder, etc.)
├── optimizations/            # Optimizaciones de renderizado
│   ├── lod-manager.js       # Gestión de Level of Detail
│   └── __init__.js          # Exportaciones del módulo
└── registry.js              # Registry de renderizadores
```

## Componentes

### BaseRenderer (`base-renderer.js`)
Clase base abstracta para todos los renderizadores.

**Responsabilidades:**
- Definir interfaz común para renderizadores
- Proporcionar método `getGeometry()` para resolver geometrías
- Implementar lógica común de resolución de formas (prioridad: Agrupación > Tipo > Default)

### ParticleRenderer (`particle-renderer.js`)
Renderizador genérico de partículas con soporte de formas geométricas.

**Responsabilidades:**
- Renderizar partículas usando instanced rendering
- Agrupar partículas por geometría+material para optimización
- Cachear geometrías para mejor performance
- Aplicar formas geométricas desde BD
- Aplicar frustum culling para optimizar rendimiento (filtra partículas fuera del campo de visión)

**Optimizaciones:**
- **Frustum Culling**: Filtra partículas fuera del frustum de la cámara antes de renderizar
- **Cache de Frustum**: Cachea resultados cuando la cámara no se mueve
- **Level of Detail (LOD)**: Reduce detalle de partículas lejanas según distancia a la cámara
- **Cache de Geometrías LOD**: Cachea geometrías con diferentes niveles LOD para reutilización
- **Material Pooling**: Reutiliza materiales en lugar de crearlos cada vez
- **Instancias Optimizadas**: Hasta 100k instancias por mesh para reducir draw calls
- Configurable mediante `enableFrustumCulling` y `enableLOD` (default: `true` ambos)

### GeometryRegistry (`geometries/registry.js`)
Registry de geometrías que mapea tipos abstractos a implementaciones Three.js.

**Responsabilidades:**
- Registrar factories de geometrías (box, sphere, cylinder, etc.)
- Escalar parámetros relativos a tamaño absoluto
- Crear geometrías Three.js desde definiciones de BD

**Tipos soportados:**
- `box`: BoxGeometry
- `sphere`: SphereGeometry
- `cylinder`: CylinderGeometry
- `cone`: ConeGeometry
- `torus`: TorusGeometry

### RendererRegistry (`registry.js`)
Registry de renderizadores para selección dinámica.

**Responsabilidades:**
- Registrar renderizadores por tipo de entidad
- Seleccionar renderizador apropiado según partícula/entidad

### Optimizaciones (`optimizations/`)
Módulo de optimizaciones de renderizado.

**Componentes:**
- `LODManager`: Gestión de Level of Detail para reducir detalle de partículas lejanas

**Ver:** `optimizations/README.md` para más detalles

## Conceptos Importantes

### Parámetros Relativos

Los parámetros de geometría en BD son **relativos a `tamano_celda`**:
- `width: 1.0` con `tamano_celda: 0.25m` = `0.25m` de ancho
- `width: 2.0` con `tamano_celda: 0.25m` = `0.5m` de ancho

El `GeometryRegistry` escala automáticamente estos parámetros al crear geometrías Three.js.

### Prioridad de Resolución de Formas

1. **Agrupación**: Si la partícula tiene `agrupacion_id` y la agrupación tiene `geometria_agrupacion` con la parte correspondiente
2. **Tipo de partícula**: Si el tipo tiene `estilos.visual.geometria`
3. **Default**: BoxGeometry estándar

## Uso

```javascript
import { GeometryRegistry } from './geometries/registry.js';
import { ParticleRenderer } from './particle-renderer.js';

// Crear registry de geometrías
const geometryRegistry = new GeometryRegistry();

// Crear renderizador
const renderer = new ParticleRenderer(geometryRegistry);

// Preparar datos
const tiposEstilos = new Map(); // Map<string, TipoEstilosBD>
tiposEstilos.set('madera', { color_hex: '#8B4513', material: { metalness: 0.1, roughness: 0.8 } });

const agrupacionesGeometria = new Map(); // Map<string, GeometriaAgrupacion> (opcional)

// Renderizar partículas (con cámara para frustum culling y LOD)
const instancedMeshes = renderer.renderParticles(
    particles,              // Array de partículas
    tiposEstilos,          // Map de estilos por tipo
    agrupacionesGeometria, // Map de geometrías por agrupación (opcional)
    cellSize,              // Tamaño de celda en metros
    scene,                 // Escena Three.js
    camera                 // Cámara Three.js (opcional, para frustum culling y LOD)
);

// Configurar optimizaciones
renderer.enableFrustumCulling = true; // Habilitar/deshabilitar frustum culling
renderer.enableLOD = true; // Habilitar/deshabilitar LOD

// Configurar umbrales LOD
renderer.lodManager.setDistanceThresholds(15, 40, 120); // high, medium, low (metros)

// Limpiar cuando sea necesario
renderer.clearParticles(instancedMeshes, scene);
```

## Extensibilidad

### Agregar Nueva Geometría

```javascript
// En geometries/registry.js
geometryRegistry.register('custom', (params, cellSize) => {
    const scaled = geometryRegistry.scaleParams(params, cellSize);
    return new THREE.CustomGeometry(scaled.width, scaled.height);
});
```

### Agregar Nuevo Renderizador

```javascript
// Crear archivo tree-renderer.js
import { BaseRenderer } from './base-renderer.js';

export class TreeRenderer extends BaseRenderer {
    renderParticles(particles, tiposEstilos, agrupacionesGeometria, cellSize, scene) {
        // Implementación especializada para árboles
    }
}

// Registrar en registry.js
RendererRegistry.register('tree', TreeRenderer);
```

## Referencias

- Ver `frontend/src/README.md` para información general
- Ver análisis de arquitectura para más detalles sobre formas geométricas

