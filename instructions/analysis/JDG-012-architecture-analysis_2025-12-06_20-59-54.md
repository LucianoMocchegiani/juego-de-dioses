# Análisis de Arquitectura - Sistema de Modelos 3D para Personajes (JDG-012)

## Situación Actual

### Backend

**Estructura actual:**
```
backend/src/
├── api/routes/
│   └── characters.py          # Endpoints para personajes (sin soporte de modelos)
├── database/
│   ├── builders/
│   │   └── biped_builder.py   # Crea agrupaciones con geometria_agrupacion (primitivas)
│   └── templates/bipedos/      # Templates de bípedos
├── models/
│   └── schemas.py              # Schemas Pydantic (sin modelo_3d)
└── main.py                     # FastAPI app (sin endpoints de archivos estáticos)
```

**Problemas identificados:**
1. **No hay sistema de almacenamiento de modelos 3D**: No existe infraestructura para guardar o servir archivos de modelos (GLTF, OBJ, etc.)
2. **Renderizado limitado a primitivas**: Solo se pueden usar formas geométricas básicas (esfera, cilindro, caja)
3. **No hay soporte para texturas**: Los materiales son hardcodeados en el frontend
4. **No hay sistema de archivos estáticos**: FastAPI no tiene configuración para servir archivos estáticos
5. **geometria_agrupacion solo soporta primitivas**: La estructura JSON actual no contempla referencias a modelos 3D externos

### Frontend

**Estructura actual:**
```
frontend/src/
├── ecs/factories/
│   └── player-factory.js       # Crea mesh desde geometria_agrupacion (primitivas)
├── renderers/
│   ├── geometries/
│   │   └── registry.js        # Registry de geometrías primitivas
│   └── particle-renderer.js   # Renderiza partículas
└── api/endpoints/
    └── characters.js           # Cliente API (sin método para modelos)
```

**Problemas identificados:**
1. **No hay loaders de modelos 3D**: No existe código para cargar GLTF, OBJ u otros formatos
2. **No hay sistema de cache de modelos**: Cada vez que se carga un personaje, se recrea el mesh desde primitivas
3. **Materiales hardcodeados**: Los colores y materiales están fijos en el código
4. **No hay manejo de texturas**: No existe infraestructura para cargar y aplicar texturas
5. **No hay fallback robusto**: Si falla la carga de modelo, el fallback es básico

### Base de Datos

**Estructura actual:**
```sql
agrupaciones (
    id UUID,
    dimension_id UUID,
    nombre TEXT,
    tipo TEXT,                    -- 'biped' para personajes
    especie TEXT,
    geometria_agrupacion JSONB,   -- Solo primitivas actualmente
    posicion_x INT,
    posicion_y INT,
    posicion_z INT
)
```

**Problemas identificados:**
1. **No hay campo para modelo 3D**: La tabla `agrupaciones` no tiene campo para referenciar modelos 3D
2. **geometria_agrupacion limitado**: Solo soporta definiciones de primitivas, no referencias a archivos
3. **No hay tabla de modelos**: No existe tabla para catalogar y gestionar modelos 3D disponibles
4. **No hay metadatos de modelos**: No se almacena información sobre formatos, tamaños, versiones, etc.

## Necesidades Futuras

### Categorías de Entidades/Funcionalidades

1. **Personajes con Modelos 3D** (nuevo):
   - Modelos GLTF/GLB para personajes humanos
   - Modelos para diferentes razas (elfos, enanos, etc.)
   - Variaciones de modelos (diferentes estilos, armaduras, etc.)
   - Requisitos: Almacenamiento, carga, renderizado, cache

2. **Sistema de Modelos Reutilizables** (nuevo):
   - Catálogo de modelos disponibles
   - Asociación modelo-personaje
   - Versionado de modelos
   - Requisitos: Gestión, búsqueda, versionado

