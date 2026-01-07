"""
Endpoints para Tiempo Celestial y Temperatura
"""
import logging
import asyncio
from fastapi import APIRouter, HTTPException
from uuid import UUID
from typing import Optional

from src.services import CelestialTimeService, calculate_cell_temperature
from src.services.temperature_service import update_particle_temperature
from src.services.particula_service import get_particulas_con_inercia
from src.database.connection import get_connection
from src.models.schemas import (
    CelestialStateResponse,
    TemperatureRequest,
    TemperatureResponse
)
from src.config import CELESTIAL_CONFIG

logger = logging.getLogger(__name__)

router = APIRouter(tags=["celestial"])

# Instancia global del servicio de tiempo celestial
# Se actualiza periódicamente en segundo plano
_celestial_service: Optional[CelestialTimeService] = None
_update_task: Optional[asyncio.Task] = None

# Background task para actualizar temperatura de partículas
_particle_temperature_update_task: Optional[asyncio.Task] = None


def get_celestial_service() -> CelestialTimeService:
    """
    Obtener o crear la instancia global del servicio de tiempo celestial.
    
    Returns:
        Instancia de CelestialTimeService
    """
    global _celestial_service
    if _celestial_service is None:
        # Inicializar con velocidad de tiempo desde configuración
        velocidad_tiempo = CELESTIAL_CONFIG['VELOCIDAD_TIEMPO']
        tiempo_inicial = CELESTIAL_CONFIG['TIEMPO_INICIAL']
        _celestial_service = CelestialTimeService(
            tiempo_inicial=tiempo_inicial,
            velocidad_tiempo=velocidad_tiempo
        )
        logger.info(f"CelestialTimeService inicializado con velocidad_tiempo={velocidad_tiempo}, tiempo_inicial={tiempo_inicial}")
    return _celestial_service


async def update_celestial_service_periodically():
    """
    Actualizar el servicio de tiempo celestial periódicamente.
    Se ejecuta en segundo plano cada segundo.
    """
    global _celestial_service
    while True:
        try:
            await asyncio.sleep(1.0)  # Actualizar cada segundo
            if _celestial_service is not None:
                _celestial_service.update(delta_time=1.0)
        except asyncio.CancelledError:
            logger.info("Tarea de actualización de CelestialTimeService cancelada")
            break
        except Exception as e:
            logger.error(f"Error actualizando CelestialTimeService: {e}")


async def start_celestial_service_background_task():
    """
    Iniciar la tarea en segundo plano para actualizar el servicio de tiempo celestial.
    Se debe llamar durante el startup de la aplicación (dentro de un contexto async).
    """
    global _update_task
    if _update_task is None or _update_task.done():
        _update_task = asyncio.create_task(update_celestial_service_periodically())
        logger.info("Tarea de actualización de CelestialTimeService iniciada")


