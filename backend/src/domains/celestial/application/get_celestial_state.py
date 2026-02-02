"""
Caso de uso: obtener el estado actual del tiempo celestial (sol/luna).
Recibe CelestialTimeService inyectado desde routes.
"""
from src.domains.celestial.schemas import CelestialStateResponse, CelestialPosition


def get_celestial_state(service) -> CelestialStateResponse:
    """
    Obtener estado del tiempo celestial desde el servicio.
    service: CelestialTimeService (o cualquier objeto con get_celestial_state()).
    """
    # get_celestial_state devuelve dict; mapeamos a CelestialStateResponse
    state = service.get_celestial_state()
    state["sun_position"] = CelestialPosition(**state["sun_position"])
    state["luna_position"] = CelestialPosition(**state["luna_position"])
    return CelestialStateResponse(**state)

