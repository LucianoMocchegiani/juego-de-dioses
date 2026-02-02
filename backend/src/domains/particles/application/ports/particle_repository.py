"""
Puerto de salida (interfaz) para persistencia de partículas.
El caso de uso depende de esta interfaz; la implementa PostgresParticleRepository.
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from src.domains.particles.schemas import (
    ParticleResponse,
    ParticleTypeResponse,
    ParticleViewportQuery,
)


class IParticleRepository(ABC):
    @abstractmethod
    async def bloque_exists(self, bloque_id: UUID) -> bool:
        """Indica si existe un bloque con el ID dado (juego_dioses.bloques)."""
        pass

    @abstractmethod
    async def get_types_in_viewport(
        self, bloque_id: UUID, viewport: ParticleViewportQuery
    ) -> List[ParticleTypeResponse]:
        """Tipos de partícula distintos en el viewport (tipos_particulas por IDs de partículas en rango)."""
        pass

    @abstractmethod
    async def get_by_viewport(
        self, bloque_id: UUID, viewport: ParticleViewportQuery
    ) -> List[ParticleResponse]:
        """Partículas no extraídas en el viewport; orden por celda_z, celda_y, celda_x."""
        pass

    @abstractmethod
    async def count_by_viewport(
        self, bloque_id: UUID, viewport: ParticleViewportQuery
    ) -> int:
        """Número total de partículas no extraídas en el viewport."""
        pass

    @abstractmethod
    async def get_by_id(
        self, bloque_id: UUID, particle_id: UUID
    ) -> Optional[ParticleResponse]:
        """Partícula por bloque_id y particle_id; None si no existe."""
        pass

    @abstractmethod
    async def get_distinct_bloque_ids_for_temperature_update(self) -> List[str]:
        """IDs de bloques que tienen partículas no extraídas (para tarea de temperatura)."""
        pass

    @abstractmethod
    async def get_particles_with_thermal_inertia(
        self, bloque_id: str, inercia_minima: float = 0.1
    ) -> List[dict]:
        """Partículas del bloque con inercia térmica > inercia_minima (id, celda_*, temperatura, inercia_termica)."""
        pass

    @abstractmethod
    async def update_particle_temperature(
        self, particula_id: str, temperatura: float
    ) -> None:
        """Actualiza la temperatura de una partícula por ID."""
        pass

    @abstractmethod
    async def get_particles_near(
        self,
        bloque_id: str,
        celda_x: float,
        celda_y: float,
        celda_z: float,
        radio: int = 1,
    ) -> List[dict]:
        """Partículas en radio de (celda_x, celda_y, celda_z). Dicts con tipo_nombre, temperatura, celda_x, celda_y, celda_z, etc."""
        pass

    @abstractmethod
    async def get_particle_type_by_name(self, nombre: str) -> Optional[dict]:
        """Fila del tipo de partícula por nombre (conductividad_termica, albedo, etc.) o None."""
        pass
