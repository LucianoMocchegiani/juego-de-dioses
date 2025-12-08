"""Script para verificar personajes en la BD"""
import asyncio
from src.database.connection import get_connection

async def check():
    async with get_connection() as conn:
        chars = await conn.fetch("""
            SELECT id, nombre, 
                   modelo_3d IS NOT NULL as tiene_modelo,
                   creado_en
            FROM juego_dioses.agrupaciones 
            WHERE tipo = 'biped' 
            ORDER BY creado_en DESC
        """)
        
        print(f"Total personajes: {len(chars)}")
        print("\nPersonajes:")
        for c in chars:
            print(f"  ID: {c['id']}")
            print(f"  Nombre: {c['nombre']}")
            print(f"  Tiene modelo_3d: {c['tiene_modelo']}")
            print(f"  Creado: {c['creado_en']}")
            print()

if __name__ == "__main__":
    asyncio.run(check())

