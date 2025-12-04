"""
Script de seed para crear demo: dimensión pequeña con terreno y árboles
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv
from uuid import UUID

load_dotenv()

# Configuración de conexión
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "juegodioses")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "juegodioses123")
POSTGRES_DB = os.getenv("POSTGRES_DB", "juego_dioses")


async def seed_demo():
    """
    Crear demo: dimensión 20x20 con terreno de pasto y 3 árboles
    """
    conn = await asyncpg.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        database=POSTGRES_DB
    )
    
    try:
        print("Iniciando seed de demo...")
        
        # Obtener IDs de tipos y estados necesarios
        hierba_id = await conn.fetchval(
            "SELECT id FROM juego_dioses.tipos_particulas WHERE nombre = 'hierba'"
        )
        madera_id = await conn.fetchval(
            "SELECT id FROM juego_dioses.tipos_particulas WHERE nombre = 'madera'"
        )
        hojas_id = await conn.fetchval(
            "SELECT id FROM juego_dioses.tipos_particulas WHERE nombre = 'hojas'"
        )
        solido_id = await conn.fetchval(
            "SELECT id FROM juego_dioses.estados_materia WHERE nombre = 'solido'"
        )
        
        if not all([hierba_id, madera_id, hojas_id, solido_id]):
            print("Error: Faltan tipos de partículas o estados de materia en la BD")
            print("Ejecuta primero los scripts de inicialización de la BD")
            return
        
        # 1. Crear dimensión demo (20x20 celdas = 5m x 5m con celda de 0.25m)
        print("Creando dimensión demo...")
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
                'Demo - Terreno con Arboles',
                5.0,
                5.0,
                -5,
                10,
                0.25,
                0.0,
                0.0,
                0
            )
            RETURNING id
        """)
        
        print(f"Dimensión creada: {dimension_id}")
        
        # 2. Crear terreno de pasto (20x20 = 400 partículas de hierba en z=0)
        print("Creando terreno de pasto (400 partículas)...")
        
        particulas_hierba = []
        for x in range(20):
            for y in range(20):
                particulas_hierba.append((
                    dimension_id,
                    x,
                    y,
                    0,  # z=0 (superficie)
                    hierba_id,
                    solido_id,
                    1.0,  # cantidad
                    20.0,  # temperatura
                    0.0,  # energia
                    False,  # extraida
                    None,  # agrupacion_id
                    False,  # es_nucleo
                    '{}'  # propiedades JSON
                ))
        
        await conn.executemany("""
            INSERT INTO juego_dioses.particulas (
                dimension_id,
                celda_x,
                celda_y,
                celda_z,
                tipo_particula_id,
                estado_materia_id,
                cantidad,
                temperatura,
                energia,
                extraida,
                agrupacion_id,
                es_nucleo,
                propiedades
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
            ON CONFLICT (dimension_id, celda_x, celda_y, celda_z) DO NOTHING
        """, particulas_hierba)
        
        print(f"Terreno creado: {len(particulas_hierba)} partículas de hierba")
        
        # 3. Crear 3 árboles pequeños
        arboles_posiciones = [
            (5, 5),   # Árbol 1
            (12, 8),  # Árbol 2
            (15, 15)  # Árbol 3
        ]
        
        for idx, (arbol_x, arbol_y) in enumerate(arboles_posiciones, 1):
            print(f"Creando árbol {idx} en posición ({arbol_x}, {arbol_y})...")
            
            # Crear agrupación del árbol
            agrupacion_id = await conn.fetchval("""
                INSERT INTO juego_dioses.agrupaciones (
                    dimension_id,
                    nombre,
                    tipo,
                    especie,
                    posicion_x,
                    posicion_y,
                    posicion_z,
                    tiene_nucleo,
                    nucleo_conectado
                ) VALUES (
                    $1,
                    $2,
                    'planta',
                    'roble',
                    $3,
                    $4,
                    -1,
                    true,
                    true
                )
                RETURNING id
            """, dimension_id, f"Roble {idx}", arbol_x, arbol_y)
            
            # Crear partículas del árbol
            # Núcleo: raíz en z=-1
            particulas_arbol = []
            
            # Raíz (núcleo) - 2 partículas
            particulas_arbol.append((
                dimension_id, arbol_x, arbol_y, -1,
                madera_id, solido_id, 1.0, 20.0, 0.0, False,
                agrupacion_id, True,  # es_nucleo = True
                '{"parte": "raiz", "tipo": "principal"}'
            ))
            particulas_arbol.append((
                dimension_id, arbol_x + 1, arbol_y, -1,
                madera_id, solido_id, 1.0, 20.0, 0.0, False,
                agrupacion_id, True,  # es_nucleo = True
                '{"parte": "raiz", "tipo": "secundaria"}'
            ))
            
            # Tronco - 3 partículas (z=0, z=1, z=2)
            altura_labels = ["base", "medio", "top"]
            for z in range(0, 3):
                particulas_arbol.append((
                    dimension_id, arbol_x, arbol_y, z,
                    madera_id, solido_id, 1.0, 20.0, 0.0, False,
                    agrupacion_id, False,  # es_nucleo = False
                    f'{{"parte": "tronco", "altura": "{altura_labels[z]}"}}'
                ))
            
            # Hojas - alrededor del tronco en z=2 y z=3
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    if dx == 0 and dy == 0:
                        continue  # Saltar posición del tronco
                    # Hojas en z=2
                    particulas_arbol.append((
                        dimension_id, arbol_x + dx, arbol_y + dy, 2,
                        hojas_id, solido_id, 1.0, 20.0, 0.0, False,
                        agrupacion_id, False,
                        '{"parte": "hojas"}'
                    ))
                    # Hojas en z=3
                    particulas_arbol.append((
                        dimension_id, arbol_x + dx, arbol_y + dy, 3,
                        hojas_id, solido_id, 1.0, 20.0, 0.0, False,
                        agrupacion_id, False,
                        '{"parte": "hojas"}'
                    ))
            
            # Insertar partículas del árbol
            await conn.executemany("""
                INSERT INTO juego_dioses.particulas (
                    dimension_id,
                    celda_x,
                    celda_y,
                    celda_z,
                    tipo_particula_id,
                    estado_materia_id,
                    cantidad,
                    temperatura,
                    energia,
                    extraida,
                    agrupacion_id,
                    es_nucleo,
                    propiedades
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
                ON CONFLICT (dimension_id, celda_x, celda_y, celda_z) DO NOTHING
            """, particulas_arbol)
            
            print(f"Árbol {idx} creado: {len(particulas_arbol)} partículas")
        
        # Verificar creación
        total_particulas = await conn.fetchval("""
            SELECT COUNT(*) FROM juego_dioses.particulas
            WHERE dimension_id = $1 AND extraida = false
        """, dimension_id)
        
        total_agrupaciones = await conn.fetchval("""
            SELECT COUNT(*) FROM juego_dioses.agrupaciones
            WHERE dimension_id = $1
        """, dimension_id)
        
        print("\n" + "="*50)
        print("Seed de demo completado exitosamente!")
        print(f"Dimensión ID: {dimension_id}")
        print(f"Total partículas: {total_particulas}")
        print(f"Total agrupaciones (árboles): {total_agrupaciones}")
        print("="*50)
        
    except Exception as e:
        print(f"Error en seed: {e}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_demo())

