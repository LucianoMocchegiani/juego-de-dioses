# Templates de Bípedos

Este módulo contiene templates para crear personajes bípedos (humanos, elfos, enanos, etc.) que se definen y crean desde la base de datos usando el sistema de templates/builders/creators.

## Estructura

- `base.py`: Clase base `BipedTemplate` que extiende `BaseTemplate`
- `humano.py`: Template específico para humanos
- `registry.py`: Registry pattern para descubrir templates dinámicamente

## Uso

```python
from src.database.templates.bipedos.registry import get_biped_template
from src.database.creators.entity_creator import EntityCreator

# Obtener template
template = get_biped_template('humano')

# Crear personaje usando EntityCreator
creator = EntityCreator(conn, dimension_id)
particulas_count = await creator.create_entity(
    template,
    x=45,
    y=45,
    z=1,
    create_agrupacion=True
)
```

## Agregar Nuevo Template

Para agregar un nuevo template de bípedo (ej: elfo, enano):

1. Crear archivo `nuevo_template.py` en esta carpeta
2. Extender `BipedTemplate`:
   ```python
   from src.database.templates.bipedos.base import BipedTemplate
   
   class NuevoTemplate(BipedTemplate):
       def __init__(self):
           super().__init__(
               nombre='Nuevo',
               altura_cabeza=1,
               altura_torso=4,
               altura_piernas=4,
               ancho_hombros=2,
               ancho_cadera=2
           )
       
       def get_posiciones(self, x_centro, y_centro, z_base):
           # Implementar lógica para posiciones
           pass
   ```
3. Registrar en `registry.py`:
   ```python
   from src.database.templates.bipedos.nuevo_template import NuevoTemplate
   
   BIPED_TEMPLATES: Dict[str, BipedTemplate] = {
       'humano': HumanoTemplate(),
       'nuevo': NuevoTemplate(),  # Agregar aquí
   }
   ```

## Partes del Cuerpo

Los templates de bípedos deben definir las siguientes partes:
- `cabeza`: Parte superior del cuerpo
- `torso`: Tronco principal
- `brazo_izquierdo`: Brazo izquierdo
- `brazo_derecho`: Brazo derecho
- `pierna_izquierda`: Pierna izquierda
- `pierna_derecha`: Pierna derecha

Cada parte debe tener su identificador único en `get_propiedades_particula()` para que el sistema de renderizado pueda aplicar la geometría correcta desde `geometria_agrupacion`.

## Referencias

- Ver `templates/trees/` para ejemplos de templates similares
- Ver `builders/biped_builder.py` para cómo se construyen las partículas
- Ver `creators/entity_creator.py` para cómo se usan los templates

