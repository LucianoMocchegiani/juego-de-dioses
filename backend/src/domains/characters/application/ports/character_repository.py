"""
Puerto de salida (interfaz) para persistencia de personajes.

El caso de uso depende de esta interfaz, no de Postgres ni de ningún adaptador.
Quien implementa este contrato es infrastructure/postgres_character_repository.py
(PostgresCharacterRepository). Así se puede cambiar BD o usar mocks sin tocar application.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from uuid import UUID

from src.domains.characters.schemas import CharacterResponse


class ICharacterRepository(ABC):
    @abstractmethod
    async def bloque_exists(self, bloque_id: UUID) -> bool:
        """Indica si existe un bloque con el ID dado (tabla juego_dioses.bloques)."""
        pass

    @abstractmethod
    async def list_bipeds(self, bloque_id: UUID) -> List[CharacterResponse]:
        """Devuelve todos los personajes (agrupaciones tipo biped) del bloque, ordenados por creado_en DESC."""
        pass

    @abstractmethod
    async def get_biped(
        self, bloque_id: UUID, character_id: UUID
    ) -> Optional[CharacterResponse]:
        """Devuelve un personaje por bloque_id y character_id, o None si no existe o no es biped."""
        pass

    @abstractmethod
    async def get_model_metadata(
        self, bloque_id: UUID, character_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """
        Devuelve dict con 'model_url' y 'metadata' (dict del Model3D) o None si no existe/sin modelo.
        """
        pass
