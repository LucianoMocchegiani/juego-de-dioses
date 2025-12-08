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
- `GET /api/v1/dimensions/{dimension_id}/characters/{character_id}/model` - Obtener URL y metadatos del modelo 3D
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
    "modelo_3d": {
      "tipo": "glb",
      "ruta": "characters/humano.glb",
      "escala": 1.0,
      "offset": {"x": 0, "y": 0, "z": 0},
      "rotacion": {"x": 0, "y": 0, "z": 0}
    },
    "particulas_count": 0
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

### Obtener Modelo 3D

```http
GET /api/v1/dimensions/{dimension_id}/characters/{character_id}/model
```

**Respuesta:**
```json
{
  "model_url": "/static/models/characters/humano.glb",
  "metadata": {
    "tipo": "glb",
    "ruta": "characters/humano.glb",
    "escala": 1.0,
    "offset": {"x": 0, "y": 0, "z": 0},
    "rotacion": {"x": 0, "y": 0, "z": 0}
  }
}
```

**Errores:**
- `404` - Dimensión no encontrada
- `404` - Personaje no encontrado
- `404` - Personaje no tiene modelo 3D
- `400` - Error parseando modelo_3d

**Templates disponibles:**
- `humano` - Personaje humano básico

**Errores (crear personaje):**
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
- `Model3D` - Modelo 3D asociado a un personaje
- `Model3DOffset` - Offset del modelo 3D en metros
- `Model3DRotation` - Rotación del modelo 3D en grados

## Modelos 3D

Los personajes pueden tener modelos 3D asociados (GLTF/GLB) que se almacenan en `backend/static/models/` y se sirven como archivos estáticos en `/static/models/{ruta}`.

El campo `modelo_3d` en `CharacterResponse` es opcional. Si está presente, el frontend debe cargar el modelo desde la URL proporcionada. Si no está presente, se usa `geometria_agrupacion` como fallback.

**Prioridad de renderizado:**
1. `modelo_3d` (si existe)
2. `geometria_agrupacion` (si existe)
3. Mesh por defecto (fallback)

