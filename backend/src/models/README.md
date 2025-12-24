# Módulo Models

Este módulo contiene los modelos Pydantic para validación y serialización de datos en las APIs.

## Estructura

```
models/
├── __init__.py
├── schemas.py              # Schemas Pydantic existentes (estilos, dimensiones, partículas, agrupaciones)
├── particula_schemas.py    # Nuevos schemas del sistema de partículas (JDG-038)
└── README.md              # Este archivo
```

## Componentes Principales

### Estilos de Partículas

- **`MaterialProperties`**: Propiedades de material (metalness, roughness, emissive)
- **`GeometriaParametros`**: Parámetros de geometría (relativos a `tamano_celda`)
- **`GeometriaVisual`**: Definición completa de geometría (tipo + parámetros)
- **`VisualProperties`**: Propiedades visuales extendidas (modelo, escala, geometría)
- **`EstilosParticula`**: Modelo completo de estilos (color, material, visual)

### Dimensiones

- **`DimensionBase`**: Campos base de una dimensión
- **`DimensionCreate`**: Schema para crear dimensión
- **`DimensionResponse`**: Schema de respuesta para dimensión

### Partículas

- **`ParticleBase`**: Campos base de una partícula
- **`ParticleResponse`**: Schema de respuesta para partícula
- **`ParticleViewportQuery`**: Query params para obtener partículas por viewport
- **`ParticlesResponse`**: Response con lista de partículas

### Agrupaciones

- **`AgrupacionBase`**: Campos base de una agrupación
- **`AgrupacionResponse`**: Schema de respuesta para agrupación
- **`AgrupacionWithParticles`**: Agrupación con sus partículas
- **`GeometriaParte`**: Geometría de una parte de una agrupación
- **`GeometriaAgrupacion`**: Geometría completa de una agrupación

### Tipos de Partículas

- **`TipoParticulaResponse`**: Schema básico de tipo de partícula
- **`ParticleTypeResponse`**: Tipo de partícula con estilos
- **`ParticleTypesResponse`**: Response con lista de tipos

### Estados de Materia

- **`EstadoMateriaResponse`**: Schema de respuesta para estado de materia

## Nuevos Modelos del Sistema de Partículas (JDG-038)

### Tipos de Partículas

- **`TipoParticulaBase`**: Modelo base con todas las propiedades físicas
- **`TipoParticulaCreate`**: Schema para crear un nuevo tipo de partícula
- **`TipoParticula`**: Modelo completo (con ID y timestamps)

**Características**:
- Validación de `tipo_fisico` (solido, liquido, gas, energia)
- Validación de propiedades específicas según el tipo físico
- Campos: `inercia_termica`, `conductividad_electrica`, `magnetismo`
- Propiedades condicionales según tipo (dureza para sólidos, viscosidad para líquidos, etc.)

**Ejemplo**:
```python
from src.models import TipoParticulaCreate

tipo_madera = TipoParticulaCreate(
    nombre="madera",
    tipo_fisico="solido",
    densidad=Decimal("0.6"),
    conductividad_termica=Decimal("0.1"),
    inercia_termica=Decimal("2.0"),
    dureza=Decimal("3.0"),
    fragilidad=Decimal("4.0"),
    punto_fusion=Decimal("300.0")
)
```

### Partículas

- **`ParticulaBase`**: Modelo base con posición y propiedades dinámicas
- **`ParticulaCreate`**: Schema para crear una nueva partícula
- **`Particula`**: Modelo completo (con ID y timestamps)

**Características**:
- Campos dinámicos: `temperatura`, `integridad`, `carga_electrica`
- Referencias: `bloque_id`, `tipo_particula_id`, `estado_materia_id`
- Soporte para agrupaciones: `agrupacion_id`, `es_nucleo`

**Ejemplo**:
```python
from src.models import ParticulaCreate

particula = ParticulaCreate(
    bloque_id="bloque-uuid",
    celda_x=100,
    celda_y=200,
    celda_z=50,
    tipo_particula_id="tipo-madera-uuid",
    estado_materia_id="estado-solido-uuid",
    temperatura=Decimal("20.0"),
    integridad=Decimal("1.0"),
    carga_electrica=Decimal("0.0")
)
```

### Bloques

- **`BloqueBase`**: Modelo base con configuración del mundo
- **`BloqueCreate`**: Schema para crear un nuevo bloque
- **`Bloque`**: Modelo completo (con ID y timestamp)

**Características**:
- Configuración de límites del mundo (ancho, alto, profundidad, altura)
- Tamaño de celda y posición del origen
- **`tamano_bloque`**: Tamaño de bloque espacial (40x40x40 celdas por defecto)

