"""
Servicio de partículas: Funciones auxiliares para consultar y manipular partículas.

Este módulo contiene funciones básicas para:
- Consultar partículas por ID, posición o radio
- Consultar tipos de partículas
- Calcular distancias y validar condiciones
"""

from typing import Optional, List, Dict, Any
import math
import asyncpg
from ..database.connection import get_connection


# ============================================================================
# FUNCIONES DE CONSULTA DE PARTÍCULAS
# ============================================================================

async def get_particula(particula_id: str) -> Optional[Dict[str, Any]]:
    """
    Obtiene una partícula por su ID.
    
    Args:
        particula_id: UUID de la partícula
        
    Returns:
        Diccionario con los datos de la partícula (incluye tipo_nombre y tipo_fisico)
        o None si no existe
    """
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT 
                p.*,
                tp.nombre as tipo_nombre,
                tp.tipo_fisico,
                tp.densidad,
                tp.conductividad_termica,
                tp.inercia_termica,
                tp.conductividad_electrica,
                tp.magnetismo
            FROM juego_dioses.particulas p
            JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
            WHERE p.id = $1
            """,
            particula_id
        )
        return dict(row) if row else None


async def get_particula_en_posicion(
    bloque_id: str,
    celda_x: int,
    celda_y: int,
    celda_z: int
) -> Optional[Dict[str, Any]]:
    """
    Obtiene la partícula en una posición específica (celda exacta).
    
    Si hay múltiples partículas en la misma celda, retorna la más superficial
    (mayor Z) o la primera encontrada.
    
    Args:
        bloque_id: ID del bloque (mundo/dimensión)
        celda_x: Coordenada X de la celda
        celda_y: Coordenada Y de la celda
        celda_z: Coordenada Z de la celda
        
    Returns:
        Diccionario con los datos de la partícula o None si no hay partícula
    """
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT 
                p.*,
                tp.nombre as tipo_nombre,
                tp.tipo_fisico
            FROM juego_dioses.particulas p
            JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
            WHERE p.bloque_id = $1
            AND p.celda_x = $2
            AND p.celda_y = $3
            AND p.celda_z = $4
            ORDER BY p.celda_z DESC, p.creado_en ASC
            LIMIT 1
            """,
            bloque_id, celda_x, celda_y, celda_z
        )
        return dict(row) if row else None


async def get_particulas_vecinas(
    bloque_id: str,
    celda_x: int,
    celda_y: int,
    celda_z: int,
    radio: int = 1
) -> List[Dict[str, Any]]:
    """
    Obtiene partículas vecinas dentro de un radio esférico.
    
    Usa distancia euclidiana: sqrt((x1-x2)² + (y1-y2)² + (z1-z2)²)
    
    Args:
        bloque_id: ID del bloque (mundo/dimensión)
        celda_x: Coordenada X del centro
        celda_y: Coordenada Y del centro
        celda_z: Coordenada Z del centro
        radio: Radio de búsqueda en celdas (default: 1)
        
    Returns:
        Lista de diccionarios con los datos de las partículas encontradas
    """
    async with get_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT 
                p.*,
                tp.nombre as tipo_nombre,
                tp.tipo_fisico
            FROM juego_dioses.particulas p
            JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
            WHERE p.bloque_id = $1
            AND ABS(p.celda_x - $2) <= $5
            AND ABS(p.celda_y - $3) <= $5
            AND ABS(p.celda_z - $4) <= $5
            AND (
                POWER(p.celda_x - $2, 2) + 
                POWER(p.celda_y - $3, 2) + 
                POWER(p.celda_z - $4, 2)
            ) <= POWER($5, 2)
            ORDER BY 
                POWER(p.celda_x - $2, 2) + 
                POWER(p.celda_y - $3, 2) + 
                POWER(p.celda_z - $4, 2)
            """,
            bloque_id, celda_x, celda_y, celda_z, radio
        )
        return [dict(row) for row in rows]


async def get_particulas_cercanas(
    bloque_id: str,
    celda_x: int,
    celda_y: int,
    celda_z: int,
    radio: int
) -> List[Dict[str, Any]]:
    """
    Alias de get_particulas_vecinas para mantener compatibilidad.
    
    Obtiene todas las partículas dentro de un radio esférico desde una posición.
    
    Args:
        bloque_id: ID del bloque (mundo/dimensión)
        celda_x: Coordenada X del centro
        celda_y: Coordenada Y del centro
        celda_z: Coordenada Z del centro
        radio: Radio de búsqueda en celdas
        
    Returns:
        Lista de diccionarios con los datos de las partículas encontradas
    """
    return await get_particulas_vecinas(bloque_id, celda_x, celda_y, celda_z, radio)


# ============================================================================
# FUNCIONES DE CONSULTA DE TIPOS DE PARTÍCULAS
# ============================================================================

async def get_tipo_particula(tipo_id: str) -> Optional[Dict[str, Any]]:
    """
    Obtiene un tipo de partícula por su ID.
    
    Args:
        tipo_id: UUID del tipo de partícula
        
    Returns:
        Diccionario con los datos del tipo de partícula o None si no existe
    """
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT * FROM juego_dioses.tipos_particulas
            WHERE id = $1
            """,
            tipo_id
        )
        return dict(row) if row else None