3. **Optimización y Performance** (futuro):
   - Instancing para múltiples personajes con mismo modelo
   - LOD (Level of Detail) para modelos
   - Compresión de modelos
   - Requisitos: Cache, optimización, streaming

### Requisitos de Escalabilidad

1. **Fácil agregar nuevos modelos**: Sistema simple para subir y asociar modelos a personajes
2. **Reutilización de modelos**: Múltiples personajes pueden usar el mismo modelo
3. **Separación de responsabilidades**: Backend almacena, Frontend renderiza
4. **Extensibilidad**: Soporte para múltiples formatos (GLTF, OBJ, FBX)
5. **Mantenibilidad**: Sistema claro de gestión de modelos y versiones

## Arquitectura Propuesta

### Backend - Estructura Modular

```
backend/src/
├── api/routes/
│   ├── characters.py           # Endpoints existentes + modelo_3d
│   └── models.py               # Nuevo: Endpoints para gestión de modelos
├── database/
│   ├── builders/
│   │   └── biped_builder.py   # Agregar soporte para modelo_3d
│   └── models/                 # Nuevo: Gestión de modelos en BD
│       └── model_repository.py
├── models/
│   └── schemas.py              # Agregar Model3D, ModelMetadata schemas
├── storage/                    # Nuevo: Gestión de almacenamiento
│   ├── file_storage.py         # Sistema de archivos local
│   └── storage_interface.py    # Interface para diferentes backends (S3, local, etc.)
└── static/                     # Nuevo: Archivos estáticos servidos por FastAPI
    └── models/
        └── characters/
            ├── humano.glb
            ├── humano_v2.glb
            └── ...
```

### Jerarquía de Clases

```
BaseStorage (Interface)
├── LocalFileStorage          # Almacenamiento en sistema de archivos
├── S3Storage                 # Almacenamiento en S3 (futuro)
└── DatabaseStorage           # Almacenamiento en BD como BLOB (no recomendado)

ModelRepository
├── get_model(character_id)    # Obtener modelo asociado a personaje
├── list_models()             # Listar modelos disponibles
└── get_model_metadata(id)     # Obtener metadatos de modelo

BipedBuilder
├── create_at_position()      # Ya existe (sin partículas)
├── create_agrupacion()       # Modificar para incluir modelo_3d
└── _build_geometria_agrupacion()  # Modificar para soportar modelo_3d
```

### Frontend - Estructura Modular

```
frontend/src/
├── ecs/factories/
│   └── player-factory.js     # Modificar para cargar modelos 3D
├── renderers/
│   ├── geometries/
│   │   └── registry.js      # Ya existe (primitivas)
│   ├── models/              # Nuevo: Sistema de modelos 3D
│   │   ├── model-loader.js  # Loader principal
│   │   ├── gltf-loader.js   # GLTFLoader wrapper
│   │   ├── obj-loader.js    # OBJLoader wrapper (opcional)
│   │   └── model-cache.js   # Cache de modelos cargados
│   └── particle-renderer.js # Ya existe
└── api/endpoints/
    └── characters.js         # Agregar getModelUrl(), getModel()
```

### Base de Datos - Estructura Propuesta

**Opción A: Campo en agrupaciones (Recomendado para MVP)**
```sql
ALTER TABLE juego_dioses.agrupaciones
ADD COLUMN modelo_3d JSONB;

-- Ejemplo de contenido:
{
  "tipo": "gltf",
  "ruta": "/models/characters/humano.glb",
  "escala": 1.0,
  "offset": {"x": 0, "y": 0, "z": 0},
  "rotacion": {"x": 0, "y": 0, "z": 0}
}
```

**Opción B: Tabla separada de modelos (Recomendado para escalabilidad)**
```sql
CREATE TABLE juego_dioses.modelos_3d (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL,  -- 'gltf', 'glb', 'obj', etc.
    ruta TEXT NOT NULL,
    especie TEXT,        -- 'humano', 'elfo', etc.
    version INTEGER DEFAULT 1,
    metadata JSONB,      -- Tamaño, polígonos, texturas, etc.
    creado_en TIMESTAMP DEFAULT NOW()
);

-- Relación con agrupaciones
ALTER TABLE juego_dioses.agrupaciones
ADD COLUMN modelo_3d_id UUID REFERENCES juego_dioses.modelos_3d(id);
```