**Ejemplo**:
```python
from src.models import BloqueCreate

bloque = BloqueCreate(
    nombre="Mundo Principal",
    ancho_metros=Decimal("1000.0"),
    alto_metros=Decimal("1000.0"),
    profundidad_maxima=-100,
    altura_maxima=100,
    tamano_celda=Decimal("0.25"),
    tamano_bloque=40
)
```

### Transiciones de Partículas

- **`TransicionParticulaBase`**: Modelo base con condiciones de transición
- **`TransicionParticulaCreate`**: Schema para crear una nueva transición
- **`TransicionParticula`**: Modelo completo (con ID y timestamp)

**Características**:
- Condiciones de temperatura: `condicion_temperatura`, `valor_temperatura`
- Condiciones de integridad: `condicion_integridad`, `valor_integridad`
- Prioridad y histeresis para evitar oscilaciones
- Soporte para transiciones reversibles

**Ejemplo**:
```python
from src.models import TransicionParticulaCreate

transicion = TransicionParticulaCreate(
    tipo_origen_id="tipo-agua-uuid",
    tipo_destino_id="tipo-hielo-uuid",
    condicion_temperatura="menor",
    valor_temperatura=Decimal("0.0"),
    histeresis=Decimal("2.0"),
    prioridad=10,
    reversible=True
)
```

## Validaciones Importantes

### Validación de Propiedades por Tipo Físico

Los modelos de `TipoParticula` validan que las propiedades específicas solo se usen con el tipo físico correcto:

- **Sólidos**: `dureza`, `fragilidad`, `elasticidad`, `punto_fusion`
- **Líquidos**: `viscosidad`, `punto_ebullicion`
- **Gases/Energía**: `propagacion`

Si intentas usar propiedades de sólidos con `tipo_fisico='liquido'`, se lanzará un `ValueError`.

### Validación de Condiciones en Transiciones

Las transiciones validan que las condiciones estén completas:
- Si `condicion_temperatura` está presente, `valor_temperatura` también debe estarlo
- Si `condicion_integridad` está presente, `valor_integridad` también debe estarlo

## Conceptos Importantes

### Parámetros de Geometría

**IMPORTANTE:** Los parámetros en `GeometriaParametros` son **relativos a `tamano_celda`** de la dimensión, NO son tamaños absolutos.

**Fórmula:**
```
Tamaño absoluto = parámetro × tamano_celda × escala
```

**Ejemplo:**
- `tamano_celda` = 0.25m (default)
- `width: 1.0` → Tamaño absoluto = 1.0 × 0.25m = **0.25m**
- `width: 2.0` → Tamaño absoluto = 2.0 × 0.25m = **0.5m** (el doble)

**Parámetros que NO se escalan:**
- `segments`: Número de divisiones para suavizado (no es una dimensión física)

### Tipos de Geometría Soportados

- **`box`**: Caja rectangular (width, height, depth)
- **`sphere`**: Esfera (radius, segments)
- **`cylinder`**: Cilindro (radiusTop, radiusBottom, height, segments)
- **`cone`**: Cono (radius, height, segments)
- **`torus`**: Toro (radius, tube, segments)
- **`custom`**: Geometría personalizada (futuro)

## Uso

### Validar Estilos de Partícula

```python
from src.models.schemas import EstilosParticula

estilos = EstilosParticula(
    color_hex="#8B4513",
    material={"metalness": 0.1, "roughness": 0.8},
    visual={
        "geometria": {
            "tipo": "cylinder",
            "parametros": {
                "radiusTop": 0.4,
                "radiusBottom": 0.5,
                "height": 1.0
            }
        }
    }
)
```

### Validar Geometría de Agrupación

```python
from src.models.schemas import GeometriaAgrupacion, GeometriaParte, GeometriaVisual

geometria = GeometriaAgrupacion(
    tipo="arbol",
    partes={
        "tronco": GeometriaParte(
            geometria=GeometriaVisual(
                tipo="cylinder",
                parametros={"radiusTop": 0.3, "radiusBottom": 0.5, "height": 10.0}
            )
        ),
        "copa": GeometriaParte(
            geometria=GeometriaVisual(
                tipo="sphere",
                parametros={"radius": 3.0}
            )
        )
    }
)
```

## Referencias

- Ver `backend/src/database/README.md` para información sobre cómo se usan estos schemas en la base de datos
- Ver `backend/src/api/README.md` para información sobre cómo se usan en los endpoints

