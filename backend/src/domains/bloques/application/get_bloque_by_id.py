"""
Caso de uso: obtener un bloque por ID.
Recibe el puerto IBloqueRepository inyectado; en runtime es PostgresBloqueRepository.
"""
from uuid import UUID

from src.domains.bloques.application.ports.bloque_repository import IBloqueRepository
from src.domains.bloques.schemas import DimensionResponse


async def get_bloque_by_id(
    repository: IBloqueRepository,
    bloque_id: UUID,
) -> DimensionResponse:
    """
    Obtener un bloque por ID.
    Lanza ValueError si no existe.
    """
    # get_by_id en runtime es PostgresBloqueRepository.get_by_id
    bloque = await repository.get_by_id(bloque_id)
    if bloque is None:
        raise ValueError("Bloque no encontrado")
    return bloque
