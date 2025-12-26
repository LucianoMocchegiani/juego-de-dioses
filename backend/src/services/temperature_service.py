"""
Servicio de Temperatura Ambiental

Calcula temperatura ambiental según múltiples factores:
- Temperatura solar (latitud + posición del sol)
- Modificador por altitud
- Modificador por proximidad al agua
- Modificador por albedo (tipo de superficie)
"""

import math
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .celestial_time_service import CelestialTimeService


def calculate_solar_temperature(
    celda_x: float,
    celda_y: float,
    celestial_time_service: 'CelestialTimeService',
    radio_maximo: float = 1000.0
) -> float:
    """
    Calcular temperatura base según latitud (distancia del centro) y posición del sol
    
    Proyección Gleason:
    - Centro (radio 0) = Polo Norte = -20°C base
    - Ecuador (radio ~50%) = 30°C base (máximo)
    - Borde (radio 100%) = Polo Sur = -40°C base
    
    Args:
        celda_x: Coordenada X de la celda
        celda_y: Coordenada Y de la celda
        celestial_time_service: Servicio de tiempo celestial para obtener posición del sol
        radio_maximo: Radio máximo del mundo (unidades)
    
    Returns:
        Temperatura base en grados Celsius
    """
    # Convertir a coordenadas polares
    radio = math.sqrt(celda_x * celda_x + celda_y * celda_y)
    radio_ecuador = radio_maximo * 0.5  # Ecuador está a mitad del radio
    
    # Temperatura base según distancia del centro (latitud)
    if radio <= radio_ecuador:
        # Del centro al ecuador: -20°C a 30°C
        factor = radio / radio_ecuador if radio_ecuador > 0 else 0.0
        temp_base = -20.0 + (factor * 50.0)
    else:
        # Del ecuador al borde: 30°C a -40°C
        factor = (radio - radio_ecuador) / (radio_maximo - radio_ecuador) if (radio_maximo - radio_ecuador) > 0 else 0.0
        temp_base = 30.0 - (factor * 70.0)
    
    # Intensidad solar según posición del sol
    intensidad_solar = celestial_time_service.get_sun_intensity_at(celda_x, celda_y)
    
    # Ajuste día/noche: Día +15°C, Noche -10°C (diferencia de 25°C)
    ajuste_dia_noche = (intensidad_solar * 25.0) - 10.0
    
    # Temperatura final
    temperatura_final = temp_base + ajuste_dia_noche
    
    return temperatura_final


def get_altitude_modifier(altitud_z: float) -> float:
    """
    Calcular modificador de temperatura por altitud
    
    Gradiente adiabático: -6.5°C por cada 1000 unidades de altura
    
    Args:
        altitud_z: Altitud en unidades (celdas)
    
    Returns:
        Modificador de temperatura en grados Celsius
    """
    return -6.5 * (altitud_z / 1000.0)


async def get_water_modifier(
    celda_x: float,
    celda_y: float,
    celda_z: float,
    bloque_id: str,
    radio_busqueda: float = 10.0
) -> float:
    """
    Calcular modificador de temperatura por proximidad al agua
    
    El agua tiene efecto moderador: reduce extremos de temperatura.
    Más cerca del agua = temperatura más estable.
    
    Args:
        celda_x: Coordenada X de la celda
        celda_y: Coordenada Y de la celda
        celda_z: Coordenada Z (altura) de la celda
        bloque_id: ID del bloque
        radio_busqueda: Radio de búsqueda de agua (celdas)
    
    Returns:
        Modificador de temperatura en grados Celsius
        (positivo en invierno, negativo en verano, simplificado aquí)
    """
    from .particula_service import get_particulas_vecinas
    from .particula_service import calcular_distancia
    
    # Buscar partículas de agua cercanas
    # Convertir a int para get_particulas_vecinas (espera int)
    particulas_cercanas = await get_particulas_vecinas(
        bloque_id=bloque_id,
        celda_x=int(celda_x),
        celda_y=int(celda_y),
        celda_z=int(celda_z),
        radio=int(radio_busqueda)
    )
    
    # Encontrar distancia mínima al agua
    distancia_agua_minima = float('inf')
    
    for particula in particulas_cercanas:
        tipo_nombre = particula.get('tipo_nombre', '').lower()
        if tipo_nombre in ['agua', 'oceano', 'agua_sucia']:
            # Calcular distancia
            distancia = calcular_distancia(
                celda_x, celda_y, celda_z,
                particula['celda_x'], particula['celda_y'], particula['celda_z']
            )
            distancia_agua_minima = min(distancia_agua_minima, distancia)
    
    if distancia_agua_minima == float('inf'):
        return 0.0  # No hay agua cerca
    
    # Efecto moderador: más cerca del agua = temperatura más estable
    # Máximo efecto dentro de 5 celdas
    factor = max(0.0, 1.0 - (distancia_agua_minima / 5.0))
    
    # Simplificado: efecto moderador de ±5°C
    # En implementación futura, debería variar por estación
    return factor * 5.0


