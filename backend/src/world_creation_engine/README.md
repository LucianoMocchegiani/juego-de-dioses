# World Creation Engine

Motor de creación del mundo: **toda la lógica que define y crea entidades** (árboles, personajes bípedos, etc.) vive aquí. No es acceso a la base de datos ni la API HTTP: es el “motor” que sabe *qué* es una entidad y *cómo* se construye; la persistencia se hace usando `src.database.connection` cuando hace falta.

**Separación de responsabilidades:**
- **`domains/`** = lógica de API: endpoints, schemas, respuestas HTTP (bloques, particles, characters, celestial, agrupaciones).
- **`world_creation_engine/`** = lógica de creación: templates (estructura de entidades), builders (template → partículas), creators (orquestador que escribe en BD). Los dominios y los seeds llaman al engine cuando necesitan “crear” algo en el mundo.

## Estructura

```
world_creation_engine/
├── templates/       # Estructura y propiedades de entidades (árboles, bipedos)
├── builders/        # Convierten templates en partículas para insertar en BD
├── creators/        # EntityCreator: orquesta builders y escribe en BD
└── terrain_builder.py   # create_boundary_layer: capa límite del mundo
```

## Imports

```python
from src.world_creation_engine import EntityCreator, BaseTemplate, BaseBuilder, create_boundary_layer
from src.world_creation_engine.templates.trees.registry import get_random_tree_template
from src.world_creation_engine.templates.bipedos.registry import get_biped_template
```
