"""
Modelos Pydantic para requests y responses
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# ===== Dimensiones =====

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


# ===== Partículas =====

class ParticleBase(BaseModel):
    """Base para partícula"""
    celda_x: int
    celda_y: int
    celda_z: int
    tipo: str = Field(..., description="Nombre del tipo de partícula")
    estado: str = Field(..., description="Nombre del estado de materia")
    cantidad: float = Field(default=1.0, ge=0.0, le=1.0)
    temperatura: float = Field(default=20.0)
    energia: float = Field(default=0.0, ge=0.0)
    extraida: bool = Field(default=False)
    agrupacion_id: Optional[UUID] = None
    es_nucleo: bool = Field(default=False)
    propiedades: dict = Field(default_factory=dict)


class ParticleResponse(ParticleBase):
    """Schema de respuesta para partícula"""
    id: UUID
    dimension_id: UUID
    tipo_particula_id: UUID
    estado_materia_id: UUID
    creado_en: datetime
    modificado_en: datetime
    creado_por: Optional[UUID] = None

    class Config:
        from_attributes = True


class ParticleViewportQuery(BaseModel):
    """Query params para obtener partículas por viewport"""
    x_min: int = Field(..., ge=0, description="Coordenada X mínima")
    x_max: int = Field(..., ge=0, description="Coordenada X máxima")
    y_min: int = Field(..., ge=0, description="Coordenada Y mínima")
    y_max: int = Field(..., ge=0, description="Coordenada Y máxima")
    z_min: int = Field(default=-10, description="Coordenada Z mínima")
    z_max: int = Field(default=10, description="Coordenada Z máxima")

    def validate_ranges(self):
        """Validar que los rangos sean correctos"""
        if self.x_min > self.x_max:
            raise ValueError("x_min debe ser menor o igual a x_max")
        if self.y_min > self.y_max:
            raise ValueError("y_min debe ser menor o igual a y_max")
        if self.z_min > self.z_max:
            raise ValueError("z_min debe ser menor o igual a z_max")
        
        # Limitar tamaño del viewport para evitar queries muy grandes
        x_range = self.x_max - self.x_min + 1
        y_range = self.y_max - self.y_min + 1
        z_range = self.z_max - self.z_min + 1
        total_cells = x_range * y_range * z_range
        
        if total_cells > 100000:  # Límite de 100k celdas
            raise ValueError(f"Viewport demasiado grande: {total_cells} celdas. Máximo: 100000")
        
        return True


class ParticlesResponse(BaseModel):
    """Response con lista de partículas"""
    dimension_id: UUID
    particles: List[ParticleResponse]
    total: int
    viewport: ParticleViewportQuery


# ===== Agrupaciones =====

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
    dimension_id: UUID
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


# ===== Tipos de Partículas =====

class TipoParticulaResponse(BaseModel):
    """Schema de respuesta para tipo de partícula"""
    id: UUID
    nombre: str
    categoria: str
    densidad: float
    color_base: Optional[str] = None
    descripcion: Optional[str] = None

    class Config:
        from_attributes = True


# ===== Estados de Materia =====

class EstadoMateriaResponse(BaseModel):
    """Schema de respuesta para estado de materia"""
    id: UUID
    nombre: str
    tipo_fisica: Optional[str] = None
    viscosidad: Optional[float] = None
    densidad_estado: Optional[float] = None
    gravedad: bool
    flujo: bool
    propagacion: bool
    descripcion: Optional[str] = None

    class Config:
        from_attributes = True

