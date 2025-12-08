"""Script para verificar personajes y sus dimensiones"""
import asyncio
from src.database.connection import get_connection

async def check():
    async with get_connection() as conn:
        chars = await conn.fetch("""
            SELECT a.id, a.nombre, 
                   a.dimension_id,
                   d.nombre as dimension_nombre,
                   a.modelo_3d IS NOT NULL as tiene_modelo,
                   a.creado_en
            FROM juego_dioses.agrupaciones a
            JOIN juego_dioses.dimensiones d ON a.dimension_id = d.id
            WHERE a.tipo = 'biped' 
            ORDER BY a.creado_en DESC
        """)
        
        print(f"Total personajes: {len(chars)}")
        print("\nPersonajes por dimensión:")
        for c in chars:
            print(f"  ID: {c['id']}")
            print(f"  Nombre: {c['nombre']}")
            print(f"  Dimensión ID: {c['dimension_id']}")
            print(f"  Dimensión Nombre: {c['dimension_nombre']}")
            print(f"  Tiene modelo_3d: {c['tiene_modelo']}")
            print(f"  Creado: {c['creado_en']}")
            print()

if __name__ == "__main__":
    asyncio.run(check())

