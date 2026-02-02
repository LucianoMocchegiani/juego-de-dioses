"""
Caso de uso: calcular temperatura ambiental en una posición.
Recibe CelestialTimeService y IParticleRepository inyectados; delega en celestial.service.calculate_cell_temperature.
"""
from uuid import UUID

from src.domains.celestial.service import calculate_cell_temperature
from src.domains.celestial.schemas import TemperatureRequest, TemperatureResponse


async def calculate_temperature_use_case(
    service,
    request: TemperatureRequest,
    particle_repo,
) -> TemperatureResponse:
    """
    Calcular temperatura en (x, y, z) del bloque.
    service: CelestialTimeService; particle_repo: IParticleRepository (Postgres en runtime).
    """
    try:
        bloque_uuid = UUID(request.bloque_id)
    except ValueError:
        raise ValueError("bloque_id debe ser un UUID válido")
    temperatura = await calculate_cell_temperature(
        celda_x=request.x,
        celda_y=request.y,
        celda_z=request.z,
        bloque_id=str(bloque_uuid),
        celestial_time_service=service,
        particle_repo=particle_repo,
        tipo_particula_superficie=request.tipo_particula_superficie,
    )
    return TemperatureResponse(
        temperatura=temperatura,
        x=request.x,
        y=request.y,
        z=request.z,
    )
