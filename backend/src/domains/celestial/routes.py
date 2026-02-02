"""
Endpoints para Tiempo Celestial y Temperatura
"""
import logging
import asyncio
from fastapi import APIRouter, HTTPException
from typing import Optional
from uuid import UUID

from src.domains.celestial.service import (
    CelestialTimeService,
    calculate_cell_temperature,
    update_particle_temperature,
)
from src.domains.particles.service import get_particulas_con_inercia
from src.database.connection import get_connection
from src.domains.celestial.schemas import (
    CelestialStateResponse,
    CelestialPosition,
    TemperatureRequest,
    TemperatureResponse,
)
from src.config import CELESTIAL_CONFIG

logger = logging.getLogger(__name__)

router = APIRouter(tags=["celestial"])

_celestial_service: Optional[CelestialTimeService] = None
_update_task: Optional[asyncio.Task] = None
_particle_temperature_update_task: Optional[asyncio.Task] = None


def get_celestial_service() -> CelestialTimeService:
    global _celestial_service
    if _celestial_service is None:
        velocidad_tiempo = CELESTIAL_CONFIG['VELOCIDAD_TIEMPO']
        tiempo_inicial = CELESTIAL_CONFIG['TIEMPO_INICIAL']
        _celestial_service = CelestialTimeService(
            tiempo_inicial=tiempo_inicial,
            velocidad_tiempo=velocidad_tiempo
        )
        logger.info(f"CelestialTimeService inicializado con velocidad_tiempo={velocidad_tiempo}, tiempo_inicial={tiempo_inicial}")
    return _celestial_service


async def update_celestial_service_periodically():
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
    global _update_task
    if _update_task is None or _update_task.done():
        _update_task = asyncio.create_task(update_celestial_service_periodically())
        logger.info("Tarea de actualización de CelestialTimeService iniciada")


async def update_particle_temperatures_periodically():
    global _particle_temperature_update_task
    update_interval = CELESTIAL_CONFIG.get('PARTICLE_TEMPERATURE_UPDATE_INTERVAL', 300)
    while True:
        try:
            await asyncio.sleep(update_interval)
            celestial_service = get_celestial_service()
            pool_closed = False
            try:
                async with get_connection() as conn:
                    try:
                        bloques = await conn.fetch(
                            "SELECT DISTINCT bloque_id FROM juego_dioses.particulas WHERE extraida = false"
                        )
                    except Exception as e:
                        error_msg = str(e).lower()
                        if "pool is closing" in error_msg or "pool is closed" in error_msg:
                            logger.debug("Pool de conexiones cerró, deteniendo actualización de temperatura")
                            pool_closed = True
                            break
                        raise
                    if pool_closed:
                        break
                    for bloque_row in bloques:
                        if pool_closed:
                            break
                        bloque_id = str(bloque_row['bloque_id'])
                        try:
                            particulas = await get_particulas_con_inercia(bloque_id, conn)
                        except Exception as e:
                            error_msg = str(e).lower()
                            if "pool is closing" in error_msg or "pool is closed" in error_msg:
                                pool_closed = True
                                break
                            continue
                        if not particulas:
                            continue
                        for particula in particulas:
                            if pool_closed:
                                break
                            try:
                                temp_ambiente = await calculate_cell_temperature(
                                    celda_x=float(particula['celda_x']),
                                    celda_y=float(particula['celda_y']),
                                    celda_z=float(particula['celda_z']),
                                    bloque_id=bloque_id,
                                    celestial_time_service=celestial_service
                                )
                                await update_particle_temperature(
                                    particula_id=str(particula['id']),
                                    temp_ambiente=temp_ambiente,
                                    tipo_particula={'inercia_termica': float(particula['inercia_termica'])},
                                    conn=conn
                                )
                            except asyncio.CancelledError:
                                raise
                            except Exception as e:
                                error_msg = str(e).lower()
                                if "pool is closing" in error_msg or "pool is closed" in error_msg:
                                    pool_closed = True
                                    break
                                logger.debug(f"Error actualizando temperatura de partícula {particula.get('id')}: {e}")
                                continue
            except (asyncio.CancelledError, RuntimeError) as e:
                error_msg = str(e).lower()
                if "pool is closing" in error_msg or "pool is closed" in error_msg or isinstance(e, asyncio.CancelledError):
                    break
                raise
            except Exception as e:
                error_msg = str(e).lower()
                if "pool is closing" in error_msg or "pool is closed" in error_msg:
                    break
                raise
            if pool_closed:
                break
        except asyncio.CancelledError:
            logger.info("Tarea de actualización de temperatura de partículas cancelada")
            break
        except Exception as e:
            error_msg = str(e).lower()
            if "pool is closing" in error_msg or "pool is closed" in error_msg:
                break
            logger.error(f"Error actualizando temperatura de partículas: {e}")


async def start_particle_temperature_update_task():
    global _particle_temperature_update_task
    if _particle_temperature_update_task is None or _particle_temperature_update_task.done():
        _particle_temperature_update_task = asyncio.create_task(update_particle_temperatures_periodically())
        logger.info("Tarea de actualización de temperatura de partículas iniciada")


@router.get("/celestial/state", response_model=CelestialStateResponse)
async def get_celestial_state():
    """Obtener el estado actual del tiempo celestial (sol/luna)."""
    try:
        service = get_celestial_service()
        state = service.get_celestial_state()
        state['sun_position'] = CelestialPosition(**state['sun_position'])
        state['luna_position'] = CelestialPosition(**state['luna_position'])
        return CelestialStateResponse(**state)
    except Exception as e:
        logger.error(f"Error obteniendo estado celestial: {e}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo estado celestial: {str(e)}")


@router.post("/celestial/temperature", response_model=TemperatureResponse)
async def calculate_temperature(request: TemperatureRequest):
    """Calcular temperatura ambiental en una posición específica."""
    try:
        try:
            bloque_uuid = UUID(request.bloque_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="bloque_id debe ser un UUID válido")
        service = get_celestial_service()
        temperatura = await calculate_cell_temperature(
            celda_x=request.x,
            celda_y=request.y,
            celda_z=request.z,
            bloque_id=str(bloque_uuid),
            celestial_time_service=service,
            tipo_particula_superficie=request.tipo_particula_superficie
        )
        return TemperatureResponse(
            temperatura=temperatura,
            x=request.x,
            y=request.y,
            z=request.z
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculando temperatura: {e}")
        raise HTTPException(status_code=500, detail=f"Error calculando temperatura: {str(e)}")
