"""
Script de seed para crear demo: bioma bosque 40x40 con acuífero
"""
import asyncio
import asyncpg
import os
import random
import math
import json
from dotenv import load_dotenv
from uuid import UUID
from src.database.terrain_builder import create_boundary_layer
from src.database.templates.trees.registry import get_random_tree_template
from src.database.templates.bipedos.registry import get_biped_template
from src.database.creators.entity_creator import EntityCreator
from src.models.schemas import Model3D
from src.storage.local_file_storage import LocalFileStorage
from src.database.utils.terrain_utils import get_terrain_height_area

load_dotenv()

# Configuración de conexión
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "juegodioses")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "juegodioses123")
POSTGRES_DB = os.getenv("POSTGRES_DB", "juego_dioses")


async def seed_demo():
    """
    Crear demo: bioma bosque 40x40 (10m x 10m) con acuífero subterráneo
    """
    conn = await asyncpg.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        database=POSTGRES_DB
    )
    
    try:
        print("Iniciando seed de terreno test 1 - Bosque Denso...")
        
        # 0. Borrar dimensión existente si existe (y todas sus partículas)
        print("Verificando si existe dimensión test 1 anterior...")
        existing_dim_id = await conn.fetchval("""
            SELECT id FROM juego_dioses.dimensiones 
            WHERE nombre = 'Terreno Test 1 - Bosque Denso'
        """)
        
        if existing_dim_id:
            print(f"Eliminando dimensión existente (ID: {existing_dim_id}) y todas sus partículas...")
            # Borrar partículas primero (por foreign key)
            particulas_borradas = await conn.execute("""
                DELETE FROM juego_dioses.particulas 
                WHERE dimension_id = $1
            """, existing_dim_id)
            print(f"  Partículas eliminadas: {particulas_borradas.split()[-1]}")
            
            # Borrar dimensión
            await conn.execute("""
                DELETE FROM juego_dioses.dimensiones 
                WHERE id = $1
            """, existing_dim_id)
            print("  Dimensión eliminada correctamente")
        else:
            print("  No se encontró dimensión demo anterior")
        
        # Obtener IDs de tipos y estados necesarios
        hierba_id = await conn.fetchval(
            "SELECT id FROM juego_dioses.tipos_particulas WHERE nombre = 'hierba'"
        )
        tierra_id = await conn.fetchval(
            "SELECT id FROM juego_dioses.tipos_particulas WHERE nombre = 'tierra'"
        )
        piedra_id = await conn.fetchval(
            "SELECT id FROM juego_dioses.tipos_particulas WHERE nombre = 'piedra'"
        )
        agua_id = await conn.fetchval(
            "SELECT id FROM juego_dioses.tipos_particulas WHERE nombre = 'agua'"
        )
        solido_id = await conn.fetchval(
            "SELECT id FROM juego_dioses.estados_materia WHERE nombre = 'solido'"
        )
        liquido_id = await conn.fetchval(
            "SELECT id FROM juego_dioses.estados_materia WHERE nombre = 'liquido'"
        )
        
        # Nota: madera_id y hojas_id ahora se obtienen automáticamente por EntityCreator
        if not all([hierba_id, tierra_id, piedra_id, agua_id, solido_id, liquido_id]):
            print("Error: Faltan tipos de partículas o estados de materia en la BD")
            print("Ejecuta primero los scripts de inicialización de la BD")
            return
        
        # 1. Crear dimensión demo (40m x 40m = 160x160 celdas con celda de 0.25m)
        # Profundidad suficiente para acuífero (hasta z=-13) + límite
        # Altura suficiente para árboles muy grandes: tronco hasta z=30 + copa 3 niveles = z=33
        # Agregamos margen: altura_maxima = 40 para seguridad
        print("Creando dimensión terreno test 1...")
        dimension_id = await conn.fetchval("""
            INSERT INTO juego_dioses.dimensiones (
                nombre,
                ancho_metros,
                alto_metros,
                profundidad_maxima,
                altura_maxima,
                tamano_celda,
                origen_x,
                origen_y,
                origen_z
            ) VALUES (
                'Terreno Test 1 - Bosque Denso',
                40.0,
                40.0,
                -15,
                40,
                0.25,
                0.0,
                0.0,
                0
            )
            RETURNING id
        """)
        
        print(f"Dimensión creada: {dimension_id}")
        
        # 1.5. Crear capa de partículas límite en el límite inferior
        print("Creando capa de partículas límite...")
        dim_row = await conn.fetchrow("""
            SELECT ancho_metros, alto_metros, profundidad_maxima, tamano_celda
            FROM juego_dioses.dimensiones
            WHERE id = $1
        """, dimension_id)
        
        dimension_data = {
            'ancho_metros': float(dim_row['ancho_metros']),
            'alto_metros': float(dim_row['alto_metros']),
            'profundidad_maxima': dim_row['profundidad_maxima'],
            'tamano_celda': float(dim_row['tamano_celda'])
        }
        num_limite = await create_boundary_layer(conn, dimension_id, dimension_data)
        print(f"Capa límite creada: {num_limite} partículas en z={dimension_data['profundidad_maxima']}")
        
        # Calcular dimensiones en celdas
        max_x = int(dimension_data['ancho_metros'] / dimension_data['tamano_celda'])  # 40
        max_y = int(dimension_data['alto_metros'] / dimension_data['tamano_celda'])  # 40
        
        # ===== FASE 1: CREAR ACUÍFERO (desde abajo hacia arriba) =====
        print("\n=== FASE 1: Creando acuífero ===")
        
        # Paso 1: Roca sólida bajo capa impermeable (z=-11 a z=-13)
        # Optimización: usar COPY para inserción masiva (más rápido que executemany)
        print("Creando roca sólida (z=-11 a z=-13)...")
        particulas_roca = []
        batch_size = 10000  # Insertar en batches de 10k
        
        for x in range(max_x):
            for y in range(max_y):
                for z in range(-13, -10):
                    particulas_roca.append((
                        dimension_id, x, y, z,
                        piedra_id, solido_id, 1.0, 12.0, 0.0, False,
                        None, False, '{}'
                    ))
                    
                    # Insertar en batches para no llenar memoria
                    if len(particulas_roca) >= batch_size:
                        await conn.executemany("""
                            INSERT INTO juego_dioses.particulas 
                            (dimension_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
                             cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
                            ON CONFLICT (dimension_id, celda_x, celda_y, celda_z) DO NOTHING
                        """, particulas_roca)
                        print(f"  Insertadas {len(particulas_roca)} partículas de roca...")
                        particulas_roca = []
        
        # Insertar resto
        if particulas_roca:
            await conn.executemany("""
                INSERT INTO juego_dioses.particulas 
                (dimension_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
                 cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
                ON CONFLICT (dimension_id, celda_x, celda_y, celda_z) DO NOTHING
            """, particulas_roca)
        
        total_roca = (max_x * max_y * 3)
        print(f"Roca sólida creada: {total_roca} partículas")
        
        # Paso 2: Capa impermeable (z=-10)
        print("Creando capa impermeable (z=-10)...")
        particulas_impermeable = []
        for x in range(max_x):
            for y in range(max_y):
                particulas_impermeable.append((
                    dimension_id, x, y, -10,
                    piedra_id, solido_id, 1.0, 12.0, 0.0, False,
                    None, False, '{}'
                ))
        
        await conn.executemany("""
            INSERT INTO juego_dioses.particulas 
            (dimension_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
             cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
            ON CONFLICT (dimension_id, celda_x, celda_y, celda_z) DO NOTHING
        """, particulas_impermeable)
        print(f"Capa impermeable creada: {len(particulas_impermeable)} partículas")
        
        # Paso 3: Nivel freático - Agua (z=-7 a z=-9)
        print("Creando nivel freático - agua (z=-7 a z=-9)...")
        particulas_agua = []
        batch_size = 10000
        
        for x in range(max_x):
            for y in range(max_y):
                for z in range(-9, -6):
                    particulas_agua.append((
                        dimension_id, x, y, z,
                        agua_id, liquido_id, 1.0, 15.0, 0.0, False,
                        None, False, '{}'
                    ))
                    
                    # Insertar en batches
                    if len(particulas_agua) >= batch_size:
                        await conn.executemany("""
                            INSERT INTO juego_dioses.particulas 
                            (dimension_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
                             cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
                            ON CONFLICT (dimension_id, celda_x, celda_y, celda_z) DO NOTHING
                        """, particulas_agua)
                        print(f"  Insertadas {len(particulas_agua)} partículas de agua...")
                        particulas_agua = []
        
        # Insertar resto
        if particulas_agua:
            await conn.executemany("""
                INSERT INTO juego_dioses.particulas 
                (dimension_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
                 cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
                ON CONFLICT (dimension_id, celda_x, celda_y, celda_z) DO NOTHING
            """, particulas_agua)
        
        total_agua = (max_x * max_y * 3)
        print(f"Nivel freático creado: {total_agua} partículas de agua")
        
        # Paso 4: Zona de saturación (z=-6)
        print("Creando zona de saturación (z=-6)...")
        particulas_saturacion = []
        for x in range(max_x):
            for y in range(max_y):
                particulas_saturacion.append((
                    dimension_id, x, y, -6,
                    tierra_id, solido_id, 1.0, 17.0, 0.0, False,
                    None, False, '{}'
                ))
        
        await conn.executemany("""
            INSERT INTO juego_dioses.particulas 
            (dimension_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
             cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
            ON CONFLICT (dimension_id, celda_x, celda_y, celda_z) DO NOTHING
        """, particulas_saturacion)
        print(f"Zona de saturación creada: {len(particulas_saturacion)} partículas")
        
        # Paso 5: Zona de infiltración (z=-1 a z=-5)
        print("Creando zona de infiltración (z=-1 a z=-5)...")
        particulas_infiltracion = []
        batch_size = 10000
        
        for x in range(max_x):
            for y in range(max_y):
                for z in range(-5, 0):
                    particulas_infiltracion.append((
                        dimension_id, x, y, z,
                        tierra_id, solido_id, 1.0, 18.0, 0.0, False,
                        None, False, '{}'
                    ))
                    
                    # Insertar en batches
                    if len(particulas_infiltracion) >= batch_size:
                        await conn.executemany("""
                            INSERT INTO juego_dioses.particulas 
                            (dimension_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
                             cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
                            ON CONFLICT (dimension_id, celda_x, celda_y, celda_z) DO NOTHING
                        """, particulas_infiltracion)
                        print(f"  Insertadas {len(particulas_infiltracion)} partículas de infiltración...")
                        particulas_infiltracion = []
        
        # Insertar resto
        if particulas_infiltracion:
            await conn.executemany("""
                INSERT INTO juego_dioses.particulas 
                (dimension_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
                 cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
                ON CONFLICT (dimension_id, celda_x, celda_y, celda_z) DO NOTHING
            """, particulas_infiltracion)
        
        total_infiltracion = (max_x * max_y * 5)
        print(f"Zona de infiltración creada: {total_infiltracion} partículas")
        
        # ===== FASE 2: CREAR BIOMA BOSQUE =====
        print("\n=== FASE 2: Creando bioma bosque ===")
        
        # Paso 1: Capa base de terreno (piedra en z=-4, tierra en z=-3 a z=-1 ya creada, hierba en z=0)
        print("Creando capa base de terreno...")
        particulas_base = []
        for x in range(max_x):
            for y in range(max_y):
                # Piedra base (z=-4)
                particulas_base.append((
                    dimension_id, x, y, -4,
                    piedra_id, solido_id, 1.0, 15.0, 0.0, False,
                    None, False, '{}'
                ))
                # Hierba superficie (z=0) - reemplazar tierra en z=0
                particulas_base.append((
                    dimension_id, x, y, 0,
                    hierba_id, solido_id, 1.0, 20.0, 0.0, False,
                    None, False, '{}'
                ))
        
        await conn.executemany("""
            INSERT INTO juego_dioses.particulas 
            (dimension_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
             cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
            ON CONFLICT (dimension_id, celda_x, celda_y, celda_z) DO UPDATE
            SET tipo_particula_id = EXCLUDED.tipo_particula_id,
                temperatura = EXCLUDED.temperatura
        """, particulas_base)
        print(f"Capa base creada: {len(particulas_base)} partículas (piedra z=-4, hierba z=0)")
        
        # Paso 2: Generar posiciones de árboles usando plantillas
        # Usar grilla con espaciado para eficiencia
        print("Generando posiciones de árboles con plantillas...")
        espaciado_grilla = 4  # Espaciado mínimo entre árboles (aumentado para árboles más grandes)
        posiciones_arboles = []
        templates_arboles = []  # Guardar plantilla usada para cada árbol
        
        random.seed(42)  # Semilla para reproducibilidad
        
        # Generar grilla con espaciado
        for x in range(0, max_x, espaciado_grilla):
            for y in range(0, max_y, espaciado_grilla):
                # Agregar variación aleatoria pequeña (±1 celda)
                offset_x = random.randint(-1, 1)
                offset_y = random.randint(-1, 1)
                nx = x + offset_x
                ny = y + offset_y
                
                # Verificar límites y probabilidad (para densidad ~15%)
                if 0 <= nx < max_x and 0 <= ny < max_y:
                    # 50% de probabilidad de colocar árbol en cada celda de la grilla
                    if random.random() < 0.5:
                        # Seleccionar plantilla aleatoria para este árbol
                        template = get_random_tree_template()
                        posiciones_arboles.append((nx, ny))
                        templates_arboles.append(template)
        
        print(f"Posiciones de árboles generadas: {len(posiciones_arboles)} árboles")
        
        # Paso 3: Crear árboles usando nuevo sistema (EntityCreator + TreeBuilder)
        print("Creando árboles con nuevo sistema (templates + builders)...")
        
        # Crear EntityCreator para simplificar la creación
        creator = EntityCreator(conn, dimension_id)
        
        stats_templates = {}  # Estadísticas por tipo de árbol
        total_particulas_arboles = 0
        
        for idx, ((arbol_x, arbol_y), template) in enumerate(zip(posiciones_arboles, templates_arboles), 1):
            # Actualizar estadísticas
            if template.nombre not in stats_templates:
                stats_templates[template.nombre] = 0
            stats_templates[template.nombre] += 1
            
            # Debug: verificar que se generen las posiciones correctas
            if idx <= 3:  # Solo para los primeros 3 árboles
                altura_tronco = template.get_altura_aleatoria()
                posiciones_tronco = template.get_posiciones_tronco(arbol_x, arbol_y)
                print(f"  Árbol {idx} ({template.nombre}) en ({arbol_x}, {arbol_y}): grosor={template.grosor_tronco}, altura={altura_tronco}, posiciones={len(posiciones_tronco)}")
            
            # Crear árbol usando EntityCreator (simplifica todo el proceso)
            particulas_creadas = await creator.create_entity(template, arbol_x, arbol_y, 0)
            total_particulas_arboles += particulas_creadas
            
            # Mostrar progreso cada 10 árboles
            if idx % 10 == 0:
                print(f"  Procesados {idx}/{len(posiciones_arboles)} árboles... (Total partículas: {total_particulas_arboles})")
        
        print(f"Árboles creados: {len(posiciones_arboles)} árboles, {total_particulas_arboles} partículas")
        print("\nDistribución por tipo de árbol:")
        for tipo, cantidad in stats_templates.items():
            print(f"  - {tipo}: {cantidad} árboles")
        
        # Verificar creación
        total_particulas = await conn.fetchval("""
            SELECT COUNT(*) FROM juego_dioses.particulas
            WHERE dimension_id = $1 AND extraida = false
        """, dimension_id)
        
        # Estadísticas por tipo
        stats = await conn.fetch("""
            SELECT tp.nombre, COUNT(*) as cantidad
            FROM juego_dioses.particulas p
            JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
            WHERE p.dimension_id = $1 AND p.extraida = false
            GROUP BY tp.nombre
            ORDER BY cantidad DESC
        """, dimension_id)
        
        print("\n" + "="*60)
        print("Seed de terreno test 1 completado exitosamente!")
        print(f"Dimensión ID: {dimension_id}")
        print(f"Tamaño: {max_x}x{max_y} celdas ({dimension_data['ancho_metros']}m x {dimension_data['alto_metros']}m)")
        print(f"Total partículas: {total_particulas}")
        print(f"Árboles creados: {len(posiciones_arboles)}")
        print("\nDistribución por tipo:")
        for stat in stats:
            print(f"  - {stat['nombre']}: {stat['cantidad']} partículas")
        
        # Crear personaje demo con modelo 3D
        print("\nCreando personaje demo con modelo 3D...")
        try:
            storage = LocalFileStorage()
            model_path = "biped/male/characters/biped_male.glb"
            
            if await storage.model_exists(model_path):
                template = get_biped_template('humano')
                if template:
                    # Posición del personaje (centro del mapa)
                    x, y = max_x // 2, max_y // 2
                    terrain_height = await get_terrain_height_area(conn, dimension_id, x, y, radius=1)
                    z = (terrain_height + 1) if terrain_height is not None else 1
                    offset_z = 0.9
                    
                    modelo_3d = Model3D(
                        tipo="glb",
                        ruta=model_path,
                        escala=5.0,
                        offset={"x": 0, "y": 0, "z": offset_z},
                        rotacion={"x": 0, "y": 0, "z": 180}
                    )
                    
                    creator = EntityCreator(conn, dimension_id)
                    await creator.create_entity(
                        template,
                        x,
                        y,
                        z,
                        create_agrupacion=True,
                        modelo_3d=modelo_3d
                    )
                    print(f"✓ Personaje demo creado en posición ({x}, {y}, {z})")
                else:
                    print("⚠️  Template 'humano' no encontrado, saltando creación de personaje")
            else:
                print(f"⚠️  Modelo no encontrado: {model_path}, saltando creación de personaje")
        except Exception as e:
            print(f"⚠️  Error al crear personaje demo: {e}")
            # No fallar todo el seed si falla el personaje
        
        print("="*60)
        
    except Exception as e:
        print(f"Error en seed: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_terrain_test_1())
