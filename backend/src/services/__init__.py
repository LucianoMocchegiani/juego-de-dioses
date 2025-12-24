"""
Servicios del sistema de partículas y bloques.

Este módulo contiene servicios para gestionar bloques espaciales,
partículas, y operaciones relacionadas con el mundo del juego.
"""

from .world_bloque import WorldBloque
from .world_bloque_manager import WorldBloqueManager
from .particula_service import (
    get_particula,
    get_particula_en_posicion,
    get_particulas_vecinas,
    get_particulas_cercanas,
    get_tipo_particula,
    get_tipo_particula_por_nombre,
    calcular_distancia,
    calcular_distancia_particulas,
    evaluar_temperatura,
    get_transiciones
)

__all__ = [
    'WorldBloque',
    'WorldBloqueManager',
    'get_particula',
    'get_particula_en_posicion',
    'get_particulas_vecinas',
    'get_particulas_cercanas',
    'get_tipo_particula',
    'get_tipo_particula_por_nombre',
    'calcular_distancia',
    'calcular_distancia_particulas',
    'evaluar_temperatura',
    'get_transiciones'
]

