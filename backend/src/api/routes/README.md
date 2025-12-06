# API Routes

Este directorio contiene todas las rutas de la API REST del backend.

## Endpoints Disponibles

### Dimensions (`dimensions.py`)
- `GET /api/v1/dimensions` - Listar dimensiones
- `GET /api/v1/dimensions/{dimension_id}` - Obtener dimensión por ID
- `POST /api/v1/dimensions` - Crear nueva dimensión

### Particles (`particles.py`)
- `GET /api/v1/dimensions/{dimension_id}/particles` - Listar partículas
- `GET /api/v1/dimensions/{dimension_id}/particles/{particle_id}` - Obtener partícula por ID

### Agrupaciones (`agrupaciones.py`)
- `GET /api/v1/dimensions/{dimension_id}/agrupaciones` - Listar agrupaciones
- `GET /api/v1/dimensions/{dimension_id}/agrupaciones/{agrupacion_id}` - Obtener agrupación por ID

### Characters (`characters.py`)
- `GET /api/v1/dimensions/{dimension_id}/characters` - Listar personajes
- `GET /api/v1/dimensions/{dimension_id}/characters/{character_id}` - Obtener personaje por ID
- `POST /api/v1/dimensions/{dimension_id}/characters` - Crear personaje desde template

## Characters API

### Listar Personajes

```http
GET /api/v1/dimensions/{dimension_id}/characters
```

**Respuesta:**
```json
[
  {
    "id": "uuid",
    "dimension_id": "uuid",
    "nombre": "Humano",
    "tipo": "biped",
    "especie": "humano",
    "posicion": {"x": 45, "y": 45, "z": 1},
    "geometria_agrupacion": {
      "tipo": "biped",
      "partes": {
        "cabeza": { ... },
        "torso": { ... },
        ...
      }
    },
    "particulas_count": 15
  }
]
```

### Obtener Personaje

```http
GET /api/v1/dimensions/{dimension_id}/characters/{character_id}
```

**Respuesta:** Mismo formato que un elemento de la lista anterior.

### Crear Personaje

```http
POST /api/v1/dimensions/{dimension_id}/characters
Content-Type: application/json

{
  "template_id": "humano",
  "x": 45,
  "y": 45,
  "z": 1
}
```

**Respuesta:** Mismo formato que obtener personaje (status 201).

**Templates disponibles:**
- `humano` - Personaje humano básico

**Errores:**
- `404` - Dimensión no encontrada
- `404` - Template no encontrado (con lista de templates disponibles)
- `400` - Coordenadas inválidas (x, y < 0)
- `500` - Error al crear personaje

## Schemas

Los schemas están definidos en `src/models/schemas.py`:

- `CharacterResponse` - Respuesta con información completa del personaje
- `CharacterCreate` - Request para crear un personaje
- `BipedGeometry` - Estructura de geometría para renderizado
- `BipedGeometryPart` - Parte individual de la geometría

