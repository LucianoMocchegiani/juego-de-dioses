"""
Configuración centralizada del backend

Centraliza valores de configuración para evitar valores mágicos
y facilitar cambios futuros.
"""

from .celestial_config import CELESTIAL_CONFIG
from .performance_config import PERFORMANCE_CONFIG

__all__ = ['CELESTIAL_CONFIG', 'PERFORMANCE_CONFIG']

