# Módulo Database

Este módulo contiene la **infraestructura de persistencia**: conexiones a PostgreSQL y seeds. La lógica que define y crea entidades (árboles, personajes, etc.) está en **`src/world_creation_engine/`**.

## Estructura

```
database/
├── __init__.py              # Inicialización del módulo
├── connection.py            # Gestión de conexiones a PostgreSQL
├── seed_terrain_test_1.py   # Script de seed para terreno test 1: bosque denso con acuífero
├── seed_terrain_test_2.py   # Script de seed para terreno test 2: lago, montaña y pocos árboles (por defecto)
├── seed_biped_structure.py  # Script de seed para migrar rutas de modelos 3D
├── seed_character_with_model.py
```

## Componentes Principales

### 1. Connection (`connection.py`)

**Responsabilidad:** Gestión de conexiones a PostgreSQL usando `asyncpg`.

**Funcionalidad:**
- Pool de conexiones
- Configuración desde variables de entorno
- Manejo de errores de conexión

**Motor de creación del mundo:** templates, builders y creators están en **`src/world_creation_engine/`**. Los seeds importan desde ahí (`EntityCreator`, `get_random_tree_template`, etc.).

### 2. Seed Terrain Test 1 (`seed_terrain_test_1.py`)

**Responsabilidad:** Crear terreno test 1: bioma bosque denso con acuífero subterráneo.

**Funcionalidad:**
- Crea dimensión "Terreno Test 1 - Bosque Denso" (40x40m)
- Genera acuífero subterráneo
- Genera bioma bosque con muchos árboles
- Crea personaje demo con modelo 3D (`biped_male.glb`)
- Usa el sistema de templates/builders/creators

### 5.1. Seed Terrain Test 2 (`seed_terrain_test_2.py`)

**Responsabilidad:** Crear terreno test 2: lago, montaña y pocos árboles (terreno por defecto).

**Funcionalidad:**
- Crea dimensión "Terreno Test 2 - Lago y Montaña" (40x40m)
- Genera lago de agua en superficie
- Genera montaña pequeña con tierra y piedra
- Crea 10 árboles distribuidos estratégicamente
- Usa el sistema de templates/builders/creators

**Nota:** Este es el terreno usado por defecto por el frontend (ver `main.py`).

### 6. Seed Biped Structure (`seed_biped_structure.py`)

**Responsabilidad:** Actualizar rutas de modelos 3D a estructura biped/male/

**Funcionalidad:**
- Migra rutas de modelos desde estructura antigua (`characters/`) a nueva (`biped/male/characters/`)
- Script idempotente que se ejecuta automáticamente al iniciar el backend
- Actualiza solo registros que requieren cambios

**Nota:** Este script se ejecuta automáticamente en el startup del backend (ver `main.py`).

**Construcción de terreno (capa límite):** `create_boundary_layer` está en **`src/world_creation_engine/terrain_builder.py`**. Los seeds lo importan desde ahí.

## Flujo de Creación de Entidades

```
1. Template (define estructura)
   ↓
2. Builder (convierte a partículas)
   ↓
3. Creator (simplifica el proceso)
   ↓
4. Base de Datos (almacena partículas)
```

**Ejemplo:**
```python
from src.world_creation_engine.templates.trees.registry import get_tree_template
from src.world_creation_engine.creators.entity_creator import EntityCreator

# Obtener template
template = get_tree_template('roble')

# Crear creator
creator = EntityCreator(conn, dimension_id)

# Crear árbol
particulas_creadas = await creator.create_entity(template, x=10, y=20, z=0)
```

## Convenciones

### Nomenclatura

- **Templates**: `{Nombre}Template` (ej: `RobleTemplate`, `VacaTemplate`)
- **Builders**: `{Categoria}Builder` (ej: `TreeBuilder`, `PlantBuilder`)
- **Creators**: `{Funcionalidad}Creator` (ej: `EntityCreator`, `BiomeCreator`)

### Estructura de Archivos

- Cada categoría tiene su carpeta: `templates/trees/`, `templates/plants/`, etc.
- Cada carpeta tiene su `README.md` explicando su funcionalidad
- Cada carpeta tiene su `registry.py` para descubrimiento dinámico

