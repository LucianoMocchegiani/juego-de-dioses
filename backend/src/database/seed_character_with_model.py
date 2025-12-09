"""
Script para crear personaje con modelo 3D

Este script crea un personaje humano con un modelo 3D asociado.
Modelo principal: Character_output.glb (con esqueleto para animaciones)
Ubicación: backend/static/models/characters/Character_output.glb

El modelo usa bones (esqueleto) para animaciones y sistema de daño por partes.
- torso
- left_arm
- right_arm
- left_leg
- right_leg

Este modelo prepara el terreno para JDG-014 (Sistema de Daño por Partes del Cuerpo).
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
from src.database.utils.terrain_utils import get_terrain_height_area


async def main():
    """Crear personaje con modelo 3D de prueba"""
    
    # 1. Verificar que el modelo existe
    storage = LocalFileStorage()
    model_path = "characters/Character_output.glb"  # Modelo principal con esqueleto para animaciones
    
    if not await storage.model_exists(model_path):
        print(f"⚠️  Modelo no encontrado: {model_path}")
        print("Coloca el modelo GLB en backend/static/models/characters/Character_output.glb")
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
            print(" No se encontró ninguna dimensión.")
            print("Ejecuta primero seed_demo.py o crea una dimensión manualmente.")
            return
        
        # Obtener nombre de la dimensión para mostrar
        dimension_nombre = await conn.fetchval("""
            SELECT nombre FROM juego_dioses.dimensiones WHERE id = $1
        """, dimension_id)
        
        print(f"✓ Dimensión encontrada: {dimension_id} ({dimension_nombre})")
        
        # 3. Calcular altura del terreno y posición Z del personaje
        # Posición X, Y de prueba (ajustar según necesidad)
        x, y = 45, 45
        
        # Obtener altura del terreno en esa posición (buscar en área 3×3 para terrenos irregulares)
        terrain_height = await get_terrain_height_area(conn, dimension_id, x, y, radius=1)
        
        # Calcular posición Z del personaje basándose en el terreno
        # Si hay terreno, el personaje debería estar en terrain_height + 1 (arriba del terreno)
        # Si no hay terreno, usar z = 1 como fallback
        if terrain_height is not None:
            z = terrain_height + 1
            print(f"  Altura del terreno en ({x}, {y}): Z = {terrain_height}")
            print(f"  Posición Z del personaje: {z} (arriba del terreno)")
        else:
            z = 1  # Fallback si no hay terreno
            print(f"  No se encontró terreno en ({x}, {y}), usando Z = {z}")
        
        # Offset Z del modelo (en metros)
        # Este es un valor fijo basado en la geometría del modelo (dónde está el origen)
        # Si el modelo aparece enterrado, aumentar este valor
        # Si el modelo está flotando, disminuir este valor
        # Con escala 6.0, ajustado a 0.9m para que los pies estén completamente sobre el suelo
        offset_z = 0.9  # Ajustar según necesidad
        
        # 4. Crear modelo_3d
        # Character_output.glb: modelo con esqueleto para animaciones de Meshy
        # El modelo de las animaciones es más pequeño, usar escala 5.0
        modelo_3d = Model3D(
            tipo="glb",
            ruta=model_path,
            escala=5.0,  # Escala ajustada para modelo de animaciones de Meshy
            offset={"x": 0, "y": 0, "z": offset_z},  # Offset Z calculado según terreno
            rotacion={"x": 0, "y": 0, "z": 180}  # Rotar 180° en Z del juego (Y de Three.js) para que mire de espaldas
        )
        
        print(f"✓ Modelo 3D configurado: {modelo_3d.model_dump()}")
        
        # 5. Obtener template
        template = get_biped_template('humano')
        if not template:
            print("⚠️  Template 'humano' no encontrado.")
            return
        
        print(f"✓ Template encontrado: {template.nombre}")
        
        # 6. Crear builder con modelo_3d
        builder = BipedBuilder(template, modelo_3d=modelo_3d)
        
        # 7. Crear personaje usando EntityCreator
        creator = EntityCreator(conn, dimension_id)
        
        # Posición ya calculada arriba basándose en el terreno (x, y, z)
        
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

