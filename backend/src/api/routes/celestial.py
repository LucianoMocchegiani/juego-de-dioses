"""
Endpoints para Tiempo Celestial y Temperatura
"""
import logging
import asyncio
from fastapi import APIRouter, HTTPException
from uuid import UUID
from typing import Optional

from src.services import CelestialTimeService, calculate_cell_temperature
from src.models.schemas import (
    CelestialStateResponse,
    TemperatureRequest,
    TemperatureResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["celestial"])

# Instancia global del servicio de tiempo celestial
# Se actualiza periódicamente en segundo plano
_celestial_service: Optional[CelestialTimeService] = None
_update_task: Optional[asyncio.Task] = None


def get_celestial_service() -> CelestialTimeService:
    """
    Obtener o crear la instancia global del servicio de tiempo celestial.
    
    Returns:
        Instancia de CelestialTimeService
    """
    global _celestial_service
    if _celestial_service is None:
        # Inicializar con velocidad de tiempo (1 segundo real = 60 segundos de juego)
        # Esto se puede hacer configurable más adelante
        velocidad_tiempo = 60.0  # 1 segundo real = 1 minuto de juego
        _celestial_service = CelestialTimeService(velocidad_tiempo=velocidad_tiempo)
        logger.info(f"CelestialTimeService inicializado con velocidad_tiempo={velocidad_tiempo}")
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

