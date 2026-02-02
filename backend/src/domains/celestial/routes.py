"""
Puerta de entrada HTTP para Tiempo Celestial y Temperatura.

Flujo: routes → casos de uso (get_celestial_state, calculate_temperature_use_case) y CelestialTimeService;
IParticleRepository inyectado (PostgresParticleRepository) para temperatura. Sin get_connection en routes.
"""
import logging
import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from src.domains.celestial.service import (
    CelestialTimeService,
    calculate_cell_temperature,
)
from src.domains.particles.application.ports.particle_repository import IParticleRepository
from src.domains.particles.infrastructure.postgres_particle_repository import PostgresParticleRepository
from src.domains.celestial.application.get_celestial_state import get_celestial_state
from src.domains.celestial.application.calculate_temperature import calculate_temperature_use_case
from src.domains.celestial.schemas import (
    CelestialStateResponse,
    TemperatureRequest,
    TemperatureResponse,
)
from src.config import CELESTIAL_CONFIG

logger = logging.getLogger(__name__)

router = APIRouter(tags=["celestial"])

_celestial_service: Optional[CelestialTimeService] = None
_update_task: Optional[asyncio.Task] = None
_particle_temperature_update_task: Optional[asyncio.Task] = None


def get_particle_repository() -> IParticleRepository:
    """Factory para inyección: devuelve PostgresParticleRepository (usado por temperatura)."""
    return PostgresParticleRepository()


def get_celestial_service() -> CelestialTimeService:
    """Singleton del servicio de tiempo celestial (sol/luna); inicializado con CELESTIAL_CONFIG."""
    global _celestial_service
    if _celestial_service is None:
        velocidad_tiempo = CELESTIAL_CONFIG["VELOCIDAD_TIEMPO"]
        tiempo_inicial = CELESTIAL_CONFIG["TIEMPO_INICIAL"]
        _celestial_service = CelestialTimeService(
            tiempo_inicial=tiempo_inicial,
            velocidad_tiempo=velocidad_tiempo,
        )
        logger.info(
            f"CelestialTimeService inicializado con velocidad_tiempo={velocidad_tiempo}, tiempo_inicial={tiempo_inicial}"
        )
    return _celestial_service


async def update_celestial_service_periodically():
    """Tarea en background: cada 1s avanza el tiempo del juego (CelestialTimeService.update)."""
    global _celestial_service
    while True:
        try:
            await asyncio.sleep(1.0)
            if _celestial_service is not None:
                _celestial_service.update(delta_time=1.0)
        except asyncio.CancelledError:
            logger.info("Tarea de actualización de CelestialTimeService cancelada")
            break
        except Exception as e:
            logger.error(f"Error actualizando CelestialTimeService: {e}")


async def start_celestial_service_background_task():
    """Arranca la tarea que actualiza el tiempo celestial cada segundo."""
    global _update_task
    if _update_task is None or _update_task.done():
        _update_task = asyncio.create_task(update_celestial_service_periodically())
        logger.info("Tarea de actualización de CelestialTimeService iniciada")


def _compute_new_temperature(
    temp_actual: float, temp_ambiente: float, inercia: float
) -> float:
    """Calcula nueva temperatura con inercia térmica; clamp [-50, 1000]."""
    if inercia <= 0:
        return temp_actual
    diferencia = float(temp_ambiente) - temp_actual
    factor_cambio = 1.0 / inercia
    nueva = temp_actual + (diferencia * factor_cambio)
    return max(-50.0, min(1000.0, nueva))


async def update_particle_temperatures_periodically():
    global _particle_temperature_update_task
    particle_repo: IParticleRepository = PostgresParticleRepository()
    update_interval = CELESTIAL_CONFIG.get("PARTICLE_TEMPERATURE_UPDATE_INTERVAL", 300)
    while True:
        try:
            await asyncio.sleep(update_interval)
            celestial_service = get_celestial_service()
            try:
                bloques = await particle_repo.get_distinct_bloque_ids_for_temperature_update()
            except Exception as e:
                error_msg = str(e).lower()
                if "pool is closing" in error_msg or "pool is closed" in error_msg:
                    logger.debug("Pool de conexiones cerró, deteniendo actualización de temperatura")
                    break
                logger.error(f"Error obteniendo bloques para temperatura: {e}")
                continue
            for bloque_id in bloques:
                try:
                    particulas = await particle_repo.get_particles_with_thermal_inertia(bloque_id)
                except Exception as e:
                    error_msg = str(e).lower()
                    if "pool is closing" in error_msg or "pool is closed" in error_msg:
                        break
                    logger.debug(f"Error obteniendo partículas del bloque {bloque_id}: {e}")
                    continue
                if not particulas:
                    continue
                for particula in particulas:
                    try:
                        temp_ambiente = await calculate_cell_temperature(
                            celda_x=float(particula["celda_x"]),
                            celda_y=float(particula["celda_y"]),
                            celda_z=float(particula["celda_z"]),
                            bloque_id=bloque_id,
                            celestial_time_service=celestial_service,
                            particle_repo=particle_repo,
                        )
                        temp_actual = float(particula["temperatura"])
                        inercia = float(particula["inercia_termica"])
                        nueva_temp = _compute_new_temperature(temp_actual, temp_ambiente, inercia)
                        await particle_repo.update_particle_temperature(
                            str(particula["id"]), nueva_temp
                        )
                    except asyncio.CancelledError:
                        raise
                    except Exception as e:
                        error_msg = str(e).lower()
                        if "pool is closing" in error_msg or "pool is closed" in error_msg:
                            break
                        logger.debug(f"Error actualizando temperatura de partícula {particula.get('id')}: {e}")
        except asyncio.CancelledError:
            logger.info("Tarea de actualización de temperatura de partículas cancelada")
            break
        except Exception as e:
            error_msg = str(e).lower()
            if "pool is closing" in error_msg or "pool is closed" in error_msg:
                break
            logger.error(f"Error actualizando temperatura de partículas: {e}")


async def start_particle_temperature_update_task():
    """Arranca la tarea que actualiza temperaturas de partículas periódicamente."""
    global _particle_temperature_update_task
    if _particle_temperature_update_task is None or _particle_temperature_update_task.done():
        _particle_temperature_update_task = asyncio.create_task(update_particle_temperatures_periodically())
        logger.info("Tarea de actualización de temperatura de partículas iniciada")


@router.get("/celestial/state", response_model=CelestialStateResponse)
async def get_celestial_state_route(
    service: CelestialTimeService = Depends(get_celestial_service),
):
    """Obtener el estado actual del tiempo celestial (sol/luna)."""
    try:
        return get_celestial_state(service)
    except Exception as e:
        logger.error(f"Error obteniendo estado celestial: {e}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo estado celestial: {str(e)}")


@router.post("/celestial/temperature", response_model=TemperatureResponse)
async def calculate_temperature_route(
    request: TemperatureRequest,
    service: CelestialTimeService = Depends(get_celestial_service),
    particle_repo: IParticleRepository = Depends(get_particle_repository),
):
    """POST /celestial/temperature — Temperatura ambiental en (x, y, z) del bloque (usa IParticleRepository)."""
    try:
        return await calculate_temperature_use_case(service, request, particle_repo)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculando temperatura: {e}")
        raise HTTPException(status_code=500, detail=f"Error calculando temperatura: {str(e)}")
