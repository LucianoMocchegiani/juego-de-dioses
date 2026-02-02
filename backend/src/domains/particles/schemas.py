"""
Schemas del dominio particles: modelos de entidad (tipos, partículas, bloques, transiciones)
y DTOs de API (respuestas y queries).
"""
from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal, Dict, Any, List
from decimal import Decimal
from datetime import datetime
from uuid import UUID

from src.domains.shared.schemas import parse_jsonb_field


# =============================================================================
# MODELOS DE ENTIDAD (tipos_particulas, particulas, bloques, transiciones_particulas)
# =============================================================================

# --- Tipos de partículas ---

class TipoParticulaBase(BaseModel):
    """Modelo base para tipos de partículas."""
    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre único del tipo de partícula")
    tipo_fisico: Literal['solido', 'liquido', 'gas', 'energia'] = Field(default='solido', description="Tipo físico")
    densidad: Decimal = Field(default=Decimal("1.0"), ge=Decimal("0.0"), le=Decimal("10.0"))
    conductividad_termica: Decimal = Field(default=Decimal("1.0"), ge=Decimal("0.0"), le=Decimal("10.0"))
    inercia_termica: Decimal = Field(default=Decimal("1.0"), ge=Decimal("0.0"), le=Decimal("10.0"))
    opacidad: Decimal = Field(default=Decimal("1.0"), ge=Decimal("0.0"), le=Decimal("1.0"))
    color: Optional[str] = Field(default=None, max_length=50)
    geometria: Dict[str, Any] = Field(default={"tipo": "box"})
    conductividad_electrica: Decimal = Field(default=Decimal("0.0"), ge=Decimal("0.0"), le=Decimal("10.0"))
    magnetismo: Decimal = Field(default=Decimal("0.0"), ge=Decimal("0.0"), le=Decimal("10.0"))
    dureza: Optional[Decimal] = Field(default=None, ge=Decimal("0.0"), le=Decimal("10.0"))
    fragilidad: Optional[Decimal] = Field(default=None, ge=Decimal("0.0"), le=Decimal("10.0"))
    elasticidad: Optional[Decimal] = Field(default=None, ge=Decimal("0.0"), le=Decimal("10.0"))
    punto_fusion: Optional[Decimal] = None
    viscosidad: Optional[Decimal] = Field(default=None, ge=Decimal("0.0"), le=Decimal("10.0"))
    punto_ebullicion: Optional[Decimal] = None
    propagacion: Optional[Decimal] = Field(default=None, ge=Decimal("0.0"), le=Decimal("10.0"))
    propiedades_fisicas: Dict[str, Any] = Field(default={})
    descripcion: Optional[str] = None

    @model_validator(mode='after')
    def validate_type_specific_properties(self):
        tipo_fisico = self.tipo_fisico
        if tipo_fisico != 'solido' and (self.dureza is not None or self.fragilidad is not None or self.elasticidad is not None or self.punto_fusion is not None):
            raise ValueError("Propiedades de sólidos solo aplican si tipo_fisico = 'solido'")
        if tipo_fisico != 'liquido' and (self.viscosidad is not None or self.punto_ebullicion is not None):
            raise ValueError("Propiedades de líquidos solo aplican si tipo_fisico = 'liquido'")
        if tipo_fisico not in ('gas', 'energia') and self.propagacion is not None:
            raise ValueError("Propagación solo aplica si tipo_fisico = 'gas' o 'energia'")
        return self


class TipoParticulaCreate(TipoParticulaBase):
    """Modelo para crear un nuevo tipo de partícula."""
    pass


class TipoParticula(TipoParticulaBase):
    """Modelo completo de tipo de partícula (con ID y timestamps)."""
    id: UUID
    creado_en: datetime
    class Config:
        from_attributes = True
        json_encoders = {Decimal: str, UUID: str}


# --- Partículas ---

class ParticulaBase(BaseModel):
    """Modelo base para partículas."""
    bloque_id: UUID = Field(..., description="ID del bloque (mundo/dimensión)")
    celda_x: int = Field(..., description="Coordenada X de la celda")
    celda_y: int = Field(..., description="Coordenada Y de la celda")
    celda_z: int = Field(..., description="Coordenada Z de la celda")
    tipo_particula_id: UUID = Field(..., description="ID del tipo de partícula")
    estado_materia_id: UUID = Field(..., description="ID del estado de materia")
    temperatura: Decimal = Field(default=Decimal("20.0"))
    integridad: Decimal = Field(default=Decimal("1.0"), ge=Decimal("0.0"), le=Decimal("1.0"))
    carga_electrica: Decimal = Field(default=Decimal("0.0"), ge=Decimal("-100.0"), le=Decimal("100.0"))
    cantidad: Decimal = Field(default=Decimal("1.0"), ge=Decimal("0.0"))
    energia: Decimal = Field(default=Decimal("0.0"))
    extraida: bool = Field(default=False)
    agrupacion_id: Optional[UUID] = None
    es_nucleo: bool = Field(default=False)
    propiedades: Dict[str, Any] = Field(default={})
    creado_por: Optional[UUID] = None


class ParticulaCreate(ParticulaBase):
    """Modelo para crear una nueva partícula."""
    pass


class Particula(ParticulaBase):
    """Modelo completo de partícula (con ID y timestamps)."""
    id: UUID
    creado_en: datetime
    modificado_en: datetime
    class Config:
        from_attributes = True
        json_encoders = {Decimal: str, UUID: str}


# --- Transiciones de partículas ---

