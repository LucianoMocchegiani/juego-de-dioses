# Módulo Models

Este módulo contiene los modelos Pydantic para validación y serialización de datos en las APIs.

## Estructura

```
models/
├── __init__.py
├── schemas.py          # Todos los schemas Pydantic
└── README.md          # Este archivo
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

