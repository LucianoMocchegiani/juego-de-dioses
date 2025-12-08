"""
Script para crear personaje con modelo 3D de prueba

Este script crea un personaje humano con un modelo 3D asociado.
Requiere que exista un modelo GLB en backend/static/models/characters/humano_test.glb
"""
import asyncio
import sys
from pathlib import Path

# Agregar ruta del proyecto al path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.database.connection import get_connection
from src.database.creators.entity_creator import EntityCreator
from src.database.templates.bipedos.registry import get_biped_template
from src.database.builders.biped_builder import BipedBuilder
from src.models.schemas import Model3D
from src.storage.local_file_storage import LocalFileStorage


async def main():
    """Crear personaje con modelo 3D de prueba"""
    
    # 1. Verificar que el modelo existe
    storage = LocalFileStorage()
    model_path = "characters/humano_test.glb"
    
    if not await storage.model_exists(model_path):
        print(f"⚠️  Modelo no encontrado: {model_path}")
        print("Coloca un modelo GLB en backend/static/models/characters/humano_test.glb")
        print("O modifica 'model_path' en este script para usar otro modelo.")
        return
    
    print(f"✓ Modelo encontrado: {model_path}")
    
    # 2. Obtener dimensión demo (o crear una nueva)
    async with get_connection() as conn:
        # Buscar cualquier dimensión (la primera que encuentre)
        # Esto permite usar la misma dimensión que el frontend
        dimension_id = await conn.fetchval("""
            SELECT id FROM juego_dioses.dimensiones 
            ORDER BY creado_en DESC
            LIMIT 1
        """)
        
        if not dimension_id:
            # Si no hay ninguna, buscar la demo específica
            dimension_id = await conn.fetchval("""
                SELECT id FROM juego_dioses.dimensiones 
                WHERE nombre = 'Demo - Terreno con Arboles'
                LIMIT 1
            """)
        
        if not dimension_id:
            print("⚠️  No se encontró ninguna dimensión.")
            print("Ejecuta primero seed_demo.py o crea una dimensión manualmente.")
            return
        
        # Obtener nombre de la dimensión para mostrar
        dimension_nombre = await conn.fetchval("""
            SELECT nombre FROM juego_dioses.dimensiones WHERE id = $1
        """, dimension_id)
        
        print(f"✓ Dimensión encontrada: {dimension_id} ({dimension_nombre})")
        
        # 3. Crear modelo_3d
        # NOTA: La escala depende del modelo:
        # - Duck: ~1.0 (tamaño normal, ~0.5m)
        # - BrainStem: ~1.0 (tamaño normal, ~1m)
        # - BarramundiFish: ~2.0 (hacer más grande, ~0.3m original)
        # - Avocado: ~5.0 (hacer más grande, ~0.1m original)
        # - Fox: ~0.001 (MUY pequeño, ~154m original - NO RECOMENDADO)
        modelo_3d = Model3D(
            tipo="glb",
            ruta=model_path,
            escala=1.0,  # Ajustar según el modelo descargado
            offset={"x": 0, "y": 0, "z": 0},
            rotacion={"x": 0, "y": 0, "z": 0}
        )
        
        print(f"✓ Modelo 3D configurado: {modelo_3d.dict()}")
        
        # 4. Obtener template
        template = get_biped_template('humano')
        if not template:
            print("⚠️  Template 'humano' no encontrado.")
            return
        
        print(f"✓ Template encontrado: {template.nombre}")
        
        # 5. Crear builder con modelo_3d
        builder = BipedBuilder(template, modelo_3d=modelo_3d)
        
        # 6. Crear personaje usando EntityCreator
        creator = EntityCreator(conn, dimension_id)
        
        # Posición de prueba (ajustar según necesidad)
        x, y, z = 45, 45, 1
        
        print(f"Creando personaje en posición ({x}, {y}, {z})...")
        
        try:
            await creator.create_entity(
                template,
                x,
                y,
                z,
                create_agrupacion=True,
                modelo_3d=modelo_3d
            )
            
            # 7. Verificar que se creó correctamente
            agrupacion = await conn.fetchrow("""
                SELECT id, nombre, tipo, modelo_3d
                FROM juego_dioses.agrupaciones
                WHERE dimension_id = $1 AND tipo = 'biped'
                ORDER BY creado_en DESC
                LIMIT 1
            """, dimension_id)
            
            if agrupacion and agrupacion['modelo_3d']:
                print(f"✓ Personaje creado exitosamente!")
                print(f"  ID: {agrupacion['id']}")
                print(f"  Nombre: {agrupacion['nombre']}")
                print(f"  Modelo 3D: {agrupacion['modelo_3d']}")
            else:
                print("⚠️  Personaje creado pero modelo_3d no se guardó correctamente.")
                
        except Exception as e:
            print(f"❌ Error al crear personaje: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())

