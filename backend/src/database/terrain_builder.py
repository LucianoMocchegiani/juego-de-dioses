"""
Funciones helper para construcción de terrenos y límites de dimensiones
"""
import asyncpg
import json
from uuid import UUID
from typing import Dict


async def create_boundary_layer(conn: asyncpg.Connection, dimension_id: UUID, dimension_data: Dict) -> int:
    """
    Crear capa de partículas límite en el límite inferior de la dimensión.
    
    Esta función crea una capa completa de partículas 'límite' en z = profundidad_maxima
    que cubre todo el área horizontal de la dimensión. Estas partículas son indestructibles
    y transparentes, actuando como barrera del mundo.
    
    Args:
        conn: Conexión asyncpg a la base de datos
        dimension_id: UUID de la dimensión
        dimension_data: Dict con ancho_metros, alto_metros, profundidad_maxima, tamano_celda
        
    Returns:
        Número de partículas límite creadas
        
    Raises:
        ValueError: Si el tipo 'límite' no existe en la base de datos
    """
    # Obtener tipo límite
    tipo_limite_id = await conn.fetchval(
        "SELECT id FROM juego_dioses.tipos_particulas WHERE nombre = 'límite'"
    )
    
    if not tipo_limite_id:
        raise ValueError("Tipo de partícula 'límite' no existe en la base de datos. Ejecuta primero los scripts de inicialización.")
    
    # Obtener estado sólido (para partículas límite)
    estado_solido_id = await conn.fetchval(
        "SELECT id FROM juego_dioses.estados_materia WHERE nombre = 'solido'"
    )
    
    if not estado_solido_id:
        raise ValueError("Estado de materia 'solido' no existe en la base de datos.")
    
    # Calcular celdas
    celdas_x = int(dimension_data['ancho_metros'] / dimension_data['tamano_celda'])
    celdas_y = int(dimension_data['alto_metros'] / dimension_data['tamano_celda'])
    z_limite = dimension_data['profundidad_maxima']
    
    # Crear partículas límite para toda el área horizontal
    particulas = []
    for x in range(celdas_x):
        for y in range(celdas_y):
            particulas.append((
                dimension_id,
                x,
                y,
                z_limite,
                tipo_limite_id,
                estado_solido_id,
                1.0,  # cantidad
                0.0,  # temperatura
                0.0,  # energia
                False,  # extraida
                None,  # agrupacion_id
                False,  # es_nucleo
                json.dumps({})  # propiedades
            ))
    
    # Insertar en batch para mejor rendimiento
    await conn.executemany("""
        INSERT INTO juego_dioses.particulas 
        (bloque_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
         cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
        ON CONFLICT (bloque_id, celda_x, celda_y, celda_z) DO NOTHING
    """, particulas)
    
    return len(particulas)

