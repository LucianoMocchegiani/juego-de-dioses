"""
Puerto para calcular temperatura en una celda (Hexagonal).
WorldBloque puede depender de esta interfaz en lugar de celestial.service directamente.
"""
from typing import Optional, Protocol


class ITemperatureCalculator(Protocol):
    """Calcula la temperatura ambiental en una posición (celda)."""

    async def calculate_cell_temperature(
        self,
        celda_x: float,
        celda_y: float,
        celda_z: float,
        bloque_id: str,
        celestial_time_service: object,
        tipo_particula_superficie: Optional[str] = None,
    ) -> float:
        """Devuelve la temperatura en °C para la celda indicada."""
        ...
