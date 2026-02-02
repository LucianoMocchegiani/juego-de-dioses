"""
Script de seed para crear terreno test 2: 40x40m con lago, montaña y pocos árboles
"""
import asyncio
import asyncpg
import os
import random
from dotenv import load_dotenv
from uuid import UUID
from src.world_creation_engine.terrain_builder import create_boundary_layer
from src.world_creation_engine.templates.trees.registry import get_random_tree_template
from src.world_creation_engine.templates.bipedos.registry import get_biped_template
from src.world_creation_engine.creators.entity_creator import EntityCreator
from src.domains.characters.schemas import Model3D
from src.storage.local_file_storage import LocalFileStorage
from src.domains.bloques.terrain_utils import get_terrain_height_area

load_dotenv()

# Configuración de conexión
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "juegodioses")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "juegodioses123")
POSTGRES_DB = os.getenv("POSTGRES_DB", "juego_dioses")


async def seed_terrain_test_2():
    """
    Crear terreno test 2: 40x40m con lago, montaña y pocos árboles.
    Crea la dimensión: "Terreno Test 2 - Lago y Montaña"
    
    Estructura:
    - Terreno plano con tierra y hierba
    - Un lago de agua en superficie
    - Una montaña pequeña hecha con tierra y piedra
    - 10 árboles distribuidos estratégicamente
    - Personaje demo con modelo 3D
    """
    conn = await asyncpg.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        database=POSTGRES_DB
    )
    
    try:
        print("Iniciando seed de terreno test 2 - Lago y Montaña...")
        
        # 0. Borrar dimensión existente si existe
        print("Verificando si existe dimensión test 2 anterior...")
        existing_dim_id = await conn.fetchval("""
            SELECT id FROM juego_dioses.bloques 
            WHERE nombre = 'Terreno Test 2 - Lago y Montaña'
        """)
        
        if existing_dim_id:
            print(f"Eliminando dimensión existente (ID: {existing_dim_id}) y todas sus partículas...")
            # Borrar partículas primero (por foreign key)
            particulas_borradas = await conn.execute("""
                DELETE FROM juego_dioses.particulas 
                WHERE bloque_id = $1
            """, existing_dim_id)
            print(f"  Partículas eliminadas: {particulas_borradas.split()[-1]}")
            
            # Borrar dimensión
            await conn.execute("""
                DELETE FROM juego_dioses.bloques 
                WHERE id = $1
            """, existing_dim_id)
            print("  Dimensión eliminada correctamente")
        else:
            print("  No se encontró dimensión de prueba anterior")
        
        # 1. Crear dimensión 40x40m (mismo tamaño de celda que demo: 0.25m)
        print("Creando dimensión de prueba...")
        tamano_celda = 0.25  # Mismo tamaño que el demo anterior
        profundidad_maxima = -11  # -11 para tener espacio para 10 celdas de tierra (z=-10 a z=-1) + límite
        dimension_id = await conn.fetchval("""
            INSERT INTO juego_dioses.bloques (
                nombre,
                ancho_metros,
                alto_metros,
                profundidad_maxima,
                altura_maxima,
                tamano_celda
            ) VALUES (
                'Terreno Test 2 - Lago y Montaña',
                40.0,
                40.0,
                $1,
                40,
                $2
            ) RETURNING id
        """, profundidad_maxima, tamano_celda)
        print(f"Dimensión creada: ID = {dimension_id}")
        
        # Calcular celdas
        max_x = int(40.0 / tamano_celda)  # 160 celdas (40m / 0.25m)
        max_y = int(40.0 / tamano_celda)  # 160 celdas
        print(f"Tamaño en celdas: {max_x}x{max_y}")
        
        # Crear capa límite
        dimension_data = {
            'ancho_metros': 40.0,
            'alto_metros': 40.0,
            'profundidad_maxima': profundidad_maxima,
            'tamano_celda': tamano_celda
        }
        limite_count = await create_boundary_layer(conn, dimension_id, dimension_data)
        print(f"Capa límite creada: {limite_count} partículas")
        
        # 2. Obtener IDs de tipos y estados necesarios
        print("Obteniendo IDs de tipos y estados...")
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
        
        if not all([hierba_id, tierra_id, piedra_id, agua_id, solido_id, liquido_id]):
            print("Error: Faltan tipos de partículas o estados de materia en la BD")
            print("Ejecuta primero los scripts de inicialización de la BD")
            return
        
        print("IDs obtenidos correctamente")
        
        # 3. Crear capa base de piedra (z=-11)
        print("Creando capa base de piedra (z=-11)...")
        particulas_piedra = []
        for x in range(max_x):
            for y in range(max_y):
                particulas_piedra.append((
                    dimension_id, x, y, -11,
                    piedra_id, solido_id, 1.0, 15.0, 0.0, False,
                    None, False, '{}'
                ))
        
        await conn.executemany("""
            INSERT INTO juego_dioses.particulas 
            (bloque_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
             cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
            ON CONFLICT (bloque_id, celda_x, celda_y, celda_z) DO NOTHING
        """, particulas_piedra)
        print(f"Capa de piedra creada: {len(particulas_piedra)} partículas")
        
        # 4. Crear capas de tierra (z=-10 a z=-1) - 10 celdas de profundidad
        print("Creando capas de tierra (z=-10 a z=-1) - 10 celdas de profundidad...")
        particulas_tierra = []
        batch_size = 10000
        
        for x in range(max_x):
            for y in range(max_y):
                for z in range(-10, 0):  # z=-10, z=-9, ..., z=-1 (10 capas)
                    particulas_tierra.append((
                        dimension_id, x, y, z,
                        tierra_id, solido_id, 1.0, 18.0, 0.0, False,
                        None, False, '{}'
                    ))
                    
                    # Insertar en batches para mejor rendimiento
                    if len(particulas_tierra) >= batch_size:
                        await conn.executemany("""
                            INSERT INTO juego_dioses.particulas 
                            (bloque_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
                             cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
                            ON CONFLICT (bloque_id, celda_x, celda_y, celda_z) DO NOTHING
                        """, particulas_tierra)
                        print(f"  Insertadas {len(particulas_tierra)} partículas de tierra...")
                        particulas_tierra = []
        
        # Insertar resto
        if particulas_tierra:
            await conn.executemany("""
                INSERT INTO juego_dioses.particulas 
                (bloque_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
                 cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
                ON CONFLICT (bloque_id, celda_x, celda_y, celda_z) DO NOTHING
            """, particulas_tierra)
        
        total_tierra = (max_x * max_y * 10)  # 10 capas
        print(f"Capas de tierra creadas: {total_tierra} partículas")
        
        # 5. Crear superficie de hierba (z=0)
        print("Creando superficie de hierba (z=0)...")
        particulas_hierba = []
        for x in range(max_x):
            for y in range(max_y):
                particulas_hierba.append((
                    dimension_id, x, y, 0,
                    hierba_id, solido_id, 1.0, 20.0, 0.0, False,
                    None, False, '{}'
                ))
        
        await conn.executemany("""
            INSERT INTO juego_dioses.particulas 
            (bloque_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
             cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
            ON CONFLICT (bloque_id, celda_x, celda_y, celda_z) DO NOTHING
        """, particulas_hierba)
        print(f"Superficie de hierba creada: {len(particulas_hierba)} partículas")
        
        # 6. Crear lago de agua (más realista y separado de la montaña)
        print("Creando lago de agua...")
        
        # Definir posición y tamaño del lago
        # Lago de 10x10 metros aproximadamente, forma más orgánica
        lago_tamano_metros = 10.0
        lago_radio_maximo = int(lago_tamano_metros / tamano_celda)  # 10 metros / 0.25m = 40 celdas
        # Posicionar lago en el centro-izquierda, lejos de la montaña (esquina superior derecha)
        lago_centro_x = max_x // 3  # Un tercio desde la izquierda
        lago_centro_y = max_y // 2  # Centro vertical
        
        print(f"Lago: radio máximo {lago_radio_maximo} celdas ({lago_tamano_metros} metros)")
        print(f"Posición centro: ({lago_centro_x}, {lago_centro_y})")
        print(f"Profundidad: 10 niveles (z=0 a z=-9, bajo la superficie)")
        
        # Crear lago con forma más orgánica (circular/ovalada con variación)
        particulas_agua = []
        lago_area_set = set()
        
        for x in range(max_x):
            for y in range(max_y):
                # Calcular distancia desde el centro del lago
                dx = x - lago_centro_x
                dy = y - lago_centro_y
                distancia = (dx**2 + dy**2)**0.5
                
                # Crear forma ovalada (más ancha en X que en Y para variación)
                distancia_ajustada = ((dx * 0.9)**2 + (dy * 1.1)**2)**0.5
                
                # Radio variable con variación aleatoria para bordes más orgánicos
                radio_base = lago_radio_maximo
                variacion_borde = random.uniform(0.85, 1.0)  # Variación del 15% en los bordes
                radio_efectivo = radio_base * variacion_borde
                
                # Agregar pequeñas variaciones aleatorias para forma más natural
                if distancia_ajustada < radio_efectivo:
                    # Profundidad variable: más profundo en el centro, menos profundo en los bordes
                    distancia_norm = distancia_ajustada / radio_efectivo
                    profundidad_max = int(10 * (1.0 - distancia_norm * 0.4))  # De 10 niveles en centro a 6 en bordes
                    profundidad_max = max(3, profundidad_max)  # Mínimo 3 niveles
                    
                    # Crear agua desde z=0 hacia abajo
                    for z in range(-profundidad_max + 1, 1):  # z desde -profundidad_max+1 hasta 0
                        particulas_agua.append((
                            dimension_id, x, y, z,
                            agua_id, liquido_id, 1.0, 15.0, 0.0, False,
                            None, False, '{}'
                        ))
                        lago_area_set.add((x, y))
        
        await conn.executemany("""
            INSERT INTO juego_dioses.particulas 
            (bloque_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
             cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
            ON CONFLICT (bloque_id, celda_x, celda_y, celda_z) DO UPDATE
            SET tipo_particula_id = EXCLUDED.tipo_particula_id,
                estado_materia_id = EXCLUDED.estado_materia_id,
                temperatura = EXCLUDED.temperatura
        """, particulas_agua)
        print(f"Lago creado: {len(particulas_agua)} partículas de agua")
        
        # 7. Crear montaña pequeña (forma más realista, separada del lago, base circular)
        print("Creando montaña pequeña...")
        
        # Definir posición y tamaño de la montaña
        # Montaña con base circular de aproximadamente 6 metros de radio
        montana_radio_metros = 6.0
        montana_radio_celdas = int(montana_radio_metros / tamano_celda)  # 6 metros / 0.25m = 24 celdas
        montana_altura_maxima = 6  # Altura máxima de 6 niveles (z=1 a z=6)
        # Posicionar montaña en esquina superior derecha, lejos del lago (centro-izquierda)
        montana_centro_x = max_x - 60  # Esquina superior derecha
        montana_centro_y = max_y - 60
        
        print(f"Montaña: radio {montana_radio_celdas} celdas ({montana_radio_metros} metros)")
        print(f"Posición centro: ({montana_centro_x}, {montana_centro_y})")
        print(f"Altura máxima: {montana_altura_maxima} niveles (z=1 a z={montana_altura_maxima})")
        
        # Crear mapa de altura para la montaña con base circular (forma más natural)
        altura_map = {}
        montana_area_set = set()
        
        # Iterar sobre un área cuadrada que contenga el círculo
        area_busqueda = montana_radio_celdas + 2  # Margen para bordes
        for x in range(montana_centro_x - area_busqueda, montana_centro_x + area_busqueda + 1):
            for y in range(montana_centro_y - area_busqueda, montana_centro_y + area_busqueda + 1):
                # Verificar límites
                if 0 <= x < max_x and 0 <= y < max_y:
                    # Calcular distancia desde el centro
                    dx = x - montana_centro_x
                    dy = y - montana_centro_y
                    distancia = (dx**2 + dy**2)**0.5
                    
                    # Radio variable con variación aleatoria para bordes más orgánicos
                    radio_base = montana_radio_celdas
                    variacion_borde = random.uniform(0.9, 1.0)  # Variación del 10% en los bordes
                    radio_efectivo = radio_base * variacion_borde
                    
                    # Si está dentro del radio, crear montaña
                    if distancia < radio_efectivo:
                        # Normalizar distancia (0 a 1)
                        distancia_norm = distancia / radio_efectivo if radio_efectivo > 0 else 0
                        
                        # Calcular altura usando función de montaña (más alta en el centro, más baja en los bordes)
                        # Usar función cuadrática para forma más natural
                        altura_factor = max(0, 1.0 - (distancia_norm ** 1.5))  # Exponente 1.5 para forma más suave
                        altura = int(altura_factor * montana_altura_maxima)
                        
                        # Agregar variación aleatoria pequeña para textura más natural
                        variacion = random.randint(-1, 1)
                        altura = max(1, min(montana_altura_maxima, altura + variacion))
                        
                        if altura > 0:
                            altura_map[(x, y)] = altura
                            montana_area_set.add((x, y))
        
        # Crear partículas de la montaña basadas en el mapa de altura
        particulas_montana = []
        for (x, y), altura_max in altura_map.items():
            # Verificar límites
            if 0 <= x < max_x and 0 <= y < max_y:
                # Crear partículas desde z=1 hasta la altura calculada
                for z in range(1, altura_max + 1):
                    # Base de la montaña (z=1-2): más tierra
                    if z <= 2:
                        # 80% tierra, 20% piedra en la base
                        tipo = tierra_id if random.random() < 0.8 else piedra_id
                    # Parte media (z=3-4): mezcla
                    elif z <= 4:
                        # 50% tierra, 50% piedra
                        tipo = tierra_id if random.random() < 0.5 else piedra_id
                    # Cima (z=5+): más piedra
                    else:
                        # 20% tierra, 80% piedra en la cima
                        tipo = tierra_id if random.random() < 0.2 else piedra_id
                    
                    particulas_montana.append((
                        dimension_id, x, y, z,
                        tipo, solido_id, 1.0, 15.0, 0.0, False,
                        None, False, '{}'
                    ))
        
        await conn.executemany("""
            INSERT INTO juego_dioses.particulas 
            (bloque_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
             cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
            ON CONFLICT (bloque_id, celda_x, celda_y, celda_z) DO UPDATE
            SET tipo_particula_id = EXCLUDED.tipo_particula_id,
                temperatura = EXCLUDED.temperatura
        """, particulas_montana)
        print(f"Montaña creada: {len(particulas_montana)} partículas")
        
        # 8. Generar posiciones de 10 árboles
        print("Generando posiciones de 10 árboles...")
        
        # Definir áreas a evitar (lago y montaña)
        # Usar el set del lago que ya creamos
        lago_area = lago_area_set.copy()
        # Agregar margen de seguridad alrededor del lago
        margen_lago = 8  # 2 metros de margen
        for (x, y) in list(lago_area_set):
            for dx in range(-margen_lago, margen_lago + 1):
                for dy in range(-margen_lago, margen_lago + 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < max_x and 0 <= ny < max_y:
                        lago_area.add((nx, ny))
        
        montana_area = montana_area_set.copy()
        # Agregar margen de seguridad alrededor de la montaña
        margen_montana = 8  # 2 metros de margen
        for (x, y) in list(montana_area_set):
            for dx in range(-margen_montana, margen_montana + 1):
                for dy in range(-margen_montana, margen_montana + 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < max_x and 0 <= ny < max_y:
                        montana_area.add((nx, ny))
        
        # Áreas prohibidas = lago + montaña
        areas_prohibidas = lago_area | montana_area
        
        # Generar posiciones de árboles
        posiciones_arboles = []
        espaciado_minimo_metros = 4.0
        espaciado_minimo = int(espaciado_minimo_metros / tamano_celda)  # 4 metros / 0.25m = 16 celdas
        random.seed(42)  # Semilla para reproducibilidad
        
        intentos_maximos = 1000
        intentos = 0
        
        while len(posiciones_arboles) < 10 and intentos < intentos_maximos:
            intentos += 1
            
            # Generar posición aleatoria
            margen_metros = 2.0
            margen_celdas = int(margen_metros / tamano_celda)  # 2 metros / 0.25m = 8 celdas
            x = random.randint(margen_celdas, max_x - margen_celdas)
            y = random.randint(margen_celdas, max_y - margen_celdas)
            
            # Verificar que no esté en áreas prohibidas (lago o montaña)
            if (x, y) in areas_prohibidas:
                continue
            
            # Verificar espaciado mínimo con otros árboles
            muy_cerca = False
            for (ax, ay) in posiciones_arboles:
                distancia = ((x - ax) ** 2 + (y - ay) ** 2) ** 0.5
                if distancia < espaciado_minimo:
                    muy_cerca = True
                    break
            
            if not muy_cerca:
                posiciones_arboles.append((x, y))
                print(f"  Árbol {len(posiciones_arboles)}: posición ({x}, {y})")
        
        if len(posiciones_arboles) < 10:
            print(f"Advertencia: Solo se generaron {len(posiciones_arboles)} posiciones de árboles")
        else:
            print(f"Posiciones de árboles generadas: {len(posiciones_arboles)} árboles")
        
        # 9. Crear árboles usando EntityCreator
        print("Creando árboles con plantillas...")
        
        # Crear EntityCreator
        creator = EntityCreator(conn, dimension_id)
        
        # Seleccionar plantillas para los árboles
        templates_arboles = []
        for i in range(10):
            template = get_random_tree_template()
            templates_arboles.append(template)
        
        total_particulas_arboles = 0
        stats_templates = {}
        
        for idx, ((arbol_x, arbol_y), template) in enumerate(zip(posiciones_arboles, templates_arboles), 1):
            # Actualizar estadísticas
            if template.nombre not in stats_templates:
                stats_templates[template.nombre] = 0
            stats_templates[template.nombre] += 1
            
            # Crear árbol usando EntityCreator
            particulas_creadas = await creator.create_entity(template, arbol_x, arbol_y, 0)
            total_particulas_arboles += particulas_creadas
            
            print(f"  Árbol {idx}/{len(posiciones_arboles)} ({template.nombre}) en ({arbol_x}, {arbol_y}): {particulas_creadas} partículas")
        
        print(f"\nÁrboles creados: {len(posiciones_arboles)} árboles, {total_particulas_arboles} partículas")
        print("Distribución por tipo de árbol:")
        for tipo, cantidad in stats_templates.items():
            print(f"  - {tipo}: {cantidad} árboles")
        
        # 10. Verificar y mostrar estadísticas
        print("\n" + "="*60)
        print("Verificando creación del terreno...")
        
        # Contar total de partículas
        total_particulas = await conn.fetchval("""
            SELECT COUNT(*) FROM juego_dioses.particulas
            WHERE bloque_id = $1 AND extraida = false
        """, dimension_id)
        
        # Estadísticas por tipo
        stats = await conn.fetch("""
            SELECT tp.nombre, COUNT(*) as cantidad
            FROM juego_dioses.particulas p
            JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
            WHERE p.bloque_id = $1 AND p.extraida = false
            GROUP BY tp.nombre
            ORDER BY cantidad DESC
        """, dimension_id)
        
        print("\n" + "="*60)
        print("Seed de terreno test 2 completado exitosamente!")
        print(f"Dimensión ID: {dimension_id}")
        print(f"Tamaño: {max_x}x{max_y} celdas (40m x 40m)")
        print(f"Total partículas: {total_particulas}")
        print(f"Árboles creados: {len(posiciones_arboles)}")
        print(f"Lago: radio {lago_radio_maximo} celdas (aprox {lago_tamano_metros}m de diámetro, forma orgánica)")
        print(f"Montaña: radio {montana_radio_celdas} celdas ({montana_radio_metros}m), altura máxima {montana_altura_maxima} niveles")
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
                    # Posición específica del personaje (coordenadas fijas)
                    x, y, z = 98, 60, 1
                    print(f"✓ Posición del personaje: ({x}, {y}, {z})")
                    
                    # Verificar que la posición existe y tiene terreno
                    terrain_height = await get_terrain_height_area(conn, dimension_id, x, y, radius=1)
                    if terrain_height is None:
                        print(f"⚠️  Advertencia: No se encontró terreno en ({x}, {y}), usando z=1")
                    else:
                        # Asegurar que z esté al menos 1 celda sobre el terreno
                        if z <= terrain_height:
                            z = terrain_height + 1
                            print(f"  Ajustado Z a {z} (terreno en {terrain_height})")
                    # Offset Z: ajustar para que los pies toquen el suelo
                    # Si el origen del modelo está en los pies, usar 0. Si está en el centro, usar valor negativo
                    # Para el modelo biped_male.glb, el origen está cerca del suelo, usar offset mínimo
                    offset_z = 0.0  # Eliminar offset adicional - el CollisionSystem ajustará la posición al suelo
                    
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
    asyncio.run(seed_terrain_test_2())