"""
Script para limpiar personajes duplicados y dejar solo uno
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv
from uuid import UUID

load_dotenv()

POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "juegodioses")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "juegodioses123")
POSTGRES_DB = os.getenv("POSTGRES_DB", "juego_dioses")


async def cleanup_duplicate_characters():
    """
    Eliminar personajes duplicados, dejando solo el más reciente
    """
    conn = await asyncpg.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        database=POSTGRES_DB
    )
    
    try:
        # Obtener dimensión de prueba
        dimension_id = await conn.fetchval("""
            SELECT id FROM juego_dioses.dimensiones
            WHERE nombre = 'Terreno de Prueba - Primer Humano'
            LIMIT 1
        """)
        
        if not dimension_id:
            print("Error: Dimensión 'Terreno de Prueba - Primer Humano' no encontrada")
            return
        
        print(f"Limpiando personajes duplicados en dimensión {dimension_id}...")
        
        # Obtener todos los personajes (bípedos)
        characters = await conn.fetch("""
            SELECT id, nombre, creado_en, posicion_x, posicion_y, posicion_z
            FROM juego_dioses.agrupaciones
            WHERE dimension_id = $1 AND tipo = 'biped'
            ORDER BY creado_en DESC
        """, dimension_id)
        
        if not characters:
            print("No hay personajes para limpiar")
            return
        
        print(f"Encontrados {len(characters)} personajes:")
        for char in characters:
            print(f"  - ID: {char['id']}, Creado: {char['creado_en']}, Posición: ({char['posicion_x']}, {char['posicion_y']}, {char['posicion_z']})")
        
        # Mantener solo el más reciente
        if len(characters) > 1:
            keep_id = characters[0]['id']
            delete_ids = [char['id'] for char in characters[1:]]
            
            print(f"\nManteniendo personaje: {keep_id}")
            print(f"Eliminando {len(delete_ids)} personajes duplicados...")
            
            # Eliminar partículas de los personajes duplicados
            for char_id in delete_ids:
                deleted_particles = await conn.execute("""
                    DELETE FROM juego_dioses.particulas
                    WHERE agrupacion_id = $1 AND dimension_id = $2
                """, char_id, dimension_id)
                print(f"  Eliminadas partículas del personaje {char_id}")
            
            # Eliminar agrupaciones duplicadas
            for char_id in delete_ids:
                await conn.execute("""
                    DELETE FROM juego_dioses.agrupaciones
                    WHERE id = $1
                """, char_id)
                print(f"  Eliminado personaje {char_id}")
            
            print(f"\n✓ Limpieza completada. Se mantiene 1 personaje de {len(characters)}")
        else:
            print("Solo hay 1 personaje, no se necesita limpieza")
        
    except Exception as e:
        print(f"Error al limpiar personajes: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(cleanup_duplicate_characters())

