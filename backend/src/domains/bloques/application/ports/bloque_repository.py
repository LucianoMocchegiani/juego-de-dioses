"""
Puerto de salida para persistencia de bloques (Hexagonal).
El núcleo (casos de uso) depende de esta interfaz, no de PostgreSQL.
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from src.domains.bloques.schemas import DimensionResponse


class IBloqueRepository(ABC):
    @abstractmethod
    async def list_all(self) -> List[DimensionResponse]:
        """Listar todos los bloques."""
        pass

    @abstractmethod
    async def get_by_id(self, bloque_id: UUID) -> Optional[DimensionResponse]:
        """Obtener un bloque por ID. None si no existe."""
        pass

    @abstractmethod
    async def get_world_size_rows(self) -> List[dict]:
        """
        Filas para calcular tamaño del mundo: origen_x, origen_y, ancho_metros, alto_metros.
        Lista vacía si no hay bloques.
        """
        pass

    @abstractmethod
    async def get_config(self, bloque_id: str) -> Optional[dict]:
        """
        Devuelve la fila del bloque como dict (todas las columnas) o None si no existe.
        Usado por WorldBloqueManager (shared) para cache de configuración.
        """
        pass
