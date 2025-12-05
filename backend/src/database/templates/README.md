# Sistema de Templates

Este documento explica cómo funciona el sistema de templates, builders y creators, y cómo agregar nuevos tipos de entidades.

## Arquitectura General

El sistema está organizado en tres capas principales:

1. **Templates**: Definen la estructura y propiedades de las entidades (árboles, plantas, animales, etc.)
2. **Builders**: Convierten templates en partículas para la base de datos
3. **Creators**: Simplifican la creación de entidades usando builders

```
Template → Builder → Creator → Base de Datos
```

## Estructura de Directorios

```
backend/src/database/
├── templates/
│   ├── base.py              # BaseTemplate (clase abstracta)
│   ├── trees/
│   │   ├── base.py          # TreeTemplate
│   │   ├── roble.py         # RobleTemplate
│   │   ├── palmera.py       # PalmeraTemplate
│   │   ├── paraiso.py       # ParaisoTemplate
│   │   └── registry.py      # Registry de árboles
│   ├── plants/              # (futuro)
│   ├── cuadrupedos/         # (futuro)
│   └── bipedos/             # (futuro)
├── builders/
│   ├── base.py              # BaseBuilder (clase abstracta)
│   └── tree_builder.py      # TreeBuilder
└── creators/
    └── entity_creator.py    # EntityCreator
```

## Cómo Agregar un Nuevo Template de Árbol

### Paso 1: Crear el archivo del template

Crear archivo `backend/src/database/templates/trees/nuevo_arbol.py`:

```python
from src.database.templates.trees.base import TreeTemplate

class NuevoArbolTemplate(TreeTemplate):
    """Template para nuevo tipo de árbol"""
    
    def __init__(self):
        super().__init__(
            nombre='Nuevo Árbol',
            grosor_tronco=2,        # Grosor del tronco (en partículas)
            altura_min=10,          # Altura mínima del tronco
            altura_max=15,          # Altura máxima del tronco
            copa_tamano=3,          # Radio de la copa
            copa_niveles=3,         # Niveles de altura de la copa
            raiz_tamano=2,          # Tamaño de las raíces
            raiz_profundidad=2,     # Profundidad de las raíces
            densidad=0.15           # Densidad para selección aleatoria
        )
```

### Paso 2: Registrar en el registry

Editar `backend/src/database/templates/trees/registry.py`:

```python
from src.database.templates.trees.nuevo_arbol import NuevoArbolTemplate

# Agregar al diccionario TREE_TEMPLATES
TREE_TEMPLATES: Dict[str, TreeTemplate] = {
    'roble': RobleTemplate(),
    'palmera': PalmeraTemplate(),
    'paraiso': ParaisoTemplate(),
    'nuevo_arbol': NuevoArbolTemplate(),  # ← Agregar aquí
}
```

### Paso 3: ¡Listo!

El nuevo template está disponible automáticamente:
- Se puede obtener con `get_tree_template('nuevo_arbol')`
- Se puede seleccionar aleatoriamente con `get_random_tree_template()`
- Funciona con `EntityCreator` sin modificar código adicional

## Cómo Agregar una Nueva Categoría (ej: Plantas)

### Paso 1: Crear estructura de carpetas

```
backend/src/database/templates/plants/
├── __init__.py
├── base.py          # PlantTemplate(BaseTemplate)
├── rosa.py          # RosaTemplate(PlantTemplate)
├── girasol.py       # GirasolTemplate(PlantTemplate)
└── registry.py      # Registry de plantas
```

### Paso 2: Crear clase base de la categoría

Crear `backend/src/database/templates/plants/base.py`:

```python
from typing import List, Tuple, Dict, Any
from src.database.templates.base import BaseTemplate

class PlantTemplate(BaseTemplate):
    """Clase base para templates de plantas"""
    
    def __init__(
        self,
        nombre: str,
        altura: int,
        ancho: int,
        # ... otros parámetros específicos de plantas
    ):
        super().__init__(nombre, 'plant')
        self.altura = altura
        self.ancho = ancho
        # ...
    
    def get_posiciones(self, x_centro: int, y_centro: int, z_base: int) -> List[Tuple[int, int, int]]:
        """Implementar lógica de generación de posiciones"""
        # ...
        pass
    
    def get_propiedades_particula(self, parte: str) -> Dict[str, Any]:
        """Implementar propiedades según la parte"""
        # ...
        pass
```

### Paso 3: Crear templates específicos

Crear `backend/src/database/templates/plants/rosa.py`:

```python
from src.database.templates.plants.base import PlantTemplate

class RosaTemplate(PlantTemplate):
    def __init__(self):
        super().__init__(
            nombre='Rosa',
            altura=3,
            ancho=2,
            # ...
        )
```

### Paso 4: Crear registry

