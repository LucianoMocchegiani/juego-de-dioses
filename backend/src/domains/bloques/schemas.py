"""
DTOs del recurso bloques (dimensiones/mundos) y modelos de entidad para la tabla bloques.
"""
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal


# =============================================================================
# Modelos de entidad (tabla juego_dioses.bloques)
# =============================================================================

class BloqueBase(BaseModel):
    """Modelo base para bloques (configuración de mundos/dimensiones)."""
    nombre: str = Field(default="Mundo Inicial", max_length=255)
    ancho_metros: Decimal = Field(default=Decimal("1.0"), ge=Decimal("0.0"))
    alto_metros: Decimal = Field(default=Decimal("1.0"), ge=Decimal("0.0"))
    profundidad_maxima: int = Field(default=-100)
    altura_maxima: int = Field(default=100)
    tamano_celda: Decimal = Field(default=Decimal("0.25"), ge=Decimal("0.01"))
    origen_x: Decimal = Field(default=Decimal("0.0"))
    origen_y: Decimal = Field(default=Decimal("0.0"))
    origen_z: int = Field(default=0)
    tamano_bloque: int = Field(default=40, ge=1)
    creado_por: Optional[UUID] = None


class BloqueCreate(BloqueBase):
    """Modelo para crear un nuevo bloque."""
    pass


class Bloque(BloqueBase):
    """Modelo completo de bloque (con ID y timestamp)."""
    id: UUID
    creado_en: datetime

    class Config:
        from_attributes = True
        json_encoders = {Decimal: str, UUID: str}


# =============================================================================
# DTOs de API (respuestas para endpoints REST)
# =============================================================================

class DimensionBase(BaseModel):
    """Base para dimensión"""
    nombre: str = Field(default="Mundo Inicial", max_length=255)
    ancho_metros: float = Field(default=1.0, ge=0.1)
    alto_metros: float = Field(default=1.0, ge=0.1)
    profundidad_maxima: int = Field(default=-100)
    altura_maxima: int = Field(default=100)
    tamano_celda: float = Field(default=0.25, ge=0.01, le=1.0)
    origen_x: float = Field(default=0.0)
    origen_y: float = Field(default=0.0)
    origen_z: int = Field(default=0)


class DimensionCreate(DimensionBase):
    """Schema para crear dimensión"""
    pass


class DimensionResponse(DimensionBase):
    """Schema de respuesta para dimensión"""
    id: UUID
    creado_en: datetime
    creado_por: Optional[UUID] = None

    class Config:
        from_attributes = True


class WorldSizeResponse(BaseModel):
    """Schema de respuesta para el tamaño total del mundo (todos los bloques combinados)"""
    ancho_total: float = Field(..., description="Ancho total del mundo en metros (suma de todos los bloques)")
    alto_total: float = Field(..., description="Alto total del mundo en metros (suma de todos los bloques)")
    radio_mundo: float = Field(..., description="Radio del mundo en metros (distancia desde el centro hasta la esquina más lejana)")
    min_x: float = Field(..., description="Coordenada X mínima del mundo")
    max_x: float = Field(..., description="Coordenada X máxima del mundo")
    min_y: float = Field(..., description="Coordenada Y mínima del mundo")
    max_y: float = Field(..., description="Coordenada Y máxima del mundo")
    centro_x: float = Field(..., description="Coordenada X del centro del mundo")
    centro_y: float = Field(..., description="Coordenada Y del centro del mundo")
