"""
Modelos Pydantic
"""
from .schemas import (
    DimensionBase,
    DimensionCreate,
    DimensionResponse,
    ParticleBase,
    ParticleResponse,
    ParticleViewportQuery,
    ParticlesResponse,
    AgrupacionBase,
    AgrupacionResponse,
    AgrupacionWithParticles,
    TipoParticulaResponse,
    EstadoMateriaResponse
)

# Nuevos modelos del sistema de partículas (JDG-038)
from .particula_schemas import (
    TipoParticulaBase,
    TipoParticulaCreate,
    TipoParticula,
    ParticulaBase,
    ParticulaCreate,
    Particula,
    BloqueBase,
    BloqueCreate,
    Bloque,
    TransicionParticulaBase,
    TransicionParticulaCreate,
    TransicionParticula
)

__all__ = [
    # Modelos existentes (compatibilidad)
    "DimensionBase",
    "DimensionCreate",
    "DimensionResponse",
    "ParticleBase",
    "ParticleResponse",
    "ParticleViewportQuery",
    "ParticlesResponse",
    "AgrupacionBase",
    "AgrupacionResponse",
    "AgrupacionWithParticles",
    "TipoParticulaResponse",
    "EstadoMateriaResponse",
    # Nuevos modelos del sistema de partículas (JDG-038)
    "TipoParticulaBase",
    "TipoParticulaCreate",
    "TipoParticula",
    "ParticulaBase",
    "ParticulaCreate",
    "Particula",
    "BloqueBase",
    "BloqueCreate",
    "Bloque",
    "TransicionParticulaBase",
    "TransicionParticulaCreate",
    "TransicionParticula"
]

