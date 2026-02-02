"""
Caso de uso: obtener un personaje por ID.

Recibe el puerto ICharacterRepository inyectado desde routes.
No conoce la implementación (Postgres, mock, etc.): solo llama al contrato.
En runtime, repository es PostgresCharacterRepository → la llamada llega a infrastructure.
"""
from uuid import UUID

from src.domains.characters.application.ports.character_repository import ICharacterRepository
from src.domains.characters.schemas import CharacterResponse


async def get_character(
    repository: ICharacterRepository,
    bloque_id: UUID,
    character_id: UUID,
) -> CharacterResponse:
    """
    Obtener personaje (bípedo) por ID.
    Lanza ValueError si no existe o no es bípedo.
    """
    # Llamada al puerto: en runtime ejecuta PostgresCharacterRepository.get_biped
    character = await repository.get_biped(bloque_id, character_id)
    if character is None:
        raise ValueError("Personaje no encontrado")
    return character

