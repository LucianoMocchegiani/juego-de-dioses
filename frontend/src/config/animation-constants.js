/**
 * Constantes centralizadas para sistema de animaciones
 * 
 * Centraliza valores mágicos y strings para evitar errores de tipeo
 * y facilitar cambios futuros.
 */
export const ANIMATION_CONSTANTS = {
    // Estados fundamentales (usados como fallback y valores por defecto)
    STATE_IDS: {
        IDLE: 'idle',
        COMBAT_STANCE: 'combat_stance',
    },
    
    // Tipos de estado (usados en type checking)
    STATE_TYPES: {
        COMBAT: 'combat',
        COMBO: 'combo',
        NORMAL: 'normal',
    },
    
    // Tipos de condición (usados en ConditionFactory)
    CONDITION_TYPES: {
        INPUT: 'input',
        PHYSICS: 'physics',
        MOVEMENT: 'movement',
        COMBO: 'combo',
        COMBAT: 'combat',
    },
    
    // Valores numéricos del sistema
    NUMERIC: {
        // Progreso de animación (100%)
        PROGRESS_COMPLETE: 1.0,
        
        // Valores por defecto
        DEFAULT_OFFSET_X: 0,
        DEFAULT_OFFSET_Y: 0,
        DEFAULT_OFFSET_Z: 0,
        DEFAULT_ROTATION_X: 0,
        DEFAULT_ROTATION_Y: 0,
        DEFAULT_ROTATION_Z: 0,
    },
    
    // Prioridades de sistemas (para documentación y validación)
    SYSTEM_PRIORITIES: {
        INPUT_SYSTEM: 0,
        PHYSICS_SYSTEM: 1,
        COMBAT_SYSTEM: 1.4,
        COMBO_SYSTEM: 1.5,
        ANIMATION_STATE_SYSTEM: 2,
        ANIMATION_MIXER_SYSTEM: 2.5,
        RENDER_SYSTEM: 3,
    },
    
    // Configuración de física del jugador
    PLAYER_PHYSICS: {
        MASS: 70,
        GROUND_FRICTION: 0.8,
        AIR_FRICTION: 0.95,
        MAX_VELOCITY: { x: 5, y: 10, z: 5 },
        JUMP_VELOCITY: 5, // Velocidad de salto en celdas/segundo
        ANIMATION_SPEED: 1.0,
    },
    
    // Valores por defecto de spawn
    DEFAULT_SPAWN: {
        X: 80,
        Y: 80,
        Z: 1,
        CELL_SIZE: 0.25,
    },
    
    // Configuración de mesh por defecto (fallback)
    DEFAULT_MESH: {
        BODY: {
            RADIUS: 0.3,
            HEIGHT: 1.0,
            SEGMENTS: 8,
            COLOR: 0x8B4513,
            POSITION_Y: 0.5,
        },
        HEAD: {
            RADIUS: 0.25,
            SEGMENTS: 8,
            COLOR: 0xFFDBB3,
            POSITION_Y: 1.25,
        },
        MATERIAL: {
            METALNESS: 0.1,
            ROUGHNESS: 0.8,
        },
    },
    
    // Valores del sistema de input
    INPUT: {
        // Velocidades de movimiento (celdas/segundo)
        WALK_SPEED: 200,  // Aumentado de 15 a 30
        RUN_SPEED: 1500,   // Aumentado de 30 a 60
        
        // Thresholds
        DIRECTION_NORMALIZE_THRESHOLD: 0.01,
        
        // Valores de dirección
        DIRECTION: {
            FORWARD: -1,
            BACKWARD: 1,
            LEFT: -1,
            RIGHT: 1,
            NONE: 0,
        },
        
        // Mouse button indices
        MOUSE_BUTTONS: {
            LEFT: 0,
            RIGHT: 2,
            MIDDLE: 1,
        },
    },
    
    // Valores del sistema de física
    PHYSICS: {
        GRAVITY: -9.8, // celdas/segundo²
        FIXED_TIMESTEP: 1/60, // segundos (60 FPS)
    },
    
    // Valores del sistema de combos
    COMBO: {
        TIMING_MULTIPLIER: 1.5, // Multiplicador para timing window de expiración
    },
    
    // Valores del sistema de colisiones
    COLLISION: {
        // Threshold de invalidación de cache (en celdas)
        CACHE_INVALIDATION_THRESHOLD: 2,
        
        // Estado de partícula sólida
        PARTICLE_STATE_SOLID: 'solido',
        
        // Valores de respawn por defecto
        DEFAULT_RESPAWN: {
            X: 80,
            Y: 80,
            Z: 1,
        },
        
        // Valores de límites de dimensión por defecto
        DEFAULT_DIMENSION: {
            MIN_Z: -10,
            MAX_Z: 40,
        },
        
        // Valores de corrección de posición
        POSITION_CORRECTION: {
            MIN_Z: 1,
            VELOCITY_RESET: 0,
        },
    },
};

