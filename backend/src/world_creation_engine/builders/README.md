# Sistema de Builders

Parte del **motor de creación del mundo** (`world_creation_engine/`). Este documento explica cómo funcionan los builders y el flujo de creación de partículas.

## Parte Técnica

### ¿Qué es un Builder?

Un **Builder** es responsable de convertir un **Template** (definición de entidad) en **partículas** (datos para insertar en la base de datos).

### Arquitectura

```
Template → Builder → Lista de Tuplas → Base de Datos
```

### Clases Principales

- **`BaseBuilder`**: Clase abstracta que define la interfaz común
- **`TreeBuilder`**: Implementación específica para árboles
- **`BipedBuilder`**: Implementación para bípedos (personajes)
- **`PlantBuilder`**: (Futuro) Implementación para plantas
- **`CuadripedoBuilder`**: (Futuro) Implementación para animales de cuatro patas

### Responsabilidades

1. **Validar el template**: Asegurar que el template es del tipo correcto
2. **Crear agrupación** (opcional): Crear registro de agrupación en la BD para agrupar partículas
3. **Generar partículas**: Convertir posiciones del template en tuplas para la BD
4. **Asignar propiedades**: Asignar tipos de partículas, estados de materia, temperaturas, agrupacion_id, etc.
5. **Retornar datos**: Retornar lista de tuplas listas para insertar

## Flujo de Ejecución

### Flujo General: Crear un Árbol

```
1. EntityCreator recibe un TreeTemplate
   ↓
2. EntityCreator llama a _get_builder(template)
   ↓
3. Se crea un TreeBuilder(template)
   ↓
4. EntityCreator crea agrupación (opcional):
   ├─ 4.1. Llama a builder.create_agrupacion(conn, dimension_id, x, y, z)
   ├─ 4.2. TreeBuilder.create_agrupacion() ejecuta:
   │   ├─ Obtiene metadata: builder.get_agrupacion_metadata()
   │   │   └─ Retorna: {'nombre': 'Roble #1234', 'tipo': 'arbol', 'especie': 'roble'}
   │   └─ Inserta en BD: INSERT INTO agrupaciones (...)
   │       └─ Retorna: agrupacion_id (UUID)
   ↓
5. EntityCreator obtiene IDs necesarios (madera_id, hojas_id, solido_id)
   ↓
6. EntityCreator llama a builder.create_at_position(..., agrupacion_id, madera_id, hojas_id, solido_id)
   ↓
7. TreeBuilder.create_at_position() ejecuta:
   ├─ 7.1. Valida que tiene todos los IDs necesarios
   ├─ 7.2. Obtiene altura aleatoria del tronco: template.get_altura_aleatoria()
   ├─ 7.3. Genera raíces: template.get_posiciones_raices(x, y, z)
   │   └─ Para cada posición de raíz:
   │       └─ Crea tupla: (..., agrupacion_id, ...)  # ← agrupacion_id asignado
   ├─ 7.4. Genera tronco: template.get_posiciones_tronco(x, y)
   │   └─ Para cada nivel z y cada posición del tronco:
   │       └─ Crea tupla: (..., agrupacion_id, ...)  # ← agrupacion_id asignado
   └─ 7.5. Genera copa: template.get_posiciones_copa(x, y, z_copa_base)
       └─ Para cada posición de hoja:
           └─ Crea tupla: (..., agrupacion_id, ...)  # ← agrupacion_id asignado
   ↓
8. TreeBuilder retorna lista de tuplas (todas con agrupacion_id)
   ↓
9. EntityCreator inserta todas las tuplas en batch en la BD
```

### Flujo Detallado: TreeBuilder.create_at_position()

#### Paso 1: Validación

```python
# En TreeBuilder.create_at_position()
if not all([madera_id, hojas_id, solido_id]):
    raise ValueError("Faltan IDs de tipos de partículas o estados de materia")
```

**¿Qué hace?** Verifica que se recibieron todos los IDs necesarios antes de continuar.

#### Paso 2: Obtener Altura del Tronco

```python
altura_tronco = self.template.get_altura_aleatoria()
```

**¿Qué hace?** Pide al template una altura aleatoria entre `altura_min` y `altura_max`.

**Ejemplo:** Si el template tiene `altura_min=20` y `altura_max=25`, retorna un número aleatorio entre 20 y 25.

#### Paso 3: Generar Raíces

```python
posiciones_raices = self.template.get_posiciones_raices(x, y, z)
for rx, ry, rz in posiciones_raices:
    particles.append((
        dimension_id, rx, ry, rz,
        madera_id, solido_id, 1.0, 18.0, 0.0, False,
        None, False, json.dumps(self.template.get_propiedades_particula('raiz'))
    ))
```

