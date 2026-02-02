"""
Caso de uso: obtener partículas por viewport.
Recibe el puerto IParticleRepository inyectado; en runtime es PostgresParticleRepository.
"""
from uuid import UUID

from src.domains.particles.application.ports.particle_repository import IParticleRepository
from src.domains.particles.schemas import ParticlesResponse, ParticleViewportQuery


async def get_particles_by_viewport(
    repository: IParticleRepository,
    bloque_id: UUID,
    viewport: ParticleViewportQuery,
) -> ParticlesResponse:
    """
    Obtener partículas en el viewport y total.
    Lanza ValueError si el bloque no existe.
    """
    viewport.validate_ranges()
    exists = await repository.bloque_exists(bloque_id)
    if not exists:
        raise ValueError("Bloque no encontrado")
    # get_by_viewport y count_by_viewport en runtime son PostgresParticleRepository
    particles = await repository.get_by_viewport(bloque_id, viewport)
    total = await repository.count_by_viewport(bloque_id, viewport)
    return ParticlesResponse(
        bloque_id=bloque_id,
        particles=particles,
        total=total,
        viewport=viewport,
    )
