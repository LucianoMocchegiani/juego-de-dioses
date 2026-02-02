"""
Adaptador que implementa ITemperatureCalculator delegando en celestial.service.
Permite inyectar el calculador en WorldBloque sin que shared dependa de particles.
"""
from typing import Optional

from src.domains.celestial.service import calculate_cell_temperature
from src.domains.particles.application.ports.particle_repository import IParticleRepository


class CelestialTemperatureCalculatorAdapter:
    """Implementa ITemperatureCalculator (shared.ports) usando celestial.service + IParticleRepository."""

    def __init__(self, particle_repo: IParticleRepository):
        """Guarda el puerto IParticleRepository para usarlo en calculate_cell_temperature."""
        self._particle_repo = particle_repo

    async def calculate_cell_temperature(
        self,
        celda_x: float,
        celda_y: float,
        celda_z: float,
        bloque_id: str,
        celestial_time_service: object,
        tipo_particula_superficie: Optional[str] = None,
    ) -> float:
        """Delega en celestial.service.calculate_cell_temperature con el particle_repo inyectado."""
        return await calculate_cell_temperature(
            celda_x=celda_x,
            celda_y=celda_y,
            celda_z=celda_z,
            bloque_id=bloque_id,
            celestial_time_service=celestial_time_service,
            particle_repo=self._particle_repo,
            tipo_particula_superficie=tipo_particula_superficie,
        )
