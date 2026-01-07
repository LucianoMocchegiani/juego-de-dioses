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
    get_transiciones,
    get_particulas_con_inercia
)

# Servicio de Tiempo Celestial
from .celestial_time_service import CelestialTimeService

# Servicio de Temperatura
from .temperature_service import (
    calculate_solar_temperature,
    get_altitude_modifier,
    get_water_modifier,
    get_albedo_modifier,
    calculate_cell_temperature,
    update_particle_temperature,
    get_particle_temperature_modifier
)

# Servicio de Monitoreo de Rendimiento
from .performance_monitor_service import PerformanceMonitorService

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
    'get_transiciones',
    'get_particulas_con_inercia',
    # Servicio de Tiempo Celestial
    'CelestialTimeService',
    # Servicio de Temperatura
    'calculate_solar_temperature',
    'get_altitude_modifier',
    'get_water_modifier',
    'get_albedo_modifier',
    'calculate_cell_temperature',
    'update_particle_temperature',
    'get_particle_temperature_modifier',
    # Servicio de Monitoreo de Rendimiento
    'PerformanceMonitorService'
]

