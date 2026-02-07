/**
 * Configuración de optimizaciones de partículas
 * 
 * Centraliza todos los valores configurables para el sistema de renderizado
 * y optimización de partículas del terreno.
 */

// ============================================================================
// LÍMITES DE PARTÍCULAS
// ============================================================================

/**
 * Límite máximo de partículas por defecto
 */
export const DEFAULT_MAX_PARTICLES = 150000;

/**
 * Límites para AdaptiveLimiter (ajuste dinámico según FPS)
 */
export const ADAPTIVE_LIMITER_LIMITS = {
    min: 80000,      // FPS < 45: límite mínimo
    low: 100000,      // FPS 45-55: límite bajo
    medium: 120000,  // FPS 55-59: límite medio
    max: 150000      // FPS >= 60: límite máximo
};

/**
 * Tiempo de debounce para ajustes del AdaptiveLimiter (ms)
 */
export const ADAPTIVE_LIMITER_DEBOUNCE = 2000;

// ============================================================================
// DISTANCIAS DE DENSIDAD
// ============================================================================

/**
 * Distancias para limitación por densidad
 * Partículas dentro de `near` metros se renderizan al 100%
 * Partículas entre `near` y `far` metros se reducen al 50%
 * Partículas más allá de `far` metros se reducen al 25%
 */
export const DENSITY_DISTANCES = {
    near: 50,   // Partículas dentro de 50m: 100%
    far: 100    // Partículas lejanas: densidad reducida (> 100m se reducen al 25%)
};

/**
 * Límite total de celdas permitidas para cálculo de Viewport (por defecto)
 * Usado por `Viewport` cuando se necesita un tope global de celdas.
 */
export const VIEWPORT_MAX_CELLS = 1000000;

/**
 * Distancia por defecto para limitación simple (método antiguo, no usado actualmente)
 */
export const DEFAULT_NEAR_DISTANCE = 20;
export const DEFAULT_FAR_DISTANCE = 50;

// ============================================================================
// OPTIMIZACIÓN ESPECÍFICA PARA AGUA
// ============================================================================

/**
 * Factor de reducción para partículas de agua (más agresivo que otras partículas)
 * 0.25 = 25% de las partículas de agua se renderizan en zonas medias/lejanas
 */
export const WATER_REDUCTION_FACTOR = 0.25;

/**
 * Distancia cercana para agua (más corta que otras partículas para optimización)
 * Agua solo al 100% dentro de 12m (vs 50m para otras partículas)
 */
export const WATER_NEAR_DISTANCE = 12;

/**
 * Tipos de partículas consideradas como líquidos (requieren optimización especial)
 */
export const WATER_TYPES = ['agua', 'agua_sucia', 'lava', 'pantano'];

/**
 * Límite máximo de partículas de agua renderizadas
 * Agua transparente es muy costosa, limitar a máximo 15000 partículas
 */
export const MAX_WATER_PARTICLES = 15000;

/**
 * Posición para ocultar partículas (fuera de la vista)
 * Se usa cuando una partícula se elimina pero no queremos recrear el mesh
 */
export const HIDDEN_PARTICLE_POSITION = -10000;

/**
 * Ratios de distribución para agua cuando excede MAX_WATER_PARTICLES
 */
export const WATER_DISTRIBUTION_RATIOS = {
    medium: 0.7,  // 70% de los slots restantes para partículas medias
    far: 0.3      // 30% de los slots restantes para partículas lejanas
};

/**
 * Thresholds de FPS para AdaptiveLimiter
 */
export const ADAPTIVE_LIMITER_FPS_THRESHOLDS = {
    low: 45,    // FPS < 45: usar límite mínimo
    medium: 55, // FPS 45-55: usar límite bajo
    high: 59    // FPS 55-59: usar límite medio, >= 60: máximo
};

/**
 * Opciones por defecto para limitación de agua
 */
export const WATER_OPTIMIZATION_OPTIONS = {
    waterReductionFactor: WATER_REDUCTION_FACTOR,
    waterNearDistance: WATER_NEAR_DISTANCE,
    waterTypes: WATER_TYPES
};

/**
 * Ratios de muestreo para agua según distancia
 */
