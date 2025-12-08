"""
Script para verificar la posición de un personaje y el terreno
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.database.connection import get_connection
from src.database.utils.terrain_utils import get_terrain_height_area


async def main():
    """Verificar posición del personaje"""
    async with get_connection() as conn:
        # Obtener último personaje creado
        char = await conn.fetchrow("""
            SELECT id, nombre, posicion_x, posicion_y, posicion_z, modelo_3d
            FROM juego_dioses.agrupaciones
            WHERE tipo = 'biped'
            ORDER BY creado_en DESC
            LIMIT 1
        """)
        
        if not char:
            print("No se encontró ningún personaje")
            return
        
        # Obtener dimensión
        dim_id = await conn.fetchval("""
            SELECT dimension_id FROM juego_dioses.agrupaciones WHERE id = $1
        """, char['id'])
        
        # Calcular altura del terreno
        terrain_height = await get_terrain_height_area(
            conn, dim_id, char['posicion_x'], char['posicion_y'], radius=1
        )
        
        print(f"✓ Personaje: {char['nombre']}")
        print(f"  ID: {char['id']}")
        print(f"  Posición: ({char['posicion_x']}, {char['posicion_y']}, {char['posicion_z']})")
        print(f"  Altura del terreno: Z = {terrain_height}")
        print(f"  Diferencia: {char['posicion_z'] - terrain_height if terrain_height is not None else 'N/A'} celdas")
        print(f"  Modelo 3D: {char['modelo_3d']}")


if __name__ == "__main__":
    asyncio.run(main())

