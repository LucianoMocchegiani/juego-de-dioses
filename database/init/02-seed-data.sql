-- Datos iniciales (seed data)
SET search_path TO juego_dioses, public;

-- Tipos de Partículas Comunes
INSERT INTO tipos_particulas (nombre, categoria, densidad, color_base) VALUES
-- Terreno
('tierra', 'terreno', 1.5, 'brown'),
('piedra', 'terreno', 2.5, 'gray'),
('arena', 'terreno', 1.2, 'yellow'),
('arcilla', 'terreno', 1.8, 'orange'),
('roca_magmatica', 'terreno', 3.0, 'darkred'),
('nieve', 'terreno', 0.3, 'white'),
('hielo', 'terreno', 0.9, 'lightblue'),
-- Líquidos
('agua', 'liquido', 1.0, 'blue'),
('agua_sucia', 'liquido', 1.05, 'darkblue'),
('lava', 'liquido', 3.0, 'red'),
('pantano', 'liquido', 1.1, 'darkgreen'),
('aceite', 'liquido', 0.9, 'black'),
('sangre', 'liquido', 1.05, 'darkred'),
-- Orgánicos
('carne', 'organico', 1.0, 'pink'),
('hueso', 'organico', 1.8, 'white'),
('piel', 'organico', 0.8, 'tan'),
('madera', 'organico', 0.6, 'brown'),
('hojas', 'organico', 0.2, 'green'),
('hierba', 'organico', 0.3, 'lightgreen'),
-- Energía
('energia_fuego', 'energia', 0.0, 'orange'),
('energia_hielo', 'energia', 0.0, 'cyan'),
('energia_rayo', 'energia', 0.0, 'yellow'),
('energia_vida', 'energia', 0.0, 'green'),
('energia_oscuridad', 'energia', 0.0, 'purple'),
('mana', 'energia', 0.0, 'blue'),
('poder_divino', 'energia', 0.0, 'gold'),
-- Gases
('aire', 'gas', 0.001, 'transparent'),
('vapor', 'gas', 0.002, 'white'),
('humo', 'gas', 0.001, 'gray'),
('gas_toxico', 'gas', 0.003, 'green'),
('neblina_magica', 'gas', 0.001, 'purple'),
-- Sistema (partículas límite indestructibles)
('límite', 'sistema', 999999.0, 'transparent')
ON CONFLICT (nombre) DO NOTHING;

-- Estados de Materia
INSERT INTO estados_materia (nombre, tipo_fisica, viscosidad, gravedad, flujo, propagacion) VALUES
('solido', 'rigido', 999999.0, true, false, false),
('liquido', 'fluido', 1.0, true, true, false),
('liquido_viscoso', 'fluido', 50.0, true, true, false),
('liquido_muy_viscoso', 'fluido', 1000.0, true, true, false),
('gaseoso', 'fluido', 0.01, false, true, false),
('gaseoso_pesado', 'fluido', 0.02, true, true, false),
('poder', 'energetico', 0.0, false, true, true),
('plasma', 'energetico', 0.001, false, true, true)
ON CONFLICT (nombre) DO NOTHING;

-- Dimensión inicial de ejemplo
INSERT INTO dimensiones (nombre, ancho_metros, alto_metros, profundidad_maxima, altura_maxima, tamano_celda, origen_z)
VALUES ('Mundo Inicial', 200.0, 200.0, -100, 100, 0.25, 0)
ON CONFLICT DO NOTHING;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Datos iniciales insertados correctamente';
END $$;

-- ===== Migración de Colores Hardcoded a Estilos JSONB =====

