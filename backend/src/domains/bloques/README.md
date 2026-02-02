# Dominio Bloques

DTOs y rutas del recurso **bloques** (dimensiones/mundos). Tabla BD: `juego_dioses.bloques`. Endpoints: `GET /api/v1/bloques`, `GET /api/v1/bloques/{id}`, `GET /api/v1/bloques/world/size`.

Schemas: modelos de entidad `BloqueBase`, `BloqueCreate`, `Bloque`; DTOs de API `DimensionBase`, `DimensionCreate`, `DimensionResponse`, `WorldSizeResponse`. Consultas de terreno: `terrain_utils.py` (`get_terrain_height`, `get_terrain_height_area`). Imports: `from src.domains.bloques import ...`
