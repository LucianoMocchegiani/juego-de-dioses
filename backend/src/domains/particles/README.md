# Dominio Particles

DTOs y rutas de **partículas** y **tipos de partículas**. Endpoints: `GET /api/v1/bloques/{id}/particles`, `GET /api/v1/bloques/{id}/particle-types`, `GET /api/v1/bloques/{id}/particles/{pid}`. Usa `parse_jsonb_field` desde `shared`.

Schemas en `schemas.py`: DTOs de API (ParticleBase, ParticleResponse, …) y modelos de entidad (TipoParticulaCreate, ParticulaCreate, TransicionParticulaCreate, etc.). Los modelos de bloque (BloqueBase, BloqueCreate, Bloque) están en `src.domains.bloques`. Imports: `from src.domains.particles import ...`
