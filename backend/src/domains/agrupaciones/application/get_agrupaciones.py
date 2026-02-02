"""
Caso de uso: listar agrupaciones de un bloque.
"""
from typing import List
from uuid import UUID

from src.domains.agrupaciones.application.ports.agrupacion_repository import IAgrupacionRepository
from src.domains.agrupaciones.schemas import AgrupacionResponse


async def get_agrupaciones(
    repository: IAgrupacionRepository,
    bloque_id: UUID,
) -> List[AgrupacionResponse]:
    """
    Listar agrupaciones del bloque.
    Lanza ValueError si el bloque no existe.
    """
    exists = await repository.bloque_exists(bloque_id)
    if not exists:
        raise ValueError("Bloque no encontrado")
    # list_by_bloque en runtime es PostgresAgrupacionRepository.list_by_bloque
    return await repository.list_by_bloque(bloque_id)

