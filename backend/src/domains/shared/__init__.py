"""
Schemas, helpers y servicios cross-cutting compartidos entre dominios.
"""
from .schemas import (
    parse_jsonb_field,
    MaterialProperties,
    GeometriaParametros,
    GeometriaVisual,
    VisualProperties,
    EstilosParticula,
)
from .performance_monitor import PerformanceMonitorService
from .world_bloque import WorldBloque
from .world_bloque_manager import WorldBloqueManager
from .ports import IBloqueConfigProvider, ITemperatureCalculator

__all__ = [
    "parse_jsonb_field",
    "MaterialProperties",
    "GeometriaParametros",
    "GeometriaVisual",
    "VisualProperties",
    "EstilosParticula",
    "PerformanceMonitorService",
    "WorldBloque",
    "WorldBloqueManager",
    "IBloqueConfigProvider",
    "ITemperatureCalculator",
]