## Extensibilidad

### Agregar Nueva Categoría

1. Crear carpeta en `templates/` (ej: `templates/plants/`)
2. Crear `base.py` con clase base (ej: `PlantTemplate`)
3. Crear templates específicos (ej: `rosa.py`, `girasol.py`)
4. Crear `registry.py` para registrar templates
5. Crear builder en `builders/` (ej: `plant_builder.py`)
6. Actualizar `EntityCreator._get_builder()` para incluir nueva categoría
7. Crear/actualizar `README.md` en la carpeta

**Ver:** `templates/README.md` para guía detallada.

## Mantenimiento de READMEs

**IMPORTANTE:** Cada vez que se modifique este módulo o sus subcarpetas:

1. **Actualizar README del módulo/carpeta modificado**
2. **Verificar y actualizar READMEs padres si es necesario**
3. **Mantener documentación sincronizada con el código**

**Ejemplo:**
- Si se agrega un nuevo template en `templates/trees/`:
  - Actualizar `templates/trees/README.md` (si existe)
  - Actualizar `templates/README.md`
  - Verificar si `database/README.md` necesita actualización

## Estructura de Base de Datos

### Tabla `agrupaciones`

La tabla `agrupaciones` incluye el campo `geometria_agrupacion` (JSONB) para definir formas geométricas especializadas por agrupación.

**Estructura de `geometria_agrupacion`:**
```json
{
  "tipo": "arbol|animal|construccion|...",
  "partes": {
    "parte_nombre": {
      "geometria": {
        "tipo": "box|sphere|cylinder|cone|torus|custom",
        "parametros": {
          // Parámetros relativos a tamano_celda según tipo
        }
      },
      "offset": {"x": 0, "y": 0, "z": 0},
      "rotacion": {"x": 0, "y": 0, "z": 0}
    }
  }
}
```

**Nota importante:** Los parámetros son relativos a `tamano_celda` de la dimensión. Tamaño absoluto = `parámetro × tamano_celda × escala`.

**Prioridad de resolución de formas:**
1. Agrupación (si existe `geometria_agrupacion` y la partícula tiene `parte_entidad`)
2. Tipo de partícula (si existe `estilos.visual.geometria`)
3. Default (box)

## Dependencias

- `asyncpg`: Cliente PostgreSQL asíncrono
- `python-dotenv`: Carga de variables de entorno
- `uuid`: Generación de UUIDs
- `json`: Serialización de propiedades

## Notas

- Todos los desarrollos deben usar el sistema modular de templates/builders/creators
- El sistema de templates es extensible: agregar nuevas categorías siguiendo el patrón existente

## Actualizar Formas Geométricas en Tipos de Partículas

Para actualizar las formas geométricas de tipos de partículas existentes, usar `jsonb_set`:

```sql
-- Ejemplo: Actualizar tipo "madera" con forma cilíndrica
UPDATE juego_dioses.tipos_particulas 
SET estilos = jsonb_set(
    COALESCE(estilos, '{}'::jsonb),
    '{visual,geometria}',
    '{
        "tipo": "cylinder",
        "parametros": {
            "radiusTop": 0.4,
            "radiusBottom": 0.5,
            "height": 1.0,
            "segments": 8
        }
    }'::jsonb
)
WHERE nombre = 'madera';
```

**Tipos de geometría soportados:**
- `box`: Caja (width, height, depth)
- `sphere`: Esfera (radius, segments)
- `cylinder`: Cilindro (radiusTop, radiusBottom, height, segments)
- `cone`: Cono (radius, height, segments)
- `torus`: Toro (radius, tube, segments)

**Nota importante:** Los parámetros son relativos a `tamano_celda` de la dimensión.
- Tamaño absoluto = `parámetro × tamano_celda × escala`
- Ejemplo: `tamano_celda = 0.25m`, `radius = 0.5` → radio absoluto = `0.125m`

## Referencias

- [Templates README](templates/README.md) - Documentación del sistema de templates
- [Builders README](builders/README.md) - Documentación del sistema de builders
- [Creators README](creators/README.md) - Documentación del sistema de creators

