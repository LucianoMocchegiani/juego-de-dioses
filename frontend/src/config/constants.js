/**
 * Constantes del frontend
 */

// Colores
export const DEFAULT_COLOR = 0xFFFFFF;
export const COLOR_CIELO = 0x87CEEB;
export const COLOR_GRID_PRIMARY = 0x888888;
export const COLOR_GRID_SECONDARY = 0x444444;
export const COLOR_LUZ_AMBIENTE = 0xffffff;
export const COLOR_LUZ_DIRECCIONAL = 0xffffff;

// Configuración de cámara
export const CAMERA_FOV = 75;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 3000; // Aumentado para ver sol y luna que orbitan a ~1500m del centro
export const CAMERA_POSITION_X = 15;
export const CAMERA_POSITION_Y = 15;
export const CAMERA_POSITION_Z = 15;

// Configuración de controles
export const CONTROLS_DAMPING_FACTOR = 0.05;
export const CONTROLS_MIN_DISTANCE = 5;
export const CONTROLS_MAX_DISTANCE = 50;

// Configuración de luces
export const LUZ_AMBIENTE_INTENSIDAD = 0.6;
export const LUZ_DIRECCIONAL_INTENSIDAD = 0.8;
export const LUZ_DIRECCIONAL_POS_X = 10;
export const LUZ_DIRECCIONAL_POS_Y = 10;
export const LUZ_DIRECCIONAL_POS_Z = 5;

// Configuración de materiales por defecto
export const MATERIAL_DEFAULT_METALNESS = 0.1;
export const MATERIAL_DEFAULT_ROUGHNESS = 0.8;

// Ajustes de brillo para colores oscuros
export const COLOR_MAX_VALUE = 255;

// Tamaño de celda por defecto
export const DEFAULT_CELL_SIZE = 0.25;

// Limitaciones de viewport (para evitar sobrecarga)
// Con instanced rendering, podemos manejar más partículas eficientemente
// celdas en x, y, z
export const VIEWPORT_MAX_CELLS_X = 160; // Hasta 160 celdas en x (40m con celda de 0.25m)
export const VIEWPORT_MAX_CELLS_Y = 160; // Hasta 160 celdas en y (40m con celda de 0.25m)

// Nombre de la dimensión demo a cargar
// export const DEMO_DIMENSION_NAME = 'Terreno Test 1 - Bosque Denso'; // Terreno test 1: bosque denso con acuífero
export const DEMO_DIMENSION_NAME = 'Terreno Test 2 - Lago y Montaña'; // Terreno test 2: lago, montaña y pocos árboles (por defecto)