async def update_particle_temperatures_periodically():
    """
    Actualizar temperatura de partículas periódicamente.
    
    Se ejecuta cada X minutos (configurable en CELESTIAL_CONFIG) y actualiza partículas
    con inercia_termica > 0 en bloques activos.
    """
    global _particle_temperature_update_task
    
    # Obtener intervalo desde configuración
    update_interval = CELESTIAL_CONFIG.get('PARTICLE_TEMPERATURE_UPDATE_INTERVAL', 300)
    
    while True:
        try:
            await asyncio.sleep(update_interval)
            
            # Obtener servicio celestial
            celestial_service = get_celestial_service()
            
            # Obtener bloques activos (por ahora, todos los bloques con partículas)
            # Optimización futura: solo bloques activos (con jugadores)
            pool_closed = False
            try:
                async with get_connection() as conn:
                    # Obtener todos los bloques únicos
                    try:
                        bloques = await conn.fetch(
                            """
                            SELECT DISTINCT bloque_id
                            FROM juego_dioses.particulas
                            WHERE extraida = false
                            """
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
                        
                        # Obtener partículas con inercia_termica
                        try:
                            particulas = await get_particulas_con_inercia(bloque_id, conn)
                        except Exception as e:
                            error_msg = str(e).lower()
                            if "pool is closing" in error_msg or "pool is closed" in error_msg:
                                logger.debug("Pool cerró al obtener partículas")
                                pool_closed = True
                                break
                            continue
                        
                        if not particulas:
                            continue
                        
                        # Actualizar temperatura de cada partícula
                        for particula in particulas:
                            if pool_closed:
                                break
                                
                            try:
                                # Calcular temperatura ambiental en la posición de la partícula
                                temp_ambiente = await calculate_cell_temperature(
                                    celda_x=float(particula['celda_x']),
                                    celda_y=float(particula['celda_y']),
                                    celda_z=float(particula['celda_z']),
                                    bloque_id=bloque_id,
                                    celestial_time_service=celestial_service
                                )
                                
                                # Actualizar temperatura de la partícula
                                await update_particle_temperature(
                                    particula_id=str(particula['id']),
                                    temp_ambiente=temp_ambiente,
                                    tipo_particula={
                                        'inercia_termica': float(particula['inercia_termica'])
                                    },
                                    conn=conn
                                )
                            except asyncio.CancelledError:
                                raise  # Re-lanzar para salir del loop
                            except Exception as e:
                                # Ignorar errores de "pool is closing" - son esperados durante shutdown
                                error_msg = str(e).lower()
                                if "pool is closing" in error_msg or "pool is closed" in error_msg:
                                    logger.debug(f"Pool cerró durante actualización de partícula {particula.get('id')}")
                                    pool_closed = True
                                    break
                                else:
                                    # Solo loguear errores que no sean de pool cerrado
                                    logger.debug(f"Error actualizando temperatura de partícula {particula.get('id')}: {e}")
                                continue
                            
            except (asyncio.CancelledError, RuntimeError) as e:
                # Pool cerrado o tarea cancelada
                error_msg = str(e).lower()
                if "pool is closing" in error_msg or "pool is closed" in error_msg or isinstance(e, asyncio.CancelledError):
                    logger.debug("Pool de conexiones cerró o tarea fue cancelada")
                    break
                raise
            except Exception as e:
                error_msg = str(e).lower()
                if "pool is closing" in error_msg or "pool is closed" in error_msg:
                    logger.debug("Pool de conexiones cerró, deteniendo actualización de temperatura")
                    break
                raise
                    
            if pool_closed:
                break
                        
        except asyncio.CancelledError:
            logger.info("Tarea de actualización de temperatura de partículas cancelada")
            break
        except Exception as e:
            # Ignorar errores de pool cerrado durante shutdown
            error_msg = str(e).lower()
            if "pool is closing" in error_msg or "pool is closed" in error_msg:
                logger.debug("Pool de conexiones cerró, deteniendo tarea de temperatura")
                break
            logger.error(f"Error actualizando temperatura de partículas: {e}")
            # Continuar el loop después de un error no relacionado con pool


async def start_particle_temperature_update_task():
    """
    Iniciar background task para actualizar temperatura de partículas.
    """
    global _particle_temperature_update_task
    if _particle_temperature_update_task is None or _particle_temperature_update_task.done():
        _particle_temperature_update_task = asyncio.create_task(
            update_particle_temperatures_periodically()
        )
        logger.info("Tarea de actualización de temperatura de partículas iniciada")


@router.get("/celestial/state", response_model=CelestialStateResponse)
async def get_celestial_state():
    """
    Obtener el estado actual del tiempo celestial (sol/luna).
    
    Returns:
        Estado completo del tiempo celestial
    """
    try:
        service = get_celestial_service()
        state = service.get_celestial_state()
        # Convertir posiciones a objetos CelestialPosition
        from src.models.schemas import CelestialPosition
        state['sun_position'] = CelestialPosition(**state['sun_position'])
        state['luna_position'] = CelestialPosition(**state['luna_position'])
        return CelestialStateResponse(**state)
    except Exception as e:
        logger.error(f"Error obteniendo estado celestial: {e}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo estado celestial: {str(e)}")


@router.post("/celestial/temperature", response_model=TemperatureResponse)
async def calculate_temperature(request: TemperatureRequest):
    """
    Calcular temperatura ambiental en una posición específica.
    
    Args:
        request: Request con coordenadas y bloque_id
    
    Returns:
        Temperatura calculada en grados Celsius
    """
    try:
        # Validar que bloque_id sea un UUID válido
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

