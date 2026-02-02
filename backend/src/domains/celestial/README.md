# Dominio Celestial

DTOs y rutas de **tiempo celestial** y **temperatura ambiental**. Endpoints: `GET /api/v1/celestial/state`, `POST /api/v1/celestial/temperature`.

## Estructura Hexagonal + DDD

- **domain/** — (opcional) Entidades de dominio en el futuro.
- **application/** — Casos de uso: `get_celestial_state`, `calculate_temperature_use_case` (usan `CelestialTimeService` inyectado vía Depends).
- **routes.py** — GET/POST y **tarea en background** de temperatura usan casos de uso y `IParticleRepository` (sin `get_connection` en routes). La tarea usa `PostgresParticleRepository` para bloques, partículas con inercia y actualización de temperatura.
- **service.py** — Lógica de tiempo celestial y temperatura. `calculate_cell_temperature` recibe `IParticleRepository` inyectado (get_particles_near, get_particle_type_by_name); ya no usa particles.service. **temperature_calculator_adapter.py** — Adaptador que implementa `ITemperatureCalculator` (shared) para WorldBloque.

Imports: `from src.domains.celestial import ...`
