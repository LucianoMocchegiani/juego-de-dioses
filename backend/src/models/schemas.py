"""
Modelos Pydantic para requests y responses
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Literal
from uuid import UUID
from datetime import datetime
import json


# ===== Funciones Helper =====

def parse_jsonb_field(value):
    """
    Helper para parsear campos JSONB de asyncpg.
    
    asyncpg puede devolver JSONB como dict o como string según la versión/configuración.
    Esta función maneja ambos casos de forma segura.
    """
    if isinstance(value, str):
        try:
            return json.loads(value) if value else {}
        except json.JSONDecodeError:
            return {}
    elif isinstance(value, dict):
        return value
    elif value is None:
        return {}
    return {}


# ===== Estilos de Partículas =====

class MaterialProperties(BaseModel):
    """Propiedades de material para Three.js"""
    metalness: float = Field(default=0.1, ge=0.0, le=1.0, description="Metalness del material (0-1)")
    roughness: float = Field(default=0.8, ge=0.0, le=1.0, description="Roughness del material (0-1)")
    emissive: bool = Field(default=False, description="Si el material es emisivo")


class GeometriaParametros(BaseModel):
    """
    Parámetros de geometría según tipo.
    
    IMPORTANTE: Estos parámetros son RELATIVOS a tamano_celda de la dimensión.
    Tamaño absoluto = parametro × tamano_celda × escala
    
    Ejemplo:
    - tamano_celda = 0.25m (default)
    - width = 1.0 → width absoluto = 0.25m
    - width = 2.0 → width absoluto = 0.5m (el doble)
    
    NO son parámetros de animación, son dimensiones físicas de la forma.
    """
    # Box
    width: Optional[float] = Field(None, description="Ancho relativo a tamano_celda (default: 1.0 = tamaño de celda)")
    height: Optional[float] = Field(None, description="Alto relativo a tamano_celda (default: 1.0)")
    depth: Optional[float] = Field(None, description="Profundidad relativa a tamano_celda (default: 1.0)")
    
    # Sphere
    radius: Optional[float] = Field(None, description="Radio relativo a tamano_celda (default: 0.5)")
    segments: Optional[int] = Field(default=16, ge=3, le=64, description="Número de segmentos para suavizado")
    
    # Cylinder
    radiusTop: Optional[float] = Field(None, description="Radio superior relativo a tamano_celda")
    radiusBottom: Optional[float] = Field(None, description="Radio inferior relativo a tamano_celda")
    height: Optional[float] = Field(None, description="Altura relativa a tamano_celda")
    
    # Cone (usa radius, height, segments)
    
    # Torus
    # radius: radio principal relativo a tamano_celda
    # tube: radio del tubo relativo a tamano_celda
    tube: Optional[float] = Field(None, description="Radio del tubo relativo a tamano_celda (para torus)")


class GeometriaVisual(BaseModel):
    """Definición de geometría visual"""
    tipo: Literal["box", "sphere", "cylinder", "cone", "torus", "custom"] = Field(
        default="box",
        description="Tipo de geometría: box, sphere, cylinder, cone, torus, custom"
    )
    parametros: GeometriaParametros = Field(
        default_factory=GeometriaParametros,
        description="Parámetros de la geometría (relativos a tamano_celda)"
    )


class VisualProperties(BaseModel):
    """Propiedades visuales extendidas de la partícula"""
    modelo: Optional[str] = Field(
        default="cube",
        description="Tipo de modelo 3D (Deprecated: usar geometria.tipo)"
    )
    escala: float = Field(
        default=1.0,
        ge=0.1,
        le=10.0,
        description="Escala global del modelo (multiplicador final)"
    )
    geometria: Optional[GeometriaVisual] = Field(
        None,
        description="Definición de geometría visual (tipo y parámetros relativos a tamano_celda)"
    )


class EstilosParticula(BaseModel):
    """Modelo completo de estilos para una partícula"""
    color_hex: Optional[str] = Field(None, description="Color en hexadecimal como string en formato CSS (ej: '#8B4513')")
    color_rgb: Optional[List[int]] = Field(None, min_items=3, max_items=3, description="Color en RGB [R, G, B]")
    material: Optional[MaterialProperties] = Field(default_factory=MaterialProperties)
    visual: Optional[VisualProperties] = Field(default_factory=VisualProperties)
    
    @validator('color_rgb')
    def validate_rgb_values(cls, v):
        """Validar que valores RGB estén en rango 0-255"""
        if v:
            for val in v:
                if not (0 <= val <= 255):
                    raise ValueError("Valores RGB deben estar entre 0 y 255")
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "color_hex": "#90EE90",
                "color_rgb": [144, 238, 144],
                "material": {
                    "metalness": 0.1,
                    "roughness": 0.8,
                    "emissive": False
                },
                "visual": {
                    "modelo": "cube",
                    "escala": 1.0,
                    "geometria": {
                        "tipo": "box",
                        "parametros": {
                            "width": 1.0,
                            "height": 1.0,
                            "depth": 1.0
                        }
                    }
                }
            }
        }


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
    tipo_nombre: str = Field(..., description="Nombre del tipo de partícula (viene del JOIN)")
    estado_nombre: str = Field(..., description="Nombre del estado de materia (viene del JOIN)")
    creado_en: datetime
    modificado_en: datetime
    creado_por: Optional[UUID] = None

    @classmethod
    def from_row(cls, row) -> 'ParticleResponse':
        """
        Crear ParticleResponse desde fila de BD.
        
        Centraliza la lógica de conversión y parsing de campos JSONB.
        NO incluye estilos (vienen en query separada).
        """
        # Parsear solo propiedades (no estilos)
        propiedades = parse_jsonb_field(row.get('propiedades'))
        
        return cls(
            id=row['id'],
            dimension_id=row['dimension_id'],
            celda_x=row['celda_x'],
            celda_y=row['celda_y'],
            celda_z=row['celda_z'],
            tipo=row['tipo_nombre'],  # Mapeo: tipo_nombre -> tipo
            estado=row['estado_nombre'],  # Mapeo: estado_nombre -> estado
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
        
        # Aumentado a 1M celdas para permitir terrenos grandes con árboles altos
        # 160x160x40 = 1,024,000 celdas (árboles hasta z=32)
        # Con instanced rendering en frontend, esto es manejable
        if total_cells > 1000000:  # Límite de 1M celdas
            raise ValueError(f"Viewport demasiado grande: {total_cells} celdas. Máximo: 1000000")
        
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


class ParticleTypeResponse(BaseModel):
    """Schema de respuesta para tipo de partícula con estilos (query separada)"""
    id: str  # UUID como string
    nombre: str
    estilos: Optional[dict] = Field(
        None,
        description="Estilos visuales del tipo (color, material, visual)"
    )


class ParticleTypesResponse(BaseModel):
    """Response con lista de tipos de partículas con estilos"""
    types: List[ParticleTypeResponse] = Field(default_factory=list)


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

