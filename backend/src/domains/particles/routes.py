"""
Puerta de entrada HTTP para Partículas.

Flujo (Arquitectura Hexagonal):
  routes → casos de uso (get_particle_by_id, get_particles_by_viewport, get_particle_types_in_viewport) → puerto IParticleRepository → PostgresParticleRepository.
No usa get_connection ni SQL; solo inyecta el adaptador y delega.
"""
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from src.domains.particles.application.get_particle_types_in_viewport import get_particle_types_in_viewport
from src.domains.particles.application.get_particles_by_viewport import get_particles_by_viewport
from src.domains.particles.application.get_particle_by_id import get_particle_by_id
from src.domains.particles.application.ports.particle_repository import IParticleRepository
from src.domains.particles.infrastructure.postgres_particle_repository import PostgresParticleRepository
from src.domains.particles.schemas import (
    ParticleResponse,
    ParticleTypesResponse,
    ParticlesResponse,
    ParticleViewportQuery,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bloques", tags=["particles"])


def get_particle_repository() -> IParticleRepository:
    """Factory para inyección de dependencias: devuelve el adaptador concreto (Postgres)."""
    return PostgresParticleRepository()


def _handle_value_error(e: ValueError) -> None:
    """Convierte ValueError del caso de uso en HTTP 404 (no encontrado) o 400 (validación)."""
    if "no encontrado" in str(e).lower():
        raise HTTPException(status_code=404, detail=str(e))
    raise HTTPException(status_code=400, detail=str(e))


@router.get("/{bloque_id}/particle-types", response_model=ParticleTypesResponse)
async def get_particle_types_in_viewport_route(
    bloque_id: UUID,
    x_min: int = Query(..., ge=0),
    x_max: int = Query(..., ge=0),
    y_min: int = Query(..., ge=0),
    y_max: int = Query(..., ge=0),
    z_min: int = Query(-10),
    z_max: int = Query(10),
    repository: IParticleRepository = Depends(get_particle_repository),
):
    """GET /bloques/{bloque_id}/particle-types — Tipos de partícula presentes en el viewport (x_min..x_max, y_min..y_max, z_min..z_max)."""
    viewport = ParticleViewportQuery(
        x_min=x_min, x_max=x_max, y_min=y_min, y_max=y_max, z_min=z_min, z_max=z_max
    )
    try:
        return await get_particle_types_in_viewport(repository, bloque_id, viewport)
    except ValueError as e:
        _handle_value_error(e)


@router.get("/{bloque_id}/particles", response_model=ParticlesResponse)
async def get_particles_by_viewport_route(
    bloque_id: UUID,
    x_min: int = Query(..., ge=0),
    x_max: int = Query(..., ge=0),
    y_min: int = Query(..., ge=0),
    y_max: int = Query(..., ge=0),
    z_min: int = Query(-10),
    z_max: int = Query(10),
    repository: IParticleRepository = Depends(get_particle_repository),
):
    """GET /bloques/{bloque_id}/particles — Partículas en el viewport y total; query params x_min, x_max, y_min, y_max, z_min, z_max."""
    viewport = ParticleViewportQuery(
        x_min=x_min, x_max=x_max, y_min=y_min, y_max=y_max, z_min=z_min, z_max=z_max
    )
    try:
        return await get_particles_by_viewport(repository, bloque_id, viewport)
    except ValueError as e:
        _handle_value_error(e)


@router.get("/{bloque_id}/particles/{particle_id}", response_model=ParticleResponse)
async def get_particle_route(
    bloque_id: UUID,
    particle_id: UUID,
    repository: IParticleRepository = Depends(get_particle_repository),
):
    """GET /bloques/{bloque_id}/particles/{particle_id} — Una partícula por ID."""
    try:
        return await get_particle_by_id(repository, bloque_id, particle_id)
    except ValueError as e:
        _handle_value_error(e)
