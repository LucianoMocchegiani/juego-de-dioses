"""
Caso de uso: listar personajes (bípedos) de un bloque.
"""
from typing import List
from uuid import UUID

from src.domains.characters.application.ports.character_repository import ICharacterRepository
from src.domains.characters.schemas import CharacterResponse


async def list_characters(
    repository: ICharacterRepository,
    bloque_id: UUID,
) -> List[CharacterResponse]:
    """
    Listar personajes (bípedos) del bloque.
    Lanza ValueError si el bloque no existe.
    """
    exists = await repository.bloque_exists(bloque_id)
    if not exists:
        raise ValueError("Bloque no encontrado")
    # list_bipeds en runtime es PostgresCharacterRepository.list_bipeds
    return await repository.list_bipeds(bloque_id)

