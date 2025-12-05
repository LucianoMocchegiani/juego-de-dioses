# Módulo de Optimizaciones

Este módulo contiene optimizaciones para mejorar el rendimiento del renderizado de partículas.

## Estructura

```
optimizations/
├── lod-manager.js        # Gestión de Level of Detail (LOD)
├── particle-limiter.js   # Limitación agresiva de partículas
└── __init__.js          # Exportaciones del módulo
```

## Componentes

### LODManager (`lod-manager.js`)
Gestor de Level of Detail (LOD) para partículas.

**Responsabilidades:**
- Calcular distancias de partículas a la cámara
- Determinar nivel LOD según distancia (high, medium, low)
- Aplicar reducción de detalle a geometrías lejanas
- Configurar umbrales de distancia

**Niveles LOD:**
- **High**: < 10m - Detalle completo (sin cambios)
- **Medium**: 10-30m - Detalle reducido (50% de segments)
- **Low**: > 30m - Detalle mínimo (25% de segments)

**Geometrías optimizadas:**
- `sphere`: Reduce `segments`
- `cylinder`: Reduce `segments`
- `cone`: Reduce `segments`
- `torus`: Reduce `radialSegments` y `tubularSegments`
- `box`: Sin cambios (ya es simple)

## Uso

```javascript
import { LODManager } from './optimizations/lod-manager.js';

// Crear LOD Manager
const lodManager = new LODManager(geometryRegistry);

// Aplicar LOD a partículas
const particlesWithLOD = lodManager.applyLOD(
    particles,
    camera.position,
    cellSize
);

// Obtener parámetros LOD para una geometría
const lodParams = lodManager.getLODParams(
    'sphere',
    { radius: 1.0, segments: 16 },
    'medium' // 'high', 'medium', 'low'
);

// Configurar umbrales personalizados
lodManager.setDistanceThresholds(15, 40, 120);
```

### ParticleLimiter (`particle-limiter.js`)
Gestor de limitación agresiva de partículas para mejorar el rendimiento.

**Responsabilidades:**
- Limitar número máximo de partículas renderizadas
- Priorizar partículas cercanas a la cámara
- Reducir densidad de partículas lejanas

**Estrategias:**
- **Limitación simple**: Ordena por distancia y toma las N más cercanas
- **Limitación con densidad**: Reduce densidad de partículas lejanas (cada N partículas)

**Configuración:**
- `maxParticles`: Número máximo de partículas a renderizar (default: 100000)
- `enableParticleLimiting`: Habilitar/deshabilitar limitación (default: true)

## Conceptos

### Level of Detail (LOD)
Técnica de optimización que reduce el detalle de objetos lejanos para mejorar el rendimiento sin afectar significativamente la calidad visual.

**Beneficios:**
- Reduce número de polígonos renderizados
- Mejora FPS en escenas con muchas partículas
- Mantiene calidad visual aceptable

**Cómo funciona:**
1. Calcula distancia de cada partícula a la cámara
2. Determina nivel LOD según umbrales de distancia
3. Reduce `segments` de geometrías según nivel LOD
4. Partículas cercanas mantienen detalle completo

## Configuración

### Umbrales de Distancia
Por defecto:
- **High**: < 10 metros
- **Medium**: 10-30 metros
- **Low**: > 30 metros

Pueden configurarse según necesidades:
```javascript
lodManager.setDistanceThresholds(high, medium, low);
```

## Referencias

- Ver `frontend/src/renderers/README.md` para información sobre renderizadores
- Ver `frontend/src/utils/culling.js` para frustum culling
- Ver análisis de arquitectura JDG-007 para más detalles

