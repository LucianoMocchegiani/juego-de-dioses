"""
Script para actualizar la escala y offset del modelo Character_output.glb

Ajusta la escala y el offset Z para que el modelo esté sobre el suelo.
El modelo Character_output.glb se reemplaza automáticamente por el modelo de las animaciones
que tiene el esqueleto correcto, pero las transformaciones (escala, offset, rotación) se preservan.

Uso:
    python src/database/update_human_scale.py

Para ajustar manualmente, edita las variables nueva_escala y offset_z en este script.
"""
import asyncio
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.database.connection import get_connection


async def main():
    """Actualizar escala y offset del modelo Character_output.glb"""
    
    # Escala a aplicar (ajustar según necesidad)
    # El modelo de las animaciones es más pequeño, aumentar escala
    nueva_escala = 5.0  # Empezar con 5.0, ajustar según necesidad
    
    # Offset Z para elevar el modelo (en metros)
    # IMPORTANTE: El offset Z depende del terreno de cada dimensión.
    # - Si el modelo aparece enterrado, aumentar este valor (ej: 1.0, 1.5, 2.0)
    # - Si el modelo está flotando, disminuir este valor (ej: 0.5, 0.0)
    # - Ajustar según necesidad con Character_output.glb
    offset_z = 0.0  # Ajustar según el terreno de la dimensión
    
    # Rotación Z del juego (que se mapea a Y de Three.js) para rotar horizontalmente
    # 180 grados = mirar hacia atrás (de espaldas a la cámara)
    rotacion_z = 180.0  # Rotar 180 grados en Z del juego (Y de Three.js) para que mire de espaldas
    
    async with get_connection() as conn:
        # Actualizar escala, offset y rotación usando jsonb_set directamente en SQL
        # También limpiar rotacion.y anterior si existe
        result = await conn.execute("""
            UPDATE juego_dioses.agrupaciones
            SET modelo_3d = jsonb_set(
                jsonb_set(
                    jsonb_set(
                        jsonb_set(
                            COALESCE(modelo_3d, '{}'::jsonb),
                            '{escala}',
                            $1::jsonb
                        ),
                        '{offset,z}',
                        $2::jsonb
                    ),
                    '{rotacion,z}',
                    $3::jsonb
                ),
                '{rotacion,y}',
                '0'::jsonb
            )
            WHERE modelo_3d->>'ruta' = 'characters/Character_output.glb'
        """, str(nueva_escala), str(offset_z), str(rotacion_z))
        
        print(f"✓ Escala actualizada a {nueva_escala}")
        print(f"✓ Offset Z actualizado a {offset_z} metros")
        print(f"✓ Rotación Z (Y de Three.js) actualizada a {rotacion_z} grados")
        print(f"  Filas afectadas: {result}")
        print(f"\n Nota: Si el modelo aparece enterrado o flotando, ajusta 'offset_z' en este script")
        print(f"   y vuelve a ejecutarlo. El offset Z depende del terreno de cada dimensión.")
        
        # Verificar el cambio
        agrupacion = await conn.fetchrow("""
            SELECT id, nombre, modelo_3d
            FROM juego_dioses.agrupaciones
            WHERE modelo_3d->>'ruta' = 'characters/Character_output.glb'
            ORDER BY creado_en DESC
            LIMIT 1
        """)
        
        if agrupacion:
            print(f"✓ Personaje: {agrupacion['nombre']}")
            # modelo_3d ya viene como dict de asyncpg, solo mostrar
            print(f"  Modelo 3D: {agrupacion['modelo_3d']}")


if __name__ == "__main__":
    asyncio.run(main())

