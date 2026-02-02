"""
DTOs del recurso celestial (tiempo celestial, temperatura).
"""
from pydantic import BaseModel, Field
from typing import Optional


class CelestialPosition(BaseModel):
    """Posición 3D de un cuerpo celestial"""
    x: float = Field(..., description="Coordenada X en metros")
    y: float = Field(..., description="Coordenada Y en metros")
    z: float = Field(..., description="Coordenada Z (altura) en metros")


class CelestialStateResponse(BaseModel):
    """Estado del tiempo celestial (sol/luna)"""
    time: float = Field(..., description="Tiempo del juego en segundos")
    sun_angle: float = Field(..., description="Ángulo del sol en radianes (0-2π)")
    luna_angle: float = Field(..., description="Ángulo de la luna en radianes (0-2π)")
    luna_phase: float = Field(..., ge=0.0, le=1.0, description="Fase lunar (0.0 = nueva, 0.5 = llena, 1.0 = nueva)")
    current_hour: float = Field(..., ge=0.0, le=24.0, description="Hora actual del día (0-24)")
    is_daytime: bool = Field(..., description="Si es de día (basado en hora)")
    sun_position: CelestialPosition = Field(..., description="Posición 3D del sol en metros")
    luna_position: CelestialPosition = Field(..., description="Posición 3D de la luna en metros")


class TemperatureRequest(BaseModel):
    """Request para calcular temperatura en una posición"""
    x: float = Field(..., description="Coordenada X en celdas")
    y: float = Field(..., description="Coordenada Y en celdas")
    z: float = Field(..., description="Coordenada Z (altitud) en celdas")
    bloque_id: str = Field(..., description="ID del bloque")
    tipo_particula_superficie: Optional[str] = Field(None, description="Tipo de partícula dominante en la superficie (opcional)")


class TemperatureResponse(BaseModel):
    """Respuesta con temperatura calculada"""
    temperatura: float = Field(..., description="Temperatura ambiental en grados Celsius")
    x: float = Field(..., description="Coordenada X donde se calculó")
    y: float = Field(..., description="Coordenada Y donde se calculó")
    z: float = Field(..., description="Coordenada Z donde se calculó")
