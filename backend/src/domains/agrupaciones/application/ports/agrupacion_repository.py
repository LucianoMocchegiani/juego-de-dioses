"""
Puerto de salida (interfaz) para persistencia de agrupaciones.
El caso de uso depende de esta interfaz; la implementa PostgresAgrupacionRepository.
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from src.domains.agrupaciones.schemas import AgrupacionResponse, AgrupacionWithParticles


class IAgrupacionRepository(ABC):
    @abstractmethod
    async def bloque_exists(self, bloque_id: UUID) -> bool:
        """Indica si existe un bloque con el ID dado (juego_dioses.bloques)."""
        pass

    @abstractmethod
    async def list_by_bloque(self, bloque_id: UUID) -> List[AgrupacionResponse]:
        """Devuelve todas las agrupaciones del bloque con particulas_count; orden por creado_en DESC."""
        pass

    @abstractmethod
    async def get_with_particles(
        self, bloque_id: UUID, agrupacion_id: UUID
    ) -> Optional[AgrupacionWithParticles]:
        """Devuelve agrupación por ID con lista de partículas no extraídas, o None si no existe."""
        pass
