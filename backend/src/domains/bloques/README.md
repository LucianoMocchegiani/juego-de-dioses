# Dominio Bloques

DTOs y rutas del recurso **bloques** (dimensiones/mundos). Endpoints: `GET /api/v1/bloques`, `GET /api/v1/bloques/{id}`, `GET /api/v1/bloques/world/size`.

## Estructura Hexagonal + DDD

- **domain/** — (opcional) Entidades de dominio en el futuro.
- **application/ports/** — Puerto de salida: `IBloqueRepository` (list_all, get_by_id, get_world_size_rows).
- **application/** — Casos de uso: `get_bloques`, `get_bloque_by_id`, `get_world_size`.
- **infrastructure/** — Adaptador: `PostgresBloqueRepository` (usa `get_connection()` y SQL).
- **schemas.py** — DTOs: `DimensionResponse`, `WorldSizeResponse`.
- **routes.py** — Adaptador de entrada HTTP: solo traduce HTTP ↔ casos de uso; usa `Depends(get_bloque_repository)`.

Consultas de terreno: `terrain_utils.py` (`get_terrain_height`, `get_terrain_height_area`) — reciben `conn`; no forman parte del puerto de bloques.

Imports: `from src.domains.bloques import ...`
