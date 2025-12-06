"""
Script de seed para crear personaje de prueba
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv
from uuid import UUID
from src.database.templates.bipedos.registry import get_biped_template
from src.database.creators.entity_creator import EntityCreator

load_dotenv()

POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "juegodioses")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "juegodioses123")
POSTGRES_DB = os.getenv("POSTGRES_DB", "juego_dioses")


async def seed_character_test():
    """
    Crear personaje humano de prueba en la dimensión de prueba
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
            print("Ejecuta primero: docker-compose exec backend python -m src.database.seed_human_test")
            return
        
        print(f"Creando personaje en dimensión {dimension_id}...")
        
        # Obtener template
        template = get_biped_template('humano')
        if not template:
            print("Error: Template 'humano' no encontrado")
            return
        
        print(f"Template encontrado: {template.nombre}")
        
        # Crear personaje usando EntityCreator
        creator = EntityCreator(conn, dimension_id)
        particulas_count = await creator.create_entity(
            template,
            x=45,
            y=45,
            z=1,
            create_agrupacion=True
        )
        
        print(f"Personaje creado exitosamente: {particulas_count} partículas")
        
        # Obtener la agrupación creada para verificar
        agrupacion = await conn.fetchrow("""
            SELECT id, nombre, tipo, especie, geometria_agrupacion
            FROM juego_dioses.agrupaciones
            WHERE dimension_id = $1 AND tipo = 'biped'
            ORDER BY creado_en DESC
            LIMIT 1
        """, dimension_id)
        
        if agrupacion:
            print(f"Agrupación creada: ID={agrupacion['id']}, Nombre={agrupacion['nombre']}")
            if agrupacion['geometria_agrupacion']:
                print("Geometría de agrupación definida correctamente")
            else:
                print("Advertencia: geometria_agrupacion no está definida")
        
    except Exception as e:
        print(f"Error al crear personaje: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_character_test())

