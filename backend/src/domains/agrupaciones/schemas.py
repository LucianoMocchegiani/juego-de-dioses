"""
DTOs del recurso agrupaciones.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from src.domains.particles.schemas import ParticleResponse


class AgrupacionBase(BaseModel):
    """Base para agrupación"""
    nombre: str = Field(..., max_length=255)
    tipo: str = Field(..., max_length=50)
    descripcion: Optional[str] = None
    especie: Optional[str] = Field(None, max_length=100)
    posicion_x: Optional[int] = None
    posicion_y: Optional[int] = None
    posicion_z: Optional[int] = None
    activa: bool = Field(default=True)
    salud: float = Field(default=100.0, ge=0.0, le=100.0)
    tiene_nucleo: bool = Field(default=False)
    nucleo_conectado: bool = Field(default=True)


class AgrupacionResponse(AgrupacionBase):
    """Schema de respuesta para agrupación"""
    id: UUID
    bloque_id: UUID
    creado_en: datetime
    modificado_en: datetime
    ultima_verificacion_nucleo: Optional[datetime] = None
    creado_por: Optional[UUID] = None
    particulas_count: Optional[int] = Field(None, description="Cantidad de partículas en la agrupación")

    class Config:
        from_attributes = True


class AgrupacionWithParticles(AgrupacionResponse):
    """Agrupación con sus partículas"""
    particulas: List[ParticleResponse] = Field(default_factory=list)
