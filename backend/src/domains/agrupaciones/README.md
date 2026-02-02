# Dominio Agrupaciones

DTOs y rutas de **agrupaciones**. Endpoints: `GET /api/v1/bloques/{id}/agrupaciones`, `GET /api/v1/bloques/{id}/agrupaciones/{aid}`.

## Estructura Hexagonal + DDD

- **domain/** — (opcional) Entidades de dominio en el futuro.
- **application/ports/** — Puerto de salida: `IAgrupacionRepository` (bloque_exists, list_by_bloque, get_with_particles).
- **application/** — Casos de uso: `get_agrupaciones`, `get_agrupacion_with_particles`.
- **infrastructure/** — Adaptador: `PostgresAgrupacionRepository` (usa `get_connection()` y SQL).
- **schemas.py** — DTOs: `AgrupacionResponse`, `AgrupacionWithParticles`. Usa `ParticleResponse` desde `domains/particles/schemas`.
- **routes.py** — Adaptador de entrada HTTP: solo traduce HTTP ↔ casos de uso; usa `Depends(get_agrupacion_repository)`.

Imports: `from src.domains.agrupaciones import ...`
