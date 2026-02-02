"""
Caso de uso: obtener una agrupación con sus partículas.
Recibe el puerto IAgrupacionRepository inyectado; en runtime es PostgresAgrupacionRepository.
"""
from uuid import UUID

from src.domains.agrupaciones.application.ports.agrupacion_repository import IAgrupacionRepository
from src.domains.agrupaciones.schemas import AgrupacionWithParticles


async def get_agrupacion_with_particles(
    repository: IAgrupacionRepository,
    bloque_id: UUID,
    agrupacion_id: UUID,
) -> AgrupacionWithParticles:
    """
    Obtener agrupación por ID con lista de partículas.
    Lanza ValueError si no existe.
    """
    # get_with_particles en runtime es PostgresAgrupacionRepository.get_with_particles
    result = await repository.get_with_particles(bloque_id, agrupacion_id)
    if result is None:
        raise ValueError("Agrupación no encontrada")
    return result

