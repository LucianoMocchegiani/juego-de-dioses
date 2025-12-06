"""
Script para limpiar partículas físicas de personajes (bípedos) existentes.

Este script elimina las partículas físicas que fueron creadas para personajes
antes de implementar el sistema sin partículas físicas.

Los personajes ahora solo existen como agrupaciones con geometria_agrupacion,
sin partículas físicas en el mapa.
"""

import asyncio
import asyncpg
from src.database.connection import get_connection


async def cleanup_character_particles(dimension_id: str = None):
    """
    Eliminar todas las partículas físicas de personajes (bípedos)
    
    Args:
        dimension_id: ID de la dimensión (opcional, si None limpia todas las dimensiones)
    """
    async with get_connection() as conn:
        # Obtener todas las agrupaciones de tipo 'biped'
        if dimension_id:
            agrupaciones = await conn.fetch("""
                SELECT id, nombre, dimension_id
                FROM juego_dioses.agrupaciones
                WHERE tipo = 'biped' AND dimension_id = $1
            """, dimension_id)
        else:
            agrupaciones = await conn.fetch("""
                SELECT id, nombre, dimension_id
                FROM juego_dioses.agrupaciones
                WHERE tipo = 'biped'
            """)
        
        if not agrupaciones:
            print("No se encontraron agrupaciones de personajes (bípedos)")
            return
        
        print(f"Encontradas {len(agrupaciones)} agrupación(es) de personajes")
        
        total_deleted = 0
        for agrupacion in agrupaciones:
            # Contar partículas antes de eliminar
            count_before = await conn.fetchval("""
                SELECT COUNT(*)
                FROM juego_dioses.particulas
                WHERE agrupacion_id = $1 AND dimension_id = $2
            """, agrupacion['id'], agrupacion['dimension_id'])
            
            if count_before and count_before > 0:
                # Eliminar partículas de esta agrupación
                deleted = await conn.execute("""
                    DELETE FROM juego_dioses.particulas
                    WHERE agrupacion_id = $1 AND dimension_id = $2
                """, agrupacion['id'], agrupacion['dimension_id'])
                
                # Extraer número de filas eliminadas del resultado
                deleted_count = int(deleted.split()[-1]) if deleted else 0
                total_deleted += deleted_count
                
                print(f"  - {agrupacion['nombre']} (ID: {agrupacion['id']}): "
                      f"Eliminadas {deleted_count} partículas")
            else:
                print(f"  - {agrupacion['nombre']} (ID: {agrupacion['id']}): "
                      f"Sin partículas físicas (ya limpio)")
        
        print(f"\n✓ Total de partículas eliminadas: {total_deleted}")
        print("✓ Los personajes ahora solo existen como agrupaciones con geometria_agrupacion")


async def main():
    """Función principal"""
    import sys
    
    # Permitir pasar dimension_id como argumento
    dimension_id = sys.argv[1] if len(sys.argv) > 1 else None
    
    if dimension_id:
        print(f"Limpiando partículas de personajes en dimensión: {dimension_id}")
    else:
        print("Limpiando partículas de personajes en todas las dimensiones")
    
    await cleanup_character_particles(dimension_id)
    print("\n✓ Limpieza completada")


if __name__ == "__main__":
    asyncio.run(main())

