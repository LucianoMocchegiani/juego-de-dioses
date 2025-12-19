"""
Script de seed/base para actualizar rutas de modelos 3D a estructura biped/male/

Actualiza rutas de modelos de personajes desde:
- characters/Character_output.glb -> biped/male/characters/biped_male.glb
- characters/Meshy_AI_Character_output.glb -> biped/male/characters/biped_male.glb
- Cualquier otra ruta en characters/ -> biped/male/characters/

Este script es idempotente: puede ejecutarse múltiples veces sin problemas.
Actualiza solo los registros que requieren cambios, ignorando los que ya están correctos.
"""
import asyncio
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.database.connection import get_connection


async def migrate_model_paths():
    """Actualizar rutas de modelos en la base de datos"""
    async with get_connection() as conn:
        # Obtener todas las agrupaciones con modelo_3d
        agrupaciones = await conn.fetch("""
            SELECT id, modelo_3d, tipo
            FROM juego_dioses.agrupaciones
            WHERE modelo_3d IS NOT NULL
            AND tipo = 'biped'
        """)
        
        updated = 0
        skipped = 0
        errors = 0
        
        print(f"Encontradas {len(agrupaciones)} agrupaciones biped con modelo_3d\n")
        
        for agrupacion in agrupaciones:
            try:
                modelo_3d = json.loads(agrupacion['modelo_3d']) if isinstance(agrupacion['modelo_3d'], str) else agrupacion['modelo_3d']
                
                old_ruta = modelo_3d.get('ruta', '')
                
                # Migrar de estructura antigua a nueva
                new_ruta = None
                
                if old_ruta.startswith('characters/'):
                    # Modelo: characters/Character_output.glb -> biped/male/characters/biped_male.glb
                    # Modelo: characters/Meshy_AI_Character_output.glb -> biped/male/characters/biped_male.glb
                    if 'Character_output.glb' in old_ruta or 'Meshy_AI_Character_output.glb' in old_ruta:
                        new_ruta = 'biped/male/characters/biped_male.glb'
                    else:
                        # Otros modelos de characters (mantener estructura pero mover)
                        filename = old_ruta.replace('characters/', '')
                        new_ruta = f'biped/male/characters/{filename}'
                elif old_ruta.startswith('biped/male/characters/'):
                    # Si ya está en la estructura nueva pero con nombre antiguo
                    if 'Character_output.glb' in old_ruta or 'Meshy_AI_Character_output.glb' in old_ruta:
                        new_ruta = 'biped/male/characters/biped_male.glb'
                
                if new_ruta and new_ruta != old_ruta:
                    modelo_3d['ruta'] = new_ruta
                    
                    # Actualizar en BD
                    await conn.execute("""
                        UPDATE juego_dioses.agrupaciones
                        SET modelo_3d = $1::jsonb
                        WHERE id = $2
                    """, json.dumps(modelo_3d), agrupacion['id'])
                    
                    updated += 1
                    print(f"✓ Actualizado {agrupacion['id']}: {old_ruta} -> {new_ruta}")
                elif old_ruta.startswith('biped/male/characters/biped_male.glb'):
                    skipped += 1
                    print(f"⊘ Ya actualizado {agrupacion['id']}: {old_ruta}")
                else:
                    skipped += 1
                    print(f"⊘ Saltado {agrupacion['id']}: {old_ruta} (no requiere migración o formato desconocido)")
                    
            except Exception as e:
                errors += 1
                print(f"✗ Error actualizando {agrupacion['id']}: {e}")
        
        print(f"\n{'='*60}")
        print(f"Resumen: {updated} actualizados, {skipped} saltados, {errors} errores")
        print(f"{'='*60}")


if __name__ == "__main__":
    print("Seed/Base: Actualización de rutas de modelos 3D a estructura biped/male/")
    print("="*60)
    print("Este script puede ejecutarse múltiples veces de forma segura.")
    print("="*60)
    asyncio.run(migrate_model_paths())
