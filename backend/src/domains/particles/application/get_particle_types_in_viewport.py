"""
Caso de uso: obtener tipos de partícula en un viewport.
Recibe el puerto IParticleRepository inyectado; en runtime es PostgresParticleRepository.
"""
from uuid import UUID

from src.domains.particles.application.ports.particle_repository import IParticleRepository
from src.domains.particles.schemas import ParticleTypesResponse, ParticleViewportQuery


async def get_particle_types_in_viewport(
    repository: IParticleRepository,
    bloque_id: UUID,
    viewport: ParticleViewportQuery,
) -> ParticleTypesResponse:
    """
    Obtener tipos de partícula presentes en el viewport.
    Lanza ValueError si el bloque no existe.
    """
    viewport.validate_ranges()
    exists = await repository.bloque_exists(bloque_id)
    if not exists:
        raise ValueError("Bloque no encontrado")
    # get_types_in_viewport en runtime es PostgresParticleRepository.get_types_in_viewport
    types_list = await repository.get_types_in_viewport(bloque_id, viewport)
    return ParticleTypesResponse(types=types_list)