**¿Qué hace?**
1. Pide al template todas las posiciones (x, y, z) donde van las raíces
2. Para cada posición, crea una tupla con:
   - Coordenadas: `rx, ry, rz`
   - Tipo: `madera_id` (las raíces son de madera)
   - Estado: `solido_id` (estado sólido)
   - Temperatura: `18.0` (raíces más frías que el tronco)
   - Propiedades: JSON con `{"parte": "raiz", "tipo": "Roble"}`

**Ejemplo de posiciones retornadas:**
```python
[(10, 20, -1), (10, 20, -2), (11, 20, -1), (9, 20, -1), ...]
```

#### Paso 4: Generar Tronco

```python
posiciones_tronco = self.template.get_posiciones_tronco(x, y)
for z_level in range(z, z + altura_tronco):
    for tx, ty in posiciones_tronco:
        particles.append((
            dimension_id, tx, ty, z_level,
            madera_id, solido_id, 1.0, 20.0, 0.0, False,
            None, False, json.dumps(self.template.get_propiedades_particula('tronco'))
        ))
```

**¿Qué hace?**
1. Pide al template las posiciones (x, y) que forman el tronco (puede ser 2x2, 3x3, etc.)
2. Para cada nivel z desde la base hasta la altura del tronco:
   - Para cada posición (x, y) del tronco:
     - Crea una tupla con tipo `madera_id`, estado `solido_id`, temperatura `20.0`

**Ejemplo:**
- Si `grosor_tronco=2`, las posiciones son: `[(10, 20), (11, 20), (10, 21), (11, 21)]`
- Si `altura_tronco=25`, se crean partículas en z=0, z=1, z=2, ..., z=24
- Total: 4 posiciones × 25 niveles = 100 partículas de tronco

#### Paso 5: Generar Copa

```python
z_copa_base = z + altura_tronco
posiciones_copa = self.template.get_posiciones_copa(x, y, z_copa_base)
for cx, cy, cz in posiciones_copa:
    particles.append((
        dimension_id, cx, cy, cz,
        hojas_id, solido_id, 1.0, 22.0, 0.0, False,
        None, False, json.dumps(self.template.get_propiedades_particula('hojas'))
    ))
```

**¿Qué hace?**
1. Calcula la base de la copa: `z_copa_base = z + altura_tronco`
2. Pide al template todas las posiciones (x, y, z) donde van las hojas
3. Para cada posición, crea una tupla con:
   - Tipo: `hojas_id` (las hojas son de tipo "hojas")
   - Estado: `solido_id` (estado sólido)
   - Temperatura: `22.0` (hojas más calientes, expuestas al sol)

**Ejemplo de posiciones retornadas:**
```python
[(9, 19, 25), (10, 19, 25), (11, 19, 25), (9, 20, 25), (10, 20, 25), ...]
```

#### Paso 6: Retornar Lista de Tuplas

```python
return particles
```

**¿Qué hace?** Retorna todas las tuplas creadas (raíces + tronco + copa) para que `EntityCreator` las inserte en la BD.

**Formato de cada tupla:**
```python
(
    dimension_id,      # UUID de la dimensión
    x, y, z,          # Coordenadas
    tipo_id,          # UUID del tipo de partícula (madera/hojas)
    estado_id,        # UUID del estado de materia (solido)
    cantidad,         # 1.0
    temperatura,      # 18.0, 20.0, o 22.0
    energia,          # 0.0
    extraida,         # False
    agrupacion_id,    # UUID de agrupación (o None si no se creó)
    es_nucleo,        # False
    propiedades       # JSON string con metadata
)
```

## Métodos Clave

### `get_particle_type_ids()`

```python
def get_particle_type_ids(self) -> Dict[str, str]:
    return {
        'madera_id': 'madera',
        'hojas_id': 'hojas'
    }
```

**¿Qué hace?** Retorna los **nombres** (no IDs) de los tipos de partículas que necesita este builder.

**Importante:** Las claves del diccionario deben coincidir con los nombres de los parámetros esperados por `create_at_position()` (con sufijo `_id`).

**Flujo:**
1. `EntityCreator` llama a este método
2. Obtiene los nombres: `{'madera_id': 'madera', 'hojas_id': 'hojas'}`
3. Para cada nombre, busca el ID en la BD: `SELECT id FROM tipos_particulas WHERE nombre = 'madera'`
4. Pasa los IDs al builder usando `**particle_type_ids`: `madera_id=uuid1, hojas_id=uuid2`

### `get_matter_state_name()`

```python
def get_matter_state_name(self) -> str:
    return 'solido'
```

**¿Qué hace?** Retorna el **nombre** del estado de materia que necesita este builder.

**Flujo:**
1. `EntityCreator` llama a este método
2. Obtiene el nombre: `'solido'`
3. Busca el ID en la BD: `SELECT id FROM estados_materia WHERE nombre = 'solido'`
4. Pasa el ID al builder: `solido_id=uuid3`

