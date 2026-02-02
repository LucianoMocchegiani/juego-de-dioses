# Dominio Particles

DTOs y rutas de **partículas** y **tipos de partículas**. Endpoints: `GET /api/v1/bloques/{id}/particles`, `GET /api/v1/bloques/{id}/particle-types`, `GET /api/v1/bloques/{id}/particles/{pid}`.

## Estructura Hexagonal + DDD

- **domain/** — (opcional) Entidades de dominio en el futuro.
- **application/ports/** — Puerto de salida: `IParticleRepository` (bloque_exists, get_types_in_viewport, get_by_viewport, count_by_viewport, get_by_id; get_distinct_bloque_ids_for_temperature_update, get_particles_with_thermal_inertia, update_particle_temperature para tarea celestial).
- **application/** — Casos de uso: `get_particle_types_in_viewport`, `get_particles_by_viewport`, `get_particle_by_id`.
- **infrastructure/** — Adaptador: `PostgresParticleRepository` (usa `get_connection()` y SQL).
- **schemas.py** — DTOs: `ParticleResponse`, `ParticleTypeResponse`, `ParticleViewportQuery`, etc.
- **routes.py** — Adaptador de entrada HTTP: solo traduce HTTP ↔ casos de uso; usa `Depends(get_particle_repository)`.

`service.py` sigue existiendo con el resto de funciones (get_particula, get_particulas_vecinas, get_tipo_particula, etc.); la tarea de temperatura celestial usa `IParticleRepository`.

Imports: `from src.domains.particles import ...`