## Patrones de Diseño a Usar

### 1. Strategy Pattern - Almacenamiento de Modelos
- **Descripción**: Diferentes estrategias de almacenamiento (local, S3, BD)
- **Cómo se aplica**: Interface `BaseStorage` con implementaciones `LocalFileStorage`, `S3Storage`
- **Beneficios**: Fácil cambiar de almacenamiento local a S3 sin modificar código de negocio

### 2. Factory Pattern - Loaders de Modelos
- **Descripción**: Factory para crear loaders apropiados según formato
- **Cómo se aplica**: `ModelLoaderFactory` que retorna `GLTFLoader`, `OBJLoader`, etc.
- **Beneficios**: Extensible para agregar nuevos formatos sin modificar código existente

### 3. Registry Pattern - Cache de Modelos
- **Descripción**: Registry para cachear modelos cargados
- **Cómo se aplica**: `ModelCache` que mantiene modelos cargados por URL/ruta
- **Beneficios**: Evita recargar modelos ya cargados, mejora performance

### 4. Adapter Pattern - Integración con Sistema Actual
- **Descripción**: Adaptador para integrar modelos 3D con sistema de primitivas
- **Cómo se aplica**: `ModelAdapter` que convierte modelo 3D a formato compatible con `PlayerFactory`
- **Beneficios**: Mantiene compatibilidad con sistema actual, migración gradual

### 5. Template Method - Construcción de Agrupaciones
- **Descripción**: Template method en `BipedBuilder` para construir agrupación con o sin modelo
- **Cómo se aplica**: Método `create_agrupacion()` que puede incluir `modelo_3d` o usar primitivas
- **Beneficios**: Reutilización de código, fácil agregar soporte para modelos

## Beneficios de la Nueva Arquitectura

1. **Flexibilidad**: Soporte para modelos 3D complejos con texturas y animaciones
2. **Escalabilidad**: Sistema preparado para múltiples formatos y almacenamientos
3. **Performance**: Cache de modelos evita recargas innecesarias
4. **Mantenibilidad**: Separación clara entre almacenamiento, API y renderizado
5. **Extensibilidad**: Fácil agregar nuevos formatos o sistemas de almacenamiento
6. **Compatibilidad**: Mantiene sistema actual de primitivas como fallback
7. **Reutilización**: Múltiples personajes pueden usar el mismo modelo

## Migración Propuesta

### Fase 1: Infraestructura Base
- Crear estructura de carpetas para modelos (`backend/static/models/`)
- Implementar `BaseStorage` interface y `LocalFileStorage`
- Agregar campo `modelo_3d` JSONB a tabla `agrupaciones`
- Crear endpoint básico para servir archivos estáticos en FastAPI
- Agregar schema `Model3D` en Pydantic

### Fase 2: Backend - Gestión de Modelos
- Modificar `BipedBuilder` para soportar `modelo_3d` en `create_agrupacion()`
- Crear `ModelRepository` para gestionar modelos en BD
- Agregar endpoint `GET /api/v1/models/{model_id}` para obtener modelo
- Agregar endpoint `GET /api/v1/characters/{character_id}/model` para obtener modelo de personaje
- Implementar validación de rutas y tipos de archivo

### Fase 3: Frontend - Loaders y Cache
- Crear `ModelLoader` con soporte para GLTF/GLB
- Crear `ModelCache` para cachear modelos cargados
- Modificar `PlayerFactory` para detectar y cargar modelos 3D
- Implementar fallback a primitivas si modelo no existe o falla
- Agregar método `getModelUrl()` en `CharactersApi`

