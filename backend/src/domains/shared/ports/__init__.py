"""
Puertos compartidos (Hexagonal): dependencias de infra que shared puede consumir.
"""
from .bloque_config_provider import IBloqueConfigProvider
from .temperature_calculator import ITemperatureCalculator

__all__ = ["IBloqueConfigProvider", "ITemperatureCalculator"]
