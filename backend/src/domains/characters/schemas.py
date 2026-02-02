"""
DTOs del recurso characters (personajes/bípedos).
"""
from pydantic import BaseModel, Field, validator
from typing import Dict, Optional, Literal

from src.domains.shared.schemas import GeometriaVisual


class BipedGeometryPart(BaseModel):
    """Schema para una parte de la geometría de un bípedo"""
    geometria: GeometriaVisual = Field(..., description="Definición de geometría de la parte")
    offset: Dict[str, float] = Field(..., description="Offset de posición {x, y, z} en metros")
    rotacion: Optional[Dict[str, float]] = Field(None, description="Rotación {x, y, z} en grados")


class BipedGeometry(BaseModel):
    """Schema para geometría completa de un bípedo"""
    tipo: str = Field(..., description="Tipo de geometría (ej: 'biped')")
    partes: Dict[str, BipedGeometryPart] = Field(..., description="Diccionario de partes del cuerpo con sus geometrías")


class Model3DOffset(BaseModel):
    """Offset del modelo 3D en metros"""
    x: float = Field(default=0.0, description="Offset X en metros")
    y: float = Field(default=0.0, description="Offset Y en metros")
    z: float = Field(default=0.0, description="Offset Z en metros")


class Model3DRotation(BaseModel):
    """Rotación del modelo 3D en grados"""
    x: float = Field(default=0.0, ge=0, le=360, description="Rotación X en grados")
    y: float = Field(default=0.0, ge=0, le=360, description="Rotación Y en grados")
    z: float = Field(default=0.0, ge=0, le=360, description="Rotación Z en grados")


class Model3D(BaseModel):
    """Modelo 3D asociado a una agrupación"""
    tipo: Literal["gltf", "glb", "obj"] = Field(..., description="Tipo de modelo (gltf, glb, obj)")
    ruta: str = Field(..., description="Ruta relativa del modelo (ej: 'characters/humano.glb')")
    escala: float = Field(default=1.0, gt=0, description="Escala del modelo (multiplicador)")
    offset: Optional[Model3DOffset] = Field(default=None, description="Offset del modelo en metros")
    rotacion: Optional[Model3DRotation] = Field(default=None, description="Rotación del modelo en grados")

    @validator('ruta')
    def validate_ruta(cls, v):
        if '..' in v or v.startswith('/'):
            raise ValueError("Ruta inválida: no puede contener '..' o ser absoluta")
        return v


class CharacterResponse(BaseModel):
    """Respuesta con información completa de un personaje"""
    id: str = Field(..., description="ID del personaje (agrupación)")
    bloque_id: str = Field(..., description="ID del bloque")
    nombre: str = Field(..., description="Nombre del personaje")
    tipo: str = Field(..., description="Tipo de agrupación (ej: 'biped')")
    especie: str = Field(..., description="Especie del personaje (ej: 'humano')")
    posicion: Dict[str, int] = Field(..., description="Posición {x, y, z} en celdas")
    geometria_agrupacion: Optional[BipedGeometry] = Field(None, description="Geometría de agrupación del personaje")
    modelo_3d: Optional[Model3D] = Field(None, description="Modelo 3D asociado al personaje")
    particulas_count: int = Field(..., description="Cantidad de partículas que forman el personaje")


class CharacterCreate(BaseModel):
    """Request para crear un personaje"""
    template_id: str = Field(..., description="ID del template (ej: 'humano')")
    x: int = Field(..., ge=0, description="Posición X en celdas")
    y: int = Field(..., ge=0, description="Posición Y en celdas")
    z: int = Field(..., description="Posición Z en celdas")
