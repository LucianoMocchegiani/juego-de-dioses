# Módulo Database

Este módulo contiene toda la lógica relacionada con la base de datos: conexiones, seeds, templates, builders, creators y construcción de terrenos.

## Estructura

```
database/
├── __init__.py              # Inicialización del módulo
├── connection.py            # Gestión de conexiones a PostgreSQL
├── seed_demo.py             # Script de seed para crear dimensiones demo
├── terrain_builder.py       # Funciones para construir terrenos y límites
├── tree_templates.py        # ⚠️ DEPRECADO: Usar templates/trees/ en su lugar
│
├── templates/               # Sistema de templates para entidades
│   ├── base.py              # BaseTemplate (clase abstracta)
│   ├── trees/               # Templates de árboles
│   ├── plants/              # Templates de plantas (futuro)
│   ├── cuadrupedos/         # Templates de animales cuadrúpedos (futuro)
│   └── bipedos/             # Templates de razas bípedas (futuro)
│
├── builders/                # Builders para convertir templates en partículas
│   ├── base.py              # BaseBuilder (clase abstracta)
│   └── tree_builder.py      # TreeBuilder (crea árboles)
│
└── creators/                # Creators de alto nivel para simplificar creación
    └── entity_creator.py    # EntityCreator (factory genérico)
```

## Componentes Principales

### 1. Templates (`templates/`)

**Responsabilidad:** Definir la estructura y propiedades de las entidades (árboles, plantas, animales, razas).

**Arquitectura:**
- `BaseTemplate`: Clase abstracta base para todos los templates
- Templates específicos por categoría (trees, plants, etc.)
- Registry pattern para descubrimiento dinámico

**Ver:** `templates/README.md` para documentación completa.

### 2. Builders (`builders/`)

**Responsabilidad:** Convertir templates en partículas (tuplas) para insertar en la base de datos.

**Arquitectura:**
- `BaseBuilder`: Clase abstracta base para todos los builders
- Builders específicos por categoría (TreeBuilder, PlantBuilder, etc.)
- Reciben IDs de tipos de partículas y estados de materia

**Ver:** `builders/README.md` para documentación completa.

### 3. Creators (`creators/`)

**Responsabilidad:** Simplificar la creación de entidades ocultando complejidad de builders y obtención de IDs.

**Arquitectura:**
- `EntityCreator`: Factory genérico que selecciona builders y obtiene IDs
- Cache de IDs para mejor rendimiento
- Inserción en batch de partículas

**Ver:** `creators/README.md` para documentación completa.

### 4. Connection (`connection.py`)

**Responsabilidad:** Gestión de conexiones a PostgreSQL usando `asyncpg`.

**Funcionalidad:**
- Pool de conexiones
- Configuración desde variables de entorno
- Manejo de errores de conexión

### 5. Seed Demo (`seed_demo.py`)

**Responsabilidad:** Crear dimensiones demo con terrenos y entidades para desarrollo y testing.

**Funcionalidad:**
- Crea dimensión demo (40x40m)
- Genera acuífero subterráneo
- Genera bioma bosque con árboles
- Usa el sistema de templates/builders/creators

### 6. Terrain Builder (`terrain_builder.py`)

**Responsabilidad:** Funciones helper para construcción de terrenos y límites de dimensiones.

**Funcionalidad:**
- Crear capa de partículas límite
- Funciones auxiliares para construcción de terrenos

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
from src.database.templates.trees.registry import get_tree_template
from src.database.creators.entity_creator import EntityCreator

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

**⚠️ IMPORTANTE:** Cada vez que se modifique este módulo o sus subcarpetas:

1. **Actualizar README del módulo/carpeta modificado**
2. **Verificar y actualizar READMEs padres si es necesario**
3. **Mantener documentación sincronizada con el código**

**Ejemplo:**
- Si se agrega un nuevo template en `templates/trees/`:
  - Actualizar `templates/trees/README.md` (si existe)
  - Actualizar `templates/README.md`
  - Verificar si `database/README.md` necesita actualización

## Dependencias

- `asyncpg`: Cliente PostgreSQL asíncrono
- `python-dotenv`: Carga de variables de entorno
- `uuid`: Generación de UUIDs
- `json`: Serialización de propiedades

## Notas

- El archivo `tree_templates.py` está **deprecado** y se mantiene solo por compatibilidad temporal
- Usar el nuevo sistema de `templates/trees/` en su lugar
- Todos los nuevos desarrollos deben usar el sistema modular

## Referencias

- [Templates README](templates/README.md) - Documentación del sistema de templates
- [Builders README](builders/README.md) - Documentación del sistema de builders
- [Creators README](creators/README.md) - Documentación del sistema de creators