export const WATER_SAMPLING_RATIOS = {
    medium: 0.6,  // ~15% si factor es 0.25 (0.25 * 0.6 = 0.15)
    far: 0.12     // ~3% si factor es 0.25 (0.25 * 0.12 = 0.03)
};

// ============================================================================
// LEVEL OF DETAIL (LOD)
// ============================================================================

/**
 * Umbrales de distancia para cada nivel LOD (en metros)
 * OPTIMIZACIÓN: Umbrales cercanos para aplicar LOD antes (mejor rendimiento)
 */
export const LOD_DISTANCE_THRESHOLDS = {
    high: 6,     // < 6m: detalle alto
    medium: 20,  // 6-20m: detalle medio
    low: 100    // > 20m: detalle bajo
};

/**
 * Reducción de segmentos para geometrías esféricas (agua) según LOD
 */
export const LOD_SPHERE_SEGMENTS = {
    high: 16,    // Detalle alto: sin cambios
    medium: 5,   // Detalle medio: 5 segmentos (muy agresivo para agua)
    low: 4      // Detalle bajo: 4 segmentos
};

// ============================================================================
// CONFIGURACIÓN DE RENDERIZADO
// ============================================================================

/**
 * Habilitar/deshabilitar optimizaciones por defecto
 */
export const RENDER_OPTIMIZATIONS = {
    frustumCulling: false,      // Deshabilitado para partículas de terreno (se renderizan alrededor del jugador, no de la cámara)
    lod: true,                  // Habilitado por defecto
    particleLimiting: true,      // Habilitado por defecto
    adaptiveLimiting: false     // TEMPORAL: Deshabilitado para pruebas
};

/**
 * Máximo de instancias por InstancedMesh
 */
export const MAX_INSTANCES_PER_MESH = 100000;

// ============================================================================
// CONFIGURACIÓN DE CARGA DINÁMICA
// ============================================================================

/**
 * Radio de carga alrededor del jugador (en celdas)
 * 50 celdas = 12.5m (con celda de 0.25m)
 */
export const DYNAMIC_LOAD_RADIUS_CELLS = 50;

/**
 * Umbrales de movimiento para re-renderizado y carga
 */
export const MOVEMENT_THRESHOLDS = {
    rerender: 2.0,   // Re-renderizar si el jugador se movió más de 2 metros
};

/**
 * Distancia de carga proactiva (en metros)
 * Cuando el jugador está a esta distancia del borde del área cargada, se carga nueva zona
 * Esto asegura que las partículas estén cargadas antes de que el jugador llegue al borde
 */
export const PROACTIVE_LOAD_DISTANCE = 10.0; // Cargar cuando está a 10m del borde

/**
 * Intervalos mínimos entre operaciones (ms)
 */
export const OPERATION_INTERVALS = {
    rerender: 500,   // Mínimo de 500ms entre re-renderizados
    load: 2000      // Mínimo de 2 segundos entre cargas
};

/**
 * Límites de partículas para carga dinámica
 */
export const LOAD_LIMITS = {
    maxNewPerLoad: 50000,    // Máximo de partículas nuevas por carga
    maxTotal: 300000,        // Máximo total de partículas en cache
    incrementalThreshold: 10000  // Si hay más de 10000 nuevas partículas, usar renderizado incremental
};

/**
 * Factor de reducción del radio cuando se excede el límite de celdas
 */
export const RADIUS_REDUCTION_FACTOR = 0.75; // Reducir 25%

// ============================================================================
// RATIOS DE MUESTREO POR DISTANCIA
// ============================================================================

/**
 * Ratios de muestreo para partículas normales según distancia
 */
export const NORMAL_SAMPLING_RATIOS = {
    near: 1.0,    // Cercanas: 100%
    medium: 0.5,  // Medianas: 50%
    far: 0.25     // Lejanas: 25%
};

// ============================================================================
// INTERVALOS DE LOGGING
// ============================================================================

/**
 * Intervalos para logs de estadísticas (ms)
 */
export const LOG_INTERVALS = {
    stats: 1000,        // Log de estadísticas cada 1 segundo
    debug: 5000,       // Log de debug cada 5 segundos
    movement: 2000     // Log de movimiento cada 2 segundos
};