class TransicionParticulaBase(BaseModel):
    """Modelo base para transiciones de partículas."""
    tipo_origen_id: UUID = Field(..., description="ID del tipo de partícula origen")
    tipo_destino_id: UUID = Field(..., description="ID del tipo de partícula destino")
    condicion_temperatura: Optional[Literal['mayor', 'menor', 'igual']] = None
    valor_temperatura: Optional[Decimal] = None
    condicion_integridad: Optional[Literal['mayor', 'menor', 'igual']] = None
    valor_integridad: Optional[Decimal] = Field(default=None, ge=Decimal("0.0"), le=Decimal("1.0"))
    prioridad: int = Field(default=0)
    activa: bool = Field(default=True)
    reversible: bool = Field(default=True)
    histeresis: Decimal = Field(default=Decimal("5.0"), ge=Decimal("0.0"))
    descripcion: Optional[str] = None

    @model_validator(mode='after')
    def validate_conditions(self):
        if (self.condicion_temperatura is None) != (self.valor_temperatura is None):
            raise ValueError("condicion_temperatura y valor_temperatura deben estar ambos presentes o ambos ausentes")
        if (self.condicion_integridad is None) != (self.valor_integridad is None):
            raise ValueError("condicion_integridad y valor_integridad deben estar ambos presentes o ambos ausentes")
        return self


class TransicionParticulaCreate(TransicionParticulaBase):
    """Modelo para crear una nueva transición."""
    pass


class TransicionParticula(TransicionParticulaBase):
    """Modelo completo de transición (con ID y timestamp)."""
    id: UUID
    creado_en: datetime
    class Config:
        from_attributes = True
        json_encoders = {Decimal: str, UUID: str}


# =============================================================================
# DTOs DE API (respuestas y queries para endpoints REST)
# =============================================================================

class ParticleBase(BaseModel):
    """Base para partícula en respuestas API."""
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
    """Schema de respuesta para partícula."""
    id: UUID
    bloque_id: UUID
    tipo_particula_id: UUID
    estado_materia_id: UUID
    tipo_nombre: str = Field(..., description="Nombre del tipo de partícula (viene del JOIN)")
    estado_nombre: str = Field(..., description="Nombre del estado de materia (viene del JOIN)")
    creado_en: datetime
    modificado_en: datetime
    creado_por: Optional[UUID] = None

    @classmethod
    def from_row(cls, row) -> 'ParticleResponse':
        propiedades = parse_jsonb_field(row.get('propiedades'))
        return cls(
            id=row['id'],
            bloque_id=row['bloque_id'],
            celda_x=row['celda_x'],
            celda_y=row['celda_y'],
            celda_z=row['celda_z'],
            tipo=row['tipo_nombre'],
            estado=row['estado_nombre'],
            cantidad=float(row['cantidad']),
            temperatura=float(row['temperatura']),
            energia=float(row['energia']),
            extraida=row['extraida'],
            agrupacion_id=row.get('agrupacion_id'),
            es_nucleo=row['es_nucleo'],
            propiedades=propiedades,
            tipo_particula_id=row['tipo_particula_id'],
            estado_materia_id=row['estado_materia_id'],
            tipo_nombre=row['tipo_nombre'],
            estado_nombre=row['estado_nombre'],
            creado_en=row['creado_en'],
            modificado_en=row['modificado_en'],
            creado_por=row.get('creado_por')
        )

    class Config:
        from_attributes = True


class ParticleViewportQuery(BaseModel):
    """Query params para obtener partículas por viewport."""
    x_min: int = Field(..., ge=0, description="Coordenada X mínima")
    x_max: int = Field(..., ge=0, description="Coordenada X máxima")
    y_min: int = Field(..., ge=0, description="Coordenada Y mínima")
    y_max: int = Field(..., ge=0, description="Coordenada Y máxima")
    z_min: int = Field(default=-10, description="Coordenada Z mínima")
    z_max: int = Field(default=10, description="Coordenada Z máxima")

    def validate_ranges(self):
        if self.x_min > self.x_max:
            raise ValueError("x_min debe ser menor o igual a x_max")
        if self.y_min > self.y_max:
            raise ValueError("y_min debe ser menor o igual a y_max")
        if self.z_min > self.z_max:
            raise ValueError("z_min debe ser menor o igual a z_max")
        x_range = self.x_max - self.x_min + 1
        y_range = self.y_max - self.y_min + 1
        z_range = self.z_max - self.z_min + 1
        total_cells = x_range * y_range * z_range
        if total_cells > 1000000:
            raise ValueError(f"Viewport demasiado grande: {total_cells} celdas. Máximo: 1000000")
        return True


class ParticlesResponse(BaseModel):
    """Response con lista de partículas."""
    bloque_id: UUID
    particles: List[ParticleResponse]
    total: int
    viewport: ParticleViewportQuery


class ParticleTypeResponse(BaseModel):
    """Schema de respuesta para tipo de partícula con color y geometría."""
    id: str
    nombre: str
    color: Optional[str] = Field(None, description="Color del tipo de partícula (VARCHAR desde BD)")
    geometria: Optional[dict] = Field(None, description="Geometría visual del tipo (JSONB desde BD)")
    opacidad: Optional[float] = Field(None, description="Opacidad del tipo (0.0 = transparente, 1.0 = opaco)")


class ParticleTypesResponse(BaseModel):
    """Response con lista de tipos de partículas con estilos."""
    types: List[ParticleTypeResponse] = Field(default_factory=list)