Crear `backend/src/database/templates/plants/registry.py`:

```python
from typing import Dict
from src.database.templates.plants.base import PlantTemplate
from src.database.templates.plants.rosa import RosaTemplate

PLANT_TEMPLATES: Dict[str, PlantTemplate] = {
    'rosa': RosaTemplate(),
    # ...
}

def get_plant_template(template_id: str) -> PlantTemplate:
    return PLANT_TEMPLATES.get(template_id)
```

### Paso 5: Crear Builder específico

Crear `backend/src/database/builders/plant_builder.py`:

```python
from typing import List, Tuple, Dict
from uuid import UUID
import asyncpg
import json
from src.database.builders.base import BaseBuilder
from src.database.templates.plants.base import PlantTemplate

class PlantBuilder(BaseBuilder):
    """Builder para crear plantas usando PlantTemplate"""
    
    def __init__(self, template: PlantTemplate):
        if not isinstance(template, PlantTemplate):
            raise ValueError(f"PlantBuilder requiere PlantTemplate")
        super().__init__(template)
        self.template: PlantTemplate = template
    
    async def create_at_position(
        self,
        conn: asyncpg.Connection,
        dimension_id: UUID,
        x: int,
        y: int,
        z: int,
        planta_id: str = None,
        solido_id: str = None,
        **kwargs
    ) -> List[Tuple]:
        """Crear planta en posición específica"""
        # Implementar lógica de creación
        particles = []
        # ...
        return particles
    
    def get_particle_type_ids(self) -> Dict[str, str]:
        return {
            'planta': 'hierba',  # o el tipo de partícula apropiado
        }
    
    def get_matter_state_name(self) -> str:
        return 'solido'
```

### Paso 6: Actualizar EntityCreator

Editar `backend/src/database/creators/entity_creator.py`:

```python
from src.database.builders.plant_builder import PlantBuilder

def _get_builder(self, template: BaseTemplate) -> BaseBuilder:
    """Obtener builder apropiado según el template"""
    if template.categoria == 'tree':
        return TreeBuilder(template)
    elif template.categoria == 'plant':  # ← Agregar aquí
        return PlantBuilder(template)
    else:
        raise ValueError(f"No hay builder para categoría '{template.categoria}'")
```

### Paso 7: ¡Listo!

La nueva categoría está completamente integrada y funciona con `EntityCreator`.

## Conceptos Clave

### Tipos de Partículas vs Estados de Materia

Cada partícula necesita **dos cosas**:

1. **Tipo de partícula** (`tipo_particula_id`): Qué es
   - Ejemplos: `madera`, `hojas`, `piedra`, `agua`, `tierra`

2. **Estado de materia** (`estado_materia_id`): Cómo está
   - Ejemplos: `solido`, `liquido`, `gaseoso`

**Ejemplo:**
- Roca = `piedra` (tipo) + `solido` (estado)
- Agua líquida = `agua` (tipo) + `liquido` (estado)
- Hielo = `agua` (tipo) + `solido` (estado)

### Métodos Clave de BaseTemplate

- `get_posiciones(x, y, z)`: Retorna todas las posiciones (x, y, z) que forman la entidad
- `get_propiedades_particula(parte)`: Retorna propiedades JSON para una parte específica
- `get_metadata()`: Retorna metadata del template

### Métodos Clave de BaseBuilder

- `create_at_position(conn, dimension_id, x, y, z, **kwargs)`: Crea la entidad y retorna tuplas para insertar
- `get_particle_type_ids()`: Retorna nombres de tipos de partículas necesarios
- `get_matter_state_name()`: Retorna nombre del estado de materia necesario

## Ejemplos de Uso

### Crear un árbol usando EntityCreator

```python
from src.database.creators.entity_creator import EntityCreator
from src.database.templates.trees.registry import get_tree_template

# Obtener template
template = get_tree_template('roble')

# Crear creator
creator = EntityCreator(conn, dimension_id)

# Crear árbol en posición (x=10, y=20, z=0)
particulas_creadas = await creator.create_entity(template, 10, 20, 0)
print(f"Se crearon {particulas_creadas} partículas")
```

### Crear árbol aleatorio

```python
from src.database.templates.trees.registry import get_random_tree_template

template = get_random_tree_template()  # Selecciona según densidades
particulas_creadas = await creator.create_entity(template, 10, 20, 0)
```

## Notas Importantes

1. **Separación de responsabilidades**: Templates definen estructura, Builders crean partículas, Creators simplifican el uso
2. **Cache de IDs**: `EntityCreator` cachea IDs de tipos de partículas y estados para mejor rendimiento
3. **Extensibilidad**: Agregar nuevos templates no requiere modificar código existente
4. **Validación**: Los builders validan tipos de templates para prevenir errores



