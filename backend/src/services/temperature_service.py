"""
Servicio de Temperatura Ambiental

Calcula temperatura ambiental según múltiples factores:
- Temperatura solar (latitud + posición del sol)
- Modificador por altitud
- Modificador por proximidad al agua
- Modificador por albedo (tipo de superficie)

También gestiona la actualización de temperatura de partículas individuales
basándose en su inercia_termica y la temperatura ambiental.
"""

import math
from typing import Optional, TYPE_CHECKING, Dict, Any, List
import asyncpg
from src.config import CELESTIAL_CONFIG

if TYPE_CHECKING:
    from .celestial_time_service import CelestialTimeService


def calculate_solar_temperature(
    celda_x: float,
    celda_y: float,
    celestial_time_service: 'CelestialTimeService',
    radio_maximo: Optional[float] = None
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
        radio_maximo: Radio máximo del mundo (unidades). Si es None, usa valor de configuración
    
    Returns:
        Temperatura base en grados Celsius
    """
    # Usar radio del mundo desde configuración si no se proporciona
    if radio_maximo is None:
        radio_maximo = CELESTIAL_CONFIG['RADIO_MUNDO']
    
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
    temp_ambiente: Optional[float] = None,
    radio_busqueda: float = 10.0
) -> float:
    """
    Calcular modificador de temperatura por proximidad al agua/hielo.
    
    MEJORADO: Ahora lee temperatura real del agua/hielo y calcula
    modificador basado en diferencia de temperatura.
    
    Args:
        celda_x: Coordenada X de la celda
        celda_y: Coordenada Y de la celda
        celda_z: Coordenada Z (altura) de la celda
        bloque_id: ID del bloque
        temp_ambiente: Temperatura ambiental (para calcular diferencia). Si es None, usa comportamiento antiguo.
        radio_busqueda: Radio de búsqueda de agua (celdas)
    
    Returns:
        Modificador de temperatura en grados Celsius
    """
    from .particula_service import get_particulas_vecinas
    from .particula_service import calcular_distancia
    from .particula_service import get_tipo_particula_por_nombre
    
    # Buscar partículas de agua/hielo cercanas
    particulas_cercanas = await get_particulas_vecinas(
        bloque_id=bloque_id,
        celda_x=int(celda_x),
        celda_y=int(celda_y),
        celda_z=int(celda_z),
        radio=int(radio_busqueda)
    )
    
    # Si no hay temp_ambiente, usar comportamiento antiguo (compatibilidad)
    if temp_ambiente is None:
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
        return factor * 5.0
    
    # Comportamiento mejorado con temperatura real
    modificador_total = 0.0
    
    for particula in particulas_cercanas:
        tipo_nombre = particula.get('tipo_nombre', '').lower()
        if tipo_nombre in ['agua', 'oceano', 'agua_sucia', 'hielo']:
            # Leer temperatura real de la partícula (convertir Decimal a float si es necesario)
            temp_particula_raw = particula.get('temperatura', 20.0)
            temp_particula = float(temp_particula_raw) if temp_particula_raw is not None else 20.0
            
            # Calcular diferencia de temperatura
            diferencia = temp_particula - temp_ambiente
            
            # Calcular distancia
            distancia = calcular_distancia(
                celda_x, celda_y, celda_z,
                particula['celda_x'], particula['celda_y'], particula['celda_z']
            )
            
            # Obtener propiedades del tipo de partícula
            tipo_particula = await get_tipo_particula_por_nombre(tipo_nombre)
            conductividad = float(tipo_particula.get('conductividad_termica', 1.0)) if tipo_particula else 1.0
            
            # Propagación de calor (ley del cuadrado inverso)
            factor_distancia = 1.0 / (1.0 + distancia ** 2)
            
            # Máximo efecto dentro de 5 celdas
            factor_proximidad = max(0.0, 1.0 - (distancia / 5.0))
            
            # Modificador: diferencia * factor_distancia * conductividad * factor_proximidad
            modificador = diferencia * factor_distancia * conductividad * factor_proximidad
            modificador_total += modificador
    
    return modificador_total


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
    radio_maximo: Optional[float] = None,
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
        radio_maximo: Radio máximo del mundo. Si es None, usa valor de configuración
        radio_busqueda_agua: Radio de búsqueda de agua
    
    Returns:
        Temperatura ambiental final en grados Celsius
    """
    # Usar radio del mundo desde configuración si no se proporciona
    if radio_maximo is None:
        radio_maximo = CELESTIAL_CONFIG['RADIO_MUNDO']
    
    # 1. Temperatura base por latitud y posición del sol
    temp_solar = calculate_solar_temperature(
        celda_x=celda_x,
        celda_y=celda_y,
        celestial_time_service=celestial_time_service,
        radio_maximo=radio_maximo
    )
    
    # 2. Modificador por altitud
    mod_altitud = get_altitude_modifier(altitud_z=celda_z)
    
    # 3. Modificador por albedo (tipo de superficie)
    mod_albedo = await get_albedo_modifier(tipo_particula_nombre=tipo_particula_superficie)
    
    # Calcular temperatura ambiental base (sin modificadores de partículas)
    temp_ambiente_base = temp_solar + mod_altitud + mod_albedo
    
    # 4. Modificador por partículas (agua, hielo, lava) - NUEVO
    mod_particulas = await get_particle_temperature_modifier(
        celda_x=celda_x,
        celda_y=celda_y,
        celda_z=celda_z,
        bloque_id=bloque_id,
        temp_ambiente=temp_ambiente_base,
        tipos_particulas=['agua', 'oceano', 'agua_sucia', 'hielo'],
        radio_busqueda=radio_busqueda_agua
    )
    
    # Mantener get_water_modifier() mejorado para compatibilidad
    # (puede eliminarse en el futuro si no se usa)
    mod_agua = await get_water_modifier(
        celda_x=celda_x,
        celda_y=celda_y,
        celda_z=celda_z,
        bloque_id=bloque_id,
        temp_ambiente=temp_ambiente_base,  # pasar temperatura ambiental
        radio_busqueda=radio_busqueda_agua
    )
    
    # Usar mod_particulas (más genérico) en lugar de mod_agua
    temperatura_final = temp_ambiente_base + mod_particulas
    
    # Limitar a valores razonables
    temperatura_final = max(-50.0, min(60.0, temperatura_final))
    
    return temperatura_final


# ============================================================================
# FUNCIONES DE ACTUALIZACIÓN DE TEMPERATURA DE PARTÍCULAS
# ============================================================================

async def update_particle_temperature(
    particula_id: str,
    temp_ambiente: float,
    tipo_particula: Dict[str, Any],
    conn: asyncpg.Connection
) -> float:
    """
    Actualizar temperatura de una partícula según temperatura ambiental.
    
    El cambio de temperatura depende de la inercia_termica:
    - Alta inercia (agua: 4.0) → cambia lentamente
    - Baja inercia (metal: 0.5) → cambia rápidamente
    
    Args:
        particula_id: ID de la partícula
        temp_ambiente: Temperatura ambiental (del bloque)
        tipo_particula: Diccionario con propiedades del tipo (inercia_termica)
        conn: Conexión a la base de datos
    
    Returns:
        Nueva temperatura de la partícula
    """
    # 1. Obtener temperatura actual de la partícula desde la BD
    temp_actual_raw = await conn.fetchval(
        "SELECT temperatura FROM juego_dioses.particulas WHERE id = $1",
        particula_id
    )
    
    # Convertir Decimal a float si es necesario (PostgreSQL retorna Decimal)
    if temp_actual_raw is None:
        temp_actual = float(temp_ambiente)
    else:
        temp_actual = float(temp_actual_raw)
    
    # 2. Calcular diferencia entre temperatura ambiental y temperatura actual de la partícula
    # Si diferencia > 0: el ambiente está más caliente → la partícula se calienta
    # Si diferencia < 0: el ambiente está más frío → la partícula se enfría
    diferencia = float(temp_ambiente) - temp_actual
    
    # 3. Calcular factor de cambio según inercia_termica del tipo de partícula
    # La inercia_termica determina qué tan rápido cambia la temperatura:
    # - Alta inercia (agua: 4.0) → cambia LENTAMENTE (factor pequeño)
    # - Baja inercia (metal: 0.5) → cambia RÁPIDAMENTE (factor grande)
    inercia = float(tipo_particula.get('inercia_termica', 1.0))
    
    # Si inercia es 0 o negativa, la partícula no cambia de temperatura
    if inercia <= 0:
        return temp_actual
    
    # Factor de cambio: inverso de la inercia
    # Ejemplo: inercia 4.0 → factor 0.25 (cambia 25% de la diferencia)
    # Ejemplo: inercia 0.5 → factor 2.0 (cambia 200% de la diferencia, pero limitado)
    factor_cambio = 1.0 / inercia
    
    # 4. Calcular nueva temperatura
    # La partícula se acerca a la temperatura ambiental, pero no completamente
    # Cuanto mayor la inercia, más lento el cambio
    # Ejemplo: temp_actual=20°C, temp_ambiente=30°C, inercia=4.0
    #   diferencia = 10°C
    #   factor_cambio = 0.25
    #   nueva_temp = 20 + (10 * 0.25) = 20 + 2.5 = 22.5°C
    nueva_temp = temp_actual + (diferencia * factor_cambio)
    
    # 5. Limitar a valores razonables para evitar temperaturas extremas
    # Mínimo: -50°C (muy frío, pero posible)
    # Máximo: 1000°C (muy caliente, para lava/fuego)
    nueva_temp = max(-50.0, min(1000.0, nueva_temp))
    
    # 6. Guardar la nueva temperatura en la base de datos
    await conn.execute(
        "UPDATE juego_dioses.particulas SET temperatura = $1 WHERE id = $2",
        nueva_temp, particula_id
    )
    
    return nueva_temp


async def get_particle_temperature_modifier(
    celda_x: float,
    celda_y: float,
    celda_z: float,
    bloque_id: str,
    temp_ambiente: float,
    tipos_particulas: List[str],
    radio_busqueda: float = 10.0
) -> float:
    """
    Calcular modificador de temperatura por partículas de tipos específicos.
    
    Función genérica que funciona para cualquier tipo de partícula
    (agua, hielo, lava, etc.).
    
    Args:
        celda_x: Coordenada X de la celda
        celda_y: Coordenada Y de la celda
        celda_z: Coordenada Z (altura) de la celda
        bloque_id: ID del bloque
        temp_ambiente: Temperatura ambiental
        tipos_particulas: Lista de nombres de tipos a buscar (ej: ['agua', 'hielo'])
        radio_busqueda: Radio de búsqueda (celdas)
    
    Returns:
        Modificador de temperatura en grados Celsius
    """
    from .particula_service import get_particulas_vecinas
    from .particula_service import calcular_distancia
    from .particula_service import get_tipo_particula_por_nombre
    
    # Buscar partículas cercanas
    particulas_cercanas = await get_particulas_vecinas(
        bloque_id=bloque_id,
        celda_x=int(celda_x),
        celda_y=int(celda_y),
        celda_z=int(celda_z),
        radio=int(radio_busqueda)
    )
    
    modificador_total = 0.0
    
    # Normalizar nombres de tipos para comparación
    tipos_normalizados = [t.lower() for t in tipos_particulas]
    
    for particula in particulas_cercanas:
        tipo_nombre = particula.get('tipo_nombre', '').lower()
        if tipo_nombre in tipos_normalizados:
            # Leer temperatura real (convertir Decimal a float si es necesario)
            temp_particula_raw = particula.get('temperatura', 20.0)
            temp_particula = float(temp_particula_raw) if temp_particula_raw is not None else 20.0
            
            # Calcular diferencia
            diferencia = temp_particula - float(temp_ambiente)
            
            # Calcular distancia
            distancia = calcular_distancia(
                celda_x, celda_y, celda_z,
                particula['celda_x'], particula['celda_y'], particula['celda_z']
            )
            
            # Obtener propiedades del tipo
            tipo_particula = await get_tipo_particula_por_nombre(tipo_nombre)
            conductividad = float(tipo_particula.get('conductividad_termica', 1.0)) if tipo_particula else 1.0
            
            # Propagación de calor
            factor_distancia = 1.0 / (1.0 + distancia ** 2)
            factor_proximidad = max(0.0, 1.0 - (distancia / 5.0))
            
            modificador = diferencia * factor_distancia * conductividad * factor_proximidad
            modificador_total += modificador
    
    return modificador_total

