"""
Caso de uso: listar todos los bloques.
Recibe el puerto IBloqueRepository inyectado; en runtime es PostgresBloqueRepository.
"""
import math
from typing import List

from src.domains.bloques.application.ports.bloque_repository import IBloqueRepository
from src.domains.bloques.schemas import DimensionResponse


async def get_bloques(repository: IBloqueRepository) -> List[DimensionResponse]:
    """Listar todos los bloques. list_all en runtime es PostgresBloqueRepository.list_all."""
    return await repository.list_all()