### Fase 4: Integración y Testing
- Integrar sistema completo end-to-end
- Testing con modelos reales (GLTF/GLB)
- Verificar cache y performance
- Testing de casos edge (modelo no encontrado, corrupto, etc.)
- Documentación de uso

### Fase 5: Optimizaciones (Opcional)
- Implementar instancing para múltiples personajes
- Agregar soporte para OBJ (si se requiere)
- Sistema de LOD para modelos
- Compresión y optimización de modelos

## Consideraciones Técnicas

### Backend

1. **Compatibilidad**: 
   - Mantener `geometria_agrupacion` para primitivas (backward compatibility)
   - Campo `modelo_3d` es opcional, si no existe, usar primitivas
   - Migración gradual: personajes pueden tener modelo o primitivas

2. **Base de datos**: 
   - Campo JSONB `modelo_3d` en `agrupaciones` (MVP)
   - O tabla separada `modelos_3d` para escalabilidad (futuro)
   - Índices en `modelo_3d->>'ruta'` para búsquedas rápidas

3. **APIs**: 
   - Endpoint para servir archivos estáticos: `GET /static/models/{path}`
   - Endpoint para metadatos: `GET /api/v1/models/{model_id}`
   - Endpoint para modelo de personaje: `GET /api/v1/characters/{id}/model`
   - Validación de rutas para prevenir path traversal

4. **Testing**: 
   - Testing de carga de modelos reales
   - Testing de validación de rutas
   - Testing de fallback a primitivas
   - Testing de cache

### Frontend

1. **Renderizado**: 
   - Usar `GLTFLoader` de Three.js para cargar modelos
   - Aplicar escala, offset y rotación según configuración
   - Mantener compatibilidad con sistema de ECS actual
   - Integrar con `RenderSystem` existente

2. **Optimización**: 
   - Cache de modelos cargados (Map por URL)
   - Lazy loading: cargar solo cuando se necesita
   - Instancing para múltiples personajes (futuro)
   - Compresión de modelos antes de subir

3. **Extensibilidad**: 
   - Sistema de loaders extensible (Factory pattern)
   - Fácil agregar nuevos formatos (OBJ, FBX, etc.)
   - Sistema de plugins para procesamiento de modelos

## Ejemplo de Uso Futuro

### Backend - Crear Personaje con Modelo

```python
# En BipedBuilder
async def create_agrupacion(self, conn, dimension_id, x, y, z):
    metadata = self.get_agrupacion_metadata()
    geometria = self._build_geometria_agrupacion(tamano_celda)
    
    # Agregar modelo 3D si está disponible
    modelo_3d = {
        "tipo": "gltf",
        "ruta": "/models/characters/humano.glb",
        "escala": 1.0,
        "offset": {"x": 0, "y": 0, "z": 0},
        "rotacion": {"x": 0, "y": 0, "z": 0}
    }
    
    agrupacion_id = await conn.fetchval("""
        INSERT INTO juego_dioses.agrupaciones
        (dimension_id, nombre, tipo, especie, geometria_agrupacion, modelo_3d, posicion_x, posicion_y, posicion_z)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9)
        RETURNING id
    """, dimension_id, metadata['nombre'], metadata['tipo'], metadata['especie'], 
        json.dumps(geometria), json.dumps(modelo_3d), x, y, z)
    
    return agrupacion_id
```

### Frontend - Cargar Modelo

