"""
Caso de uso: obtener una partícula por ID.
Recibe el puerto IParticleRepository inyectado; en runtime es PostgresParticleRepository.
"""
from uuid import UUID

from src.domains.particles.application.ports.particle_repository import IParticleRepository
from src.domains.particles.schemas import ParticleResponse


async def get_particle_by_id(
    repository: IParticleRepository,
    bloque_id: UUID,
    particle_id: UUID,
) -> ParticleResponse:
    """
    Obtener una partícula por ID dentro de un bloque.
    Lanza ValueError si no existe.
    """
    # get_by_id en runtime es PostgresParticleRepository.get_by_id
    particle = await repository.get_by_id(bloque_id, particle_id)
    if particle is None:
        raise ValueError("Partícula no encontrada")
    return particle
