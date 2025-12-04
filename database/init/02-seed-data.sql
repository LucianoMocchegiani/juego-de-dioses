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
('neblina_magica', 'gas', 0.001, 'purple')
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