-- Función helper para convertir hex a RGB
CREATE OR REPLACE FUNCTION hex_to_rgb(hex_value INTEGER) 
RETURNS INTEGER[] AS $$
BEGIN
    RETURN ARRAY[
        (hex_value >> 16) & 255,
        (hex_value >> 8) & 255,
        hex_value & 255
    ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Migrar colores hardcoded del frontend a estilos JSONB
-- NOTA: color_hex se guarda como string hexadecimal en formato CSS (ej: "#8B4513") para compatibilidad
-- con múltiples frontends (Web, Mobile, VR, etc.). THREE.Color acepta directamente este formato.
UPDATE juego_dioses.tipos_particulas 
SET estilos = jsonb_build_object(
    'color_hex', CASE nombre
        WHEN 'hierba' THEN '#90EE90'   -- Verde claro
        WHEN 'madera' THEN '#8B4513'   -- Marrón
        WHEN 'hojas' THEN '#228B22'    -- Verde bosque
        WHEN 'tierra' THEN '#8B7355'   -- Tan
        WHEN 'piedra' THEN '#808080'   -- Gris
        WHEN 'agua' THEN '#4169E1'     -- Azul
        WHEN 'aire' THEN '#FFFFFF'     -- Blanco
        ELSE NULL
    END,
    'color_rgb', CASE nombre
        WHEN 'hierba' THEN hex_to_rgb(9474192)
        WHEN 'madera' THEN hex_to_rgb(9145235)
        WHEN 'hojas' THEN hex_to_rgb(2263842)
        WHEN 'tierra' THEN hex_to_rgb(9147221)
        WHEN 'piedra' THEN hex_to_rgb(8421504)
        WHEN 'agua' THEN hex_to_rgb(4279617)
        WHEN 'aire' THEN hex_to_rgb(16777215)
        ELSE NULL
    END,
    'material', jsonb_build_object(
        'metalness', 0.1,
        'roughness', 0.8,
        'emissive', false
    ),
    'visual', jsonb_build_object(
        'modelo', 'cube',
        'escala', 1.0
    )
)
WHERE nombre IN ('hierba', 'madera', 'hojas', 'tierra', 'piedra', 'agua', 'aire')
  AND (estilos IS NULL OR estilos = '{}'::jsonb);

-- Agregar estilos para partícula límite (transparente e indestructible)
UPDATE juego_dioses.tipos_particulas 
SET estilos = jsonb_build_object(
    'color_hex', '#000000',
    'color_rgb', ARRAY[0, 0, 0],
    'material', jsonb_build_object(
        'metalness', 0.0,
        'roughness', 1.0,
        'emissive', false
    ),
    'visual', jsonb_build_object(
        'modelo', 'cube',
        'escala', 1.0,
        'opacity', 0.0
    )
)
WHERE nombre = 'límite'
  AND (estilos IS NULL OR estilos = '{}'::jsonb);

-- Limpiar función helper (opcional, se puede mantener para futuras migraciones)
-- DROP FUNCTION IF EXISTS hex_to_rgb(INTEGER);

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Colores hardcoded migrados a estilos JSONB correctamente';
END $$;

-- ===== Agregar Formas Geométricas a Tipos de Partículas =====
-- NOTA: Los parámetros son RELATIVOS a tamano_celda de la dimensión.
-- Tamaño absoluto = parametro × tamano_celda × escala
-- Ejemplo: tamano_celda = 0.25m, radius = 0.5 → radio absoluto = 0.125m

-- Actualizar tipo "madera" con forma cilíndrica (tronco de árbol)
UPDATE juego_dioses.tipos_particulas 
SET estilos = jsonb_set(
    COALESCE(estilos, '{}'::jsonb),
    '{visual,geometria}',
    '{
        "tipo": "cylinder",
        "parametros": {
            "radiusTop": 0.4,
            "radiusBottom": 0.5,
            "height": 1.0,
            "segments": 8
        }
    }'::jsonb
)
WHERE nombre = 'madera';

-- Actualizar tipo "hojas" con forma esférica (copa de árbol)
UPDATE juego_dioses.tipos_particulas 
SET estilos = jsonb_set(
    COALESCE(estilos, '{}'::jsonb),
    '{visual,geometria}',
    '{
        "tipo": "sphere",
        "parametros": {
            "radius": 0.5,
            "segments": 16
        }
    }'::jsonb
)
WHERE nombre = 'hojas';

-- Actualizar tipo "piedra" con forma de caja (box por defecto, pero más irregular)
-- Mantener box pero con parámetros ligeramente diferentes para variación
UPDATE juego_dioses.tipos_particulas 
SET estilos = jsonb_set(
    COALESCE(estilos, '{}'::jsonb),
    '{visual,geometria}',
    '{
        "tipo": "box",
        "parametros": {
            "width": 0.9,
            "height": 0.85,
            "depth": 0.95
        }
    }'::jsonb
)
WHERE nombre = 'piedra';

-- Actualizar tipo "agua" con forma de caja (box por defecto) y transparencia
-- Mantener box estándar para líquidos, pero con transparencia para visualización correcta
UPDATE juego_dioses.tipos_particulas 
SET estilos = jsonb_set(
    jsonb_set(
        COALESCE(estilos, '{}'::jsonb),
        '{visual,geometria}',
        '{
            "tipo": "box",
            "parametros": {
                "width": 1.0,
                "height": 1.0,
                "depth": 1.0
            }
        }'::jsonb
    ),
    '{visual,opacity}',
    '0.7'::jsonb
)
WHERE nombre = 'agua';

-- Actualizar tipo "hierba" con forma de caja pequeña (box)
UPDATE juego_dioses.tipos_particulas 
SET estilos = jsonb_set(
    COALESCE(estilos, '{}'::jsonb),
    '{visual,geometria}',
    '{
        "tipo": "box",
        "parametros": {
            "width": 0.8,
            "height": 0.6,
            "depth": 0.8
        }
    }'::jsonb
)
WHERE nombre = 'hierba';

-- Actualizar tipo "tierra" con forma de caja (box)
UPDATE juego_dioses.tipos_particulas 
SET estilos = jsonb_set(
    COALESCE(estilos, '{}'::jsonb),
    '{visual,geometria}',
    '{
        "tipo": "box",
        "parametros": {
            "width": 1.0,
            "height": 1.0,
            "depth": 1.0
        }
    }'::jsonb
)
WHERE nombre = 'tierra';

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Formas geométricas agregadas a tipos de partículas correctamente';
END $$;

