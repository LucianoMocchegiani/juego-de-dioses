-- Datos iniciales (seed data)
SET search_path TO juego_dioses, public;

-- Tipos de Partículas Comunes
INSERT INTO tipos_particulas (nombre, tipo_fisico, densidad, color, geometria, opacidad) VALUES
-- Terreno (sólidos)
('tierra', 'solido', 1.5, '#8B4513', '{"tipo": "box"}', 1.0),  -- Brown (marrón tierra)
('piedra', 'solido', 2.5, '#696969', '{"tipo": "box"}', 1.0),  -- Dim gray (gris oscuro piedra)
('arena', 'solido', 1.2, '#F4A460', '{"tipo": "box"}', 1.0),  -- Sandy brown (arena)
('arcilla', 'solido', 1.8, '#CD853F', '{"tipo": "box"}', 1.0),  -- Peru (arcilla)
('roca_magmatica', 'solido', 3.0, '#8B0000', '{"tipo": "box"}', 1.0),  -- Dark red (roca magmática)
('nieve', 'solido', 0.3, '#FFFFFF', '{"tipo": "box"}', 1.0),  -- White (nieve)
('hielo', 'solido', 0.9, '#87CEEB', '{"tipo": "box"}', 1.0),  -- Sky blue (hielo)
-- Líquidos (esferas para fluidez visual)
('agua', 'liquido', 1.0, '#4169E1', '{"tipo": "sphere", "parametros": {"radius": 0.5, "segments": 16}}', 0.6),  -- Royal blue (agua, semi-transparente)
('agua_sucia', 'liquido', 1.05, '#00008B', '{"tipo": "sphere", "parametros": {"radius": 0.5, "segments": 16}}', 1.0),  -- Dark blue (agua sucia)
('lava', 'liquido', 3.0, '#FF4500', '{"tipo": "sphere", "parametros": {"radius": 0.5, "segments": 16}}', 1.0),  -- Orange red (lava)
('pantano', 'liquido', 1.1, '#556B2F', '{"tipo": "sphere", "parametros": {"radius": 0.5, "segments": 16}}', 1.0),  -- Dark olive green (pantano)
('aceite', 'liquido', 0.9, '#000000', '{"tipo": "sphere", "parametros": {"radius": 0.5, "segments": 16}}', 1.0),  -- Black (aceite)
('sangre', 'liquido', 1.05, '#8B0000', '{"tipo": "sphere", "parametros": {"radius": 0.5, "segments": 16}}', 1.0),  -- Dark red (sangre)
-- Orgánicos (sólidos)
('carne', 'solido', 1.0, '#FFC0CB', '{"tipo": "box"}', 1.0),  -- Pink (carne)
('hueso', 'solido', 1.8, '#F5F5DC', '{"tipo": "box"}', 1.0),  -- Beige (hueso)
('piel', 'solido', 0.8, '#D2B48C', '{"tipo": "box"}', 1.0),  -- Tan (piel)
('madera', 'solido', 0.6, '#8B4513', '{"tipo": "cylinder", "parametros": {"radiusTop": 0.4, "radiusBottom": 0.5, "height": 1.0, "segments": 8}}', 1.0),  -- Brown (madera - cilindro)
('hojas', 'solido', 0.2, '#006400', '{"tipo": "box"}', 1.0),  -- Dark green (hojas - verde oscuro)
('hierba', 'solido', 0.3, '#7CFC00', '{"tipo": "box"}', 1.0),  -- Lawn green (hierba - verde lima brillante)
-- Energía (esferas para energía)
('energia_fuego', 'energia', 0.0, '#FF8C00', '{"tipo": "sphere", "parametros": {"radius": 0.5, "segments": 16}}', 1.0),  -- Dark orange (energía fuego)
('energia_hielo', 'energia', 0.0, '#00FFFF', '{"tipo": "sphere", "parametros": {"radius": 0.5, "segments": 16}}', 1.0),  -- Cyan (energía hielo)
('energia_rayo', 'energia', 0.0, '#FFFF00', '{"tipo": "sphere", "parametros": {"radius": 0.5, "segments": 16}}', 1.0),  -- Yellow (energía rayo)
('energia_vida', 'energia', 0.0, '#32CD32', '{"tipo": "sphere", "parametros": {"radius": 0.5, "segments": 16}}', 1.0),  -- Lime green (energía vida)
('energia_oscuridad', 'energia', 0.0, '#800080', '{"tipo": "sphere", "parametros": {"radius": 0.5, "segments": 16}}', 1.0),  -- Purple (energía oscuridad)
('mana', 'energia', 0.0, '#0000FF', '{"tipo": "sphere", "parametros": {"radius": 0.5, "segments": 16}}', 1.0),  -- Blue (mana)
('poder_divino', 'energia', 0.0, '#FFD700', '{"tipo": "sphere", "parametros": {"radius": 0.5, "segments": 16}}', 1.0),  -- Gold (poder divino)
-- Gases (esferas pequeñas)
('aire', 'gas', 0.001, 'transparent', '{"tipo": "sphere", "parametros": {"radius": 0.3, "segments": 8}}', 0.0),  -- Transparent (aire)
('vapor', 'gas', 0.002, '#FFFFFF', '{"tipo": "sphere", "parametros": {"radius": 0.3, "segments": 8}}', 0.5),  -- White (vapor, semi-transparente)
('humo', 'gas', 0.001, '#696969', '{"tipo": "sphere", "parametros": {"radius": 0.3, "segments": 8}}', 0.4),  -- Dim gray (humo, semi-transparente)
('gas_toxico', 'gas', 0.003, '#00FF00', '{"tipo": "sphere", "parametros": {"radius": 0.3, "segments": 8}}', 0.7),  -- Green (gas tóxico, semi-transparente)
('neblina_magica', 'gas', 0.001, '#9370DB', '{"tipo": "sphere", "parametros": {"radius": 0.3, "segments": 8}}', 0.5),  -- Medium purple (neblina mágica, semi-transparente)
-- Sistema (partículas límite indestructibles - sólido especial)
('límite', 'solido', 9.99, 'transparent', '{"tipo": "box"}', 0.0)  -- Transparent (límite)
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

-- Bloque inicial de ejemplo
INSERT INTO bloques (nombre, ancho_metros, alto_metros, profundidad_maxima, altura_maxima, tamano_celda, origen_z)
VALUES ('Mundo Inicial', 200.0, 200.0, -100, 100, 0.25, 0)
ON CONFLICT DO NOTHING;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Datos iniciales insertados correctamente';
END $$;

-- ===== NOTA: La columna 'estilos' fue removida del schema =====
-- Los estilos ahora se manejan en el frontend o en propiedades_fisicas JSONB
-- Esta sección se mantiene comentada por si se necesita en el futuro

-- ===== Agregar Formas Geométricas a Tipos de Partículas =====
-- NOTA: Los parámetros son RELATIVOS a tamano_celda de la dimensión.
-- Tamaño absoluto = parametro × tamano_celda × escala
-- Ejemplo: tamano_celda = 0.25m, radius = 0.5 → radio absoluto = 0.125m

-- ===== NOTA: Las formas geométricas ahora se manejan en la columna 'geometria' JSONB =====
-- La columna 'geometria' ya tiene un valor por defecto de '{"tipo": "box"}'
-- Las formas personalizadas se configuran directamente en el INSERT arriba
-- Para actualizaciones adicionales, ver 03-update-colors-geometries.sql

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Seed data insertado correctamente';
END $$;