### `create_agrupacion(conn, dimension_id, x, y, z)`

```python
async def create_agrupacion(
    self,
    conn: asyncpg.Connection,
    dimension_id: UUID,
    x: int,
    y: int,
    z: int
) -> Optional[UUID]:
    metadata = self.get_agrupacion_metadata()
    agrupacion_id = await conn.fetchval("""
        INSERT INTO juego_dioses.agrupaciones
        (dimension_id, nombre, tipo, especie, posicion_x, posicion_y, posicion_z)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
    """, dimension_id, metadata['nombre'], metadata['tipo'], 
        metadata.get('especie'), x, y, z)
    return agrupacion_id
```

**¿Qué hace?** Crea un registro de agrupación en la BD para agrupar todas las partículas de esta entidad.

**Flujo:**
1. `EntityCreator` llama a este método antes de crear partículas
2. El builder obtiene metadata: `get_agrupacion_metadata()`
3. Inserta registro en tabla `agrupaciones` con nombre, tipo, especie, posición
4. Retorna el UUID de la agrupación creada
5. Este UUID se pasa a `create_at_position()` para asignarlo a todas las partículas

**Ejemplo para TreeBuilder:**
- `nombre`: "Roble #5678" (nombre del template + número aleatorio)
- `tipo`: "arbol"
- `especie`: "roble" (nombre del template en minúsculas)
- `posicion_x, posicion_y, posicion_z`: Posición base del árbol

### `get_agrupacion_metadata()`

```python
def get_agrupacion_metadata(self) -> Dict[str, Any]:
    return {
        'nombre': f"{self.template.nombre} #{random.randint(1000, 9999)}",
        'tipo': 'arbol',
        'especie': self.template.nombre.lower()
    }
```

**¿Qué hace?** Retorna metadata para crear la agrupación (nombre, tipo, especie).

**Nota:** Cada builder puede sobrescribir este método para personalizar la metadata según su tipo de entidad.

## Ejemplo Completo: Crear un Roble

### Input

```python
template = RobleTemplate()  # Template de roble
x, y, z = 10, 20, 0         # Posición donde crear
madera_id = UUID("...")     # ID del tipo "madera"
hojas_id = UUID("...")      # ID del tipo "hojas"
solido_id = UUID("...")     # ID del estado "solido"
```

### Proceso Interno

1. **Validación**: Todos los IDs están presentes
2. **Altura aleatoria**: `altura_tronco = 23` (aleatorio entre 20-25)
3. **Raíces**: Genera ~30 posiciones bajo tierra (z=-1, z=-2, z=-3, z=-4)
4. **Tronco**: Genera 9 posiciones (x,y) × 23 niveles = 207 partículas
5. **Copa**: Genera ~150 posiciones de hojas en z=23, 24, 25, 26

### Output

```python
[
    (dim_id, 10, 20, -1, madera_id, solido_id, ...),  # Raíz
    (dim_id, 10, 20, -2, madera_id, solido_id, ...),  # Raíz
    ...
    (dim_id, 10, 20, 0, madera_id, solido_id, ...),   # Tronco base
    (dim_id, 10, 20, 1, madera_id, solido_id, ...),   # Tronco
    ...
    (dim_id, 9, 19, 23, hojas_id, solido_id, ...),    # Hoja
    (dim_id, 10, 19, 23, hojas_id, solido_id, ...),   # Hoja
    ...
]
# Total: ~387 partículas
```

## Extender el Sistema

### Agregar un Nuevo Builder

1. Crear clase que extiende `BaseBuilder`
2. Implementar `create_at_position()` con la lógica específica (aceptar `agrupacion_id` como parámetro)
3. Implementar `get_particle_type_ids()` con los tipos necesarios
4. Implementar `get_matter_state_name()` con el estado necesario
5. (Opcional) Implementar `create_agrupacion()` y `get_agrupacion_metadata()` si se desea soporte de agrupaciones
6. Actualizar `EntityCreator._get_builder()` para incluir el nuevo builder

### Ejemplo: PlantBuilder

```python
class PlantBuilder(BaseBuilder):
    def __init__(self, template: PlantTemplate):
        super().__init__(template)
        self.template: PlantTemplate = template
    
    async def create_at_position(...):
        particles = []
        # Lógica específica para plantas
        # ...
        return particles
    
    def get_particle_type_ids(self):
        return {'planta': 'hierba'}
    
    def get_matter_state_name(self):
        return 'solido'
```

## Notas Importantes

1. **Separación de responsabilidades**: El builder NO obtiene IDs, solo los recibe
2. **Templates hacen el cálculo**: El builder delega al template la generación de posiciones
3. **Tuplas para batch insert**: El builder retorna tuplas listas para `executemany()`
4. **Validación temprana**: Se valida que los IDs estén presentes antes de procesar

