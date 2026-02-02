"""
WorldBloque - Bloque espacial del mundo en memoria (infra compartida).
Bloque espacial del mundo en memoria (infra compartida).
"""
from typing import Set, Optional
from datetime import datetime


class WorldBloque:
    """Representa un bloque espacial del mundo en memoria (40x40x40 celdas por defecto)."""

    def __init__(
        self,
        bloque_id: str,
        bloque_x: int,
        bloque_y: int,
        bloque_z: int,
        tamano_bloque: int = 40,
    ):
        self.bloque_id = bloque_id
        self.bloque_x = bloque_x
        self.bloque_y = bloque_y
        self.bloque_z = bloque_z
        self.tamano_bloque = tamano_bloque
        self.particulas: Set[str] = set()
        self.temperatura_base = 20.0
        self.modificador_altitud = 0.0
        self.modificador_agua = 0.0
        self.modificador_albedo = 0.0
        self.ultima_actualizacion_temperatura = datetime.now()
        self.necesita_recalcular_temperatura = False
        self.eventos_activos: Set[str] = set()
        self.jugadores: Set[str] = set()
        self.needs_rerender = False

    async def calcular_temperatura(
        self,
        celestial_time_service: 'CelestialTimeService',
        tipo_particula_superficie: Optional[str] = None,
    ) -> float:
        from src.domains.celestial.service import calculate_cell_temperature
        centro_x = (self.bloque_x + 0.5) * self.tamano_bloque
        centro_y = (self.bloque_y + 0.5) * self.tamano_bloque
        centro_z = (self.bloque_z + 0.5) * self.tamano_bloque
        temperatura = await calculate_cell_temperature(
            celda_x=centro_x,
            celda_y=centro_y,
            celda_z=centro_z,
            bloque_id=self.bloque_id,
            celestial_time_service=celestial_time_service,
            tipo_particula_superficie=tipo_particula_superficie,
        )
        self.temperatura_base = temperatura
        self.ultima_actualizacion_temperatura = datetime.now()
        self.necesita_recalcular_temperatura = False
        return temperatura

    def get_temperatura(self) -> float:
        return self.temperatura_base

    def get_key(self) -> str:
        return f"{self.bloque_id}-{self.bloque_x}-{self.bloque_y}-{self.bloque_z}"

    def agregar_particula(self, particula_id: str) -> None:
        self.particulas.add(particula_id)
        self.necesita_recalcular_temperatura = True

    def remover_particula(self, particula_id: str) -> None:
        self.particulas.discard(particula_id)
        self.necesita_recalcular_temperatura = True

    def agregar_jugador(self, jugador_id: str) -> None:
        self.jugadores.add(jugador_id)

    def remover_jugador(self, jugador_id: str) -> None:
        self.jugadores.discard(jugador_id)
