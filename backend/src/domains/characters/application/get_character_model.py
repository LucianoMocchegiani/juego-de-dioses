"""
Caso de uso: obtener URL y metadata del modelo 3D de un personaje.
"""
from typing import Any, Dict
from uuid import UUID

from src.domains.characters.application.ports.character_repository import ICharacterRepository


async def get_character_model(
    repository: ICharacterRepository,
    bloque_id: UUID,
    character_id: UUID,
) -> Dict[str, Any]:
    """
    Obtener model_url y metadata del modelo 3D del personaje.
    Lanza ValueError si no existe, no tiene modelo o el modelo no es válido.
    """
    exists = await repository.bloque_exists(bloque_id)
    if not exists:
        raise ValueError("Bloque no encontrado")
    # get_model_metadata en runtime es PostgresCharacterRepository.get_model_metadata
    result = await repository.get_model_metadata(bloque_id, character_id)
    if result is None:
        raise ValueError("Personaje no encontrado o no tiene modelo 3D válido")
    return result