```javascript
// En player-factory.js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ModelCache } from '../renderers/models/model-cache.js';

async function loadModel3D(modelo3d, cellSize) {
    const cache = ModelCache.getInstance();
    const modelUrl = `/static/models${modelo3d.ruta}`;
    
    // Verificar cache
    if (cache.has(modelUrl)) {
        return cache.get(modelUrl).clone();
    }
    
    // Cargar modelo
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(modelUrl);
    
    const model = gltf.scene;
    
    // Aplicar escala
    if (modelo3d.escala) {
        model.scale.set(modelo3d.escala, modelo3d.escala, modelo3d.escala);
    }
    
    // Aplicar offset y rotación
    if (modelo3d.offset) {
        model.position.set(
            modelo3d.offset.x || 0,
            modelo3d.offset.y || 0,
            modelo3d.offset.z || 0
        );
    }
    
    if (modelo3d.rotacion) {
        model.rotation.set(
            ((modelo3d.rotacion.x || 0) * Math.PI) / 180,
            ((modelo3d.rotacion.y || 0) * Math.PI) / 180,
            ((modelo3d.rotacion.z || 0) * Math.PI) / 180
        );
    }
    
    // Cachear modelo
    cache.set(modelUrl, model);
    
    return model;
}

// En createPlayer()
if (character.modelo_3d) {
    try {
        mesh = await loadModel3D(character.modelo_3d, cellSize);
    } catch (error) {
        console.warn('Error cargando modelo 3D, usando fallback:', error);
        mesh = buildMeshFromGeometry(character.geometria_agrupacion, cellSize);
    }
} else {
    mesh = buildMeshFromGeometry(character.geometria_agrupacion, cellSize);
}
```

### API - Endpoint para Modelo

```python
# En characters.py
@router.get("/{character_id}/model")
async def get_character_model(
    dimension_id: UUID,
    character_id: UUID
):
    """Obtener URL del modelo 3D de un personaje"""
    async with get_connection() as conn:
        modelo_3d = await conn.fetchval("""
            SELECT modelo_3d
            FROM juego_dioses.agrupaciones
            WHERE id = $1 AND dimension_id = $2
        """, character_id, dimension_id)
        
        if not modelo_3d:
            raise HTTPException(status_code=404, detail="Personaje no tiene modelo 3D")
        
        return {
            "model_url": f"/static/models{modelo_3d['ruta']}",
            "metadata": modelo_3d
        }
```

## Decisiones de Diseño

### Almacenamiento: Sistema de Archivos Local (MVP)

**Decisión**: Usar sistema de archivos local para MVP, preparado para migrar a S3.

**Razones**:
- Más simple de implementar
- No requiere servicios externos
- Fácil migrar a S3 después usando Strategy pattern
- Suficiente para desarrollo y testing

**Estructura propuesta**:
```
backend/static/models/
├── characters/
│   ├── humano.glb
│   ├── humano_v2.glb
│   └── elfo.glb
└── objects/
    └── ...
```

### Formato: GLTF/GLB (Prioritario)

**Decisión**: Soporte inicial para GLTF/GLB, OBJ como opcional.

**Razones**:
- GLTF/GLB es el estándar web para modelos 3D
- Optimizado para web (binario, comprimido)
- Soporta texturas, materiales, animaciones
- Ampliamente soportado por Three.js

### Estructura de Datos: Campo JSONB en agrupaciones (MVP)

**Decisión**: Agregar campo `modelo_3d` JSONB en `agrupaciones` para MVP.

**Razones**:
- Más simple que tabla separada
- No requiere migración compleja
- Suficiente para MVP
- Fácil migrar a tabla separada después si se necesita

### Cache: Frontend con Map

**Decisión**: Cache simple en frontend usando Map.

**Razones**:
- Simple de implementar
- Efectivo para evitar recargas
- Puede mejorarse después con IndexedDB para persistencia

## Conclusión

La arquitectura propuesta permite implementar un sistema de modelos 3D para personajes de forma escalable y mantenible. La separación entre almacenamiento (backend), API (endpoints) y renderizado (frontend) permite:

1. **Flexibilidad**: Fácil cambiar de almacenamiento local a S3
2. **Extensibilidad**: Fácil agregar nuevos formatos de modelos
3. **Performance**: Cache de modelos evita recargas
4. **Compatibilidad**: Mantiene sistema actual de primitivas como fallback
5. **Escalabilidad**: Preparado para múltiples personajes y modelos

La implementación se puede hacer de forma incremental, empezando con MVP (archivos locales, GLTF/GLB) y expandiendo según necesidades (S3, más formatos, optimizaciones).

