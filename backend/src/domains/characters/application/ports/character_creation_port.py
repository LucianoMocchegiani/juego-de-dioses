"""
Puerto de salida para creación de personajes (Hexagonal).
Encapsula la lógica de EntityCreator; el adaptador usa get_connection() internamente.
"""
from abc import ABC, abstractmethod
from uuid import UUID

from src.domains.characters.schemas import CharacterCreate, CharacterResponse


class ICharacterCreationPort(ABC):
    """Crea un personaje (bípedo) en un bloque."""

    @abstractmethod
    async def create_character(
        self,
        character_data: CharacterCreate,
        bloque_id: UUID,
    ) -> CharacterResponse:
        """
        Crea el personaje y devuelve el CharacterResponse.
        Lanza ValueError para validaciones; otras excepciones para errores de infra.
        """
        pass
