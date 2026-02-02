"""
Schemas compartidos entre dominios (geometría, estilos, helpers).
No importar desde ningún dominio para evitar ciclos.
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Literal
import json


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
    """
    width: Optional[float] = Field(None, description="Ancho relativo a tamano_celda (default: 1.0 = tamaño de celda)")
    height: Optional[float] = Field(None, description="Alto relativo a tamano_celda (default: 1.0)")
    depth: Optional[float] = Field(None, description="Profundidad relativa a tamano_celda (default: 1.0)")
    radius: Optional[float] = Field(None, description="Radio relativo a tamano_celda (default: 0.5)")
    segments: Optional[int] = Field(default=16, ge=3, le=64, description="Número de segmentos para suavizado")
    radiusTop: Optional[float] = Field(None, description="Radio superior relativo a tamano_celda")
    radiusBottom: Optional[float] = Field(None, description="Radio inferior relativo a tamano_celda")
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
                "material": {"metalness": 0.1, "roughness": 0.8, "emissive": False},
                "visual": {"modelo": "cube", "escala": 1.0, "geometria": {"tipo": "box", "parametros": {}}}
            }
        }
