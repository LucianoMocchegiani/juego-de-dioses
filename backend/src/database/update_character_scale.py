"""Script para actualizar la escala del modelo 3D del personaje"""
import asyncio
from src.database.connection import get_connection
import json

async def update_scale():
    async with get_connection() as conn:
        # Buscar el personaje más reciente con modelo_3d
        agrupacion = await conn.fetchrow("""
            SELECT id, modelo_3d, dimension_id
            FROM juego_dioses.agrupaciones
            WHERE tipo = 'biped' AND modelo_3d IS NOT NULL
            ORDER BY creado_en DESC
            LIMIT 1
        """)
        
        if not agrupacion:
            print("⚠️  No se encontró ningún personaje con modelo_3d")
            return
        
        # Parsear modelo_3d actual
        modelo_3d_data = json.loads(agrupacion['modelo_3d']) if isinstance(agrupacion['modelo_3d'], str) else agrupacion['modelo_3d']
        
        # Actualizar escala a 0.001 (0.1% del tamaño original) - MUY pequeño para caber en área 40x40
        # El modelo Fox es ENORME (154m de largo), necesitamos reducirlo drásticamente
        # Con 0.001, el modelo debería tener ~0.15 metros (15 cm) de largo
        modelo_3d_data['escala'] = 0.001
        
        # Guardar actualizado
        await conn.execute("""
            UPDATE juego_dioses.agrupaciones
            SET modelo_3d = $1::jsonb
            WHERE id = $2
        """, json.dumps(modelo_3d_data), agrupacion['id'])
        
        print(f"✓ Escala actualizada a 0.2 para personaje {agrupacion['id']}")
        print(f"  Modelo 3D actualizado: {json.dumps(modelo_3d_data, indent=2)}")

if __name__ == "__main__":
    asyncio.run(update_scale())