async def get_tipo_particula_por_nombre(nombre: str) -> Optional[Dict[str, Any]]:
    """
    Obtiene un tipo de partícula por su nombre.
    
    Args:
        nombre: Nombre del tipo (ej: 'madera', 'agua', 'fuego')
        
    Returns:
        Diccionario con los datos del tipo de partícula o None si no existe
    """
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT * FROM juego_dioses.tipos_particulas
            WHERE nombre = $1
            """,
            nombre
        )
        return dict(row) if row else None


# ============================================================================
# FUNCIONES DE CÁLCULO Y UTILIDADES
# ============================================================================

def calcular_distancia(
    x1: int, y1: int, z1: int,
    x2: int, y2: int, z2: int
) -> float:
    """
    Calcula la distancia euclidiana entre dos puntos 3D.
    
    Fórmula: sqrt((x2-x1)² + (y2-y1)² + (z2-z1)²)
    
    Args:
        x1, y1, z1: Coordenadas del primer punto
        x2, y2, z2: Coordenadas del segundo punto
        
    Returns:
        Distancia en celdas (float)
    """
    return math.sqrt(
        (x2 - x1) ** 2 + 
        (y2 - y1) ** 2 + 
        (z2 - z1) ** 2
    )


def calcular_distancia_particulas(
    particula1: Dict[str, Any],
    particula2: Dict[str, Any]
) -> float:
    """
    Calcula la distancia entre dos partículas usando sus coordenadas.
    
    Args:
        particula1: Diccionario con partícula (debe tener celda_x, celda_y, celda_z)
        particula2: Diccionario con partícula (debe tener celda_x, celda_y, celda_z)
        
    Returns:
        Distancia en celdas (float)
    """
    return calcular_distancia(
        particula1['celda_x'], particula1['celda_y'], particula1['celda_z'],
        particula2['celda_x'], particula2['celda_y'], particula2['celda_z']
    )


def evaluar_temperatura(
    temperatura: float,
    operador: str,
    valor: float,
    histeresis: float = 0.0
) -> bool:
    """
    Evalúa si una temperatura cumple una condición, considerando histeresis.
    
    La histeresis evita cambios constantes de estado (ej: agua que congela y
    se derrite repetidamente cerca de 0°C).
    
    Args:
        temperatura: Temperatura actual en °C
        operador: Operador de comparación ('<', '<=', '>', '>=', '==')
        valor: Valor de referencia en °C
        histeresis: Diferencia de temperatura para evitar oscilaciones (default: 0.0)
        
    Returns:
        True si la condición se cumple, False si no
        
    Ejemplo:
        # Agua congela a < 0°C, pero con histeresis de 2°C
        # Solo congela si temperatura < -2°C
        debe_congelar = evaluar_temperatura(-3.0, '<', 0.0, 2.0)  # True
        
        # Hielo se derrite a > 0°C, pero con histeresis de 2°C
        # Solo se derrite si temperatura > 2°C
        debe_derretir = evaluar_temperatura(1.0, '>', 0.0, 2.0)  # False
    """
    valor_ajustado = valor
    
    # Ajustar valor según operador y histeresis
    if operador in ('<', '<='):
        valor_ajustado = valor - histeresis  # Hacer más estricto
    elif operador in ('>', '>='):
        valor_ajustado = valor + histeresis  # Hacer más estricto
    
    # Evaluar condición
    if operador == '<':
        return temperatura < valor_ajustado
    elif operador == '<=':
        return temperatura <= valor_ajustado
    elif operador == '>':
        return temperatura > valor_ajustado
    elif operador == '>=':
        return temperatura >= valor_ajustado
    elif operador == '==':
        return abs(temperatura - valor) < 0.1  # Tolerancia para igualdad
    else:
        raise ValueError(f"Operador no válido: {operador}. Use: '<', '<=', '>', '>=', '=='")


# ============================================================================
# FUNCIONES DE TRANSICIONES
# ============================================================================

async def get_transiciones(tipo_particula_id: str) -> List[Dict[str, Any]]:
    """
    Obtiene todas las transiciones posibles para un tipo de partícula.
    
    Solo retorna transiciones activas, ordenadas por prioridad (mayor a menor).
    
    Args:
        tipo_particula_id: UUID del tipo de partícula
    
    Returns:
        Lista de diccionarios con los datos de las transiciones
        (ordenadas por prioridad DESC)
    """
    async with get_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT * FROM juego_dioses.transiciones_particulas
            WHERE tipo_origen_id = $1
            AND activa = true
            ORDER BY prioridad DESC
            """,
            tipo_particula_id
        )
        return [dict(row) for row in rows]


async def get_particulas_con_inercia(
    bloque_id: str,
    conn: asyncpg.Connection,
    inercia_minima: float = 0.1
) -> List[Dict[str, Any]]:
    """
    Obtener partículas de un bloque que tienen inercia_termica > 0.
    
    Estas partículas necesitan actualización periódica de temperatura.
    
    Args:
        bloque_id: ID del bloque
        conn: Conexión a la base de datos
        inercia_minima: Valor mínimo de inercia_termica para incluir
    
    Returns:
        Lista de partículas con sus tipos y propiedades
    """
    rows = await conn.fetch(
        """
        SELECT 
            p.id,
            p.celda_x,
            p.celda_y,
            p.celda_z,
            p.temperatura,
            tp.nombre as tipo_nombre,
            tp.inercia_termica,
            tp.conductividad_termica
        FROM juego_dioses.particulas p
        JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
        WHERE p.bloque_id = $1
          AND p.extraida = false
          AND tp.inercia_termica > $2
        """,
        bloque_id, inercia_minima
    )
    
    return [dict(row) for row in rows]