async def get_albedo_modifier(tipo_particula_nombre: Optional[str] = None) -> float:
    """
    Calcular modificador de temperatura por albedo (tipo de superficie)
    
    Albedo alto (superficies claras) = reflejan luz = más frío
    Albedo bajo (superficies oscuras) = absorben luz = más caliente
    
    El albedo se consulta desde la base de datos (tabla tipos_particulas).
    Si no se encuentra el tipo o no tiene albedo definido, usa 0.2 por defecto.
    
    Args:
        tipo_particula_nombre: Nombre del tipo de partícula (superficie)
    
    Returns:
        Modificador de temperatura en grados Celsius
    """
    from .particula_service import get_tipo_particula_por_nombre
    
    # Si no se proporciona nombre, usar default
    if tipo_particula_nombre is None:
        albedo = 0.2  # Default: albedo medio
    else:
        # Consultar tipo de partícula desde la base de datos
        tipo_particula = await get_tipo_particula_por_nombre(tipo_particula_nombre)
        
        if tipo_particula and tipo_particula.get('albedo') is not None:
            albedo = float(tipo_particula['albedo'])
        else:
            # Fallback: albedo medio si no se encuentra o no tiene valor
            albedo = 0.2
    
    # Albedo alto = más frío, albedo bajo = más caliente
    # Escala: -10°C a +10°C
    # Fórmula: (0.5 - albedo) * 20.0
    # Ejemplo: albedo 0.9 (nieve) → (0.5 - 0.9) * 20 = -8°C
    #          albedo 0.1 (piedra) → (0.5 - 0.1) * 20 = +8°C
    return (0.5 - albedo) * 20.0


async def calculate_cell_temperature(
    celda_x: float,
    celda_y: float,
    celda_z: float,
    bloque_id: str,
    celestial_time_service: 'CelestialTimeService',
    tipo_particula_superficie: Optional[str] = None,
    radio_maximo: float = 1000.0,
    radio_busqueda_agua: float = 10.0
) -> float:
    """
    Calcular temperatura ambiental final de una celda
    
    Integra todos los modificadores:
    - Temperatura solar (latitud + posición del sol)
    - Modificador por altitud
    - Modificador por proximidad al agua
    - Modificador por albedo (tipo de superficie)
    
    Args:
        celda_x: Coordenada X de la celda
        celda_y: Coordenada Y de la celda
        celda_z: Coordenada Z (altura) de la celda
        bloque_id: ID del bloque
        celestial_time_service: Servicio de tiempo celestial para obtener posición del sol
        tipo_particula_superficie: Nombre del tipo de partícula en la superficie (opcional)
        radio_maximo: Radio máximo del mundo
        radio_busqueda_agua: Radio de búsqueda de agua
    
    Returns:
        Temperatura ambiental final en grados Celsius
    """
    # 1. Temperatura base por latitud y posición del sol
    temp_solar = calculate_solar_temperature(
        celda_x=celda_x,
        celda_y=celda_y,
        celestial_time_service=celestial_time_service,
        radio_maximo=radio_maximo
    )
    
    # 2. Modificador por altitud
    mod_altitud = get_altitude_modifier(altitud_z=celda_z)
    
    # 3. Modificador por proximidad al agua
    mod_agua = await get_water_modifier(
        celda_x=celda_x,
        celda_y=celda_y,
        celda_z=celda_z,
        bloque_id=bloque_id,
        radio_busqueda=radio_busqueda_agua
    )
    
    # 4. Modificador por albedo (tipo de superficie)
    mod_albedo = await get_albedo_modifier(tipo_particula_nombre=tipo_particula_superficie)
    
    # Temperatura final
    temperatura_final = temp_solar + mod_altitud + mod_agua + mod_albedo
    
    # Limitar a valores razonables
    temperatura_final = max(-50.0, min(60.0, temperatura_final))
    
    return temperatura_final

