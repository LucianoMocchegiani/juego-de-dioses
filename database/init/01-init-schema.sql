-- Script de inicialización de la base de datos
-- Este script se ejecuta automáticamente al crear el contenedor de PostgreSQL

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsquedas de texto

-- Crear esquema principal
CREATE SCHEMA IF NOT EXISTS juego_dioses;

-- Cambiar al esquema
SET search_path TO juego_dioses, public;

-- Tabla de Dimensiones
CREATE TABLE IF NOT EXISTS dimensiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) DEFAULT 'Mundo Inicial',
    
    -- Límites horizontales (X, Y)
    ancho_metros DECIMAL(10,2) DEFAULT 1.0,
    alto_metros DECIMAL(10,2) DEFAULT 1.0,
    
    -- Límites verticales (Z)
    profundidad_maxima INTEGER DEFAULT -100,
    altura_maxima INTEGER DEFAULT 100,
    
    -- Tamaño de celda en METROS
    tamano_celda DECIMAL(5,2) DEFAULT 0.25,
    
    -- Posición del origen
    origen_x DECIMAL(10,2) DEFAULT 0.0,
    origen_y DECIMAL(10,2) DEFAULT 0.0,
    origen_z INTEGER DEFAULT 0,
    
    -- Metadatos
    creado_por UUID,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dimensiones_creado ON dimensiones(creado_en);

-- Tabla de Tipos de Partículas
CREATE TABLE IF NOT EXISTS tipos_particulas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    categoria VARCHAR(50) NOT NULL,
    densidad DECIMAL(10,4) DEFAULT 1.0,
    color_base VARCHAR(50),
    descripcion TEXT,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tipos_particulas_nombre ON tipos_particulas(nombre);
CREATE INDEX IF NOT EXISTS idx_tipos_particulas_categoria ON tipos_particulas(categoria);

-- Tabla de Estados de Materia
CREATE TABLE IF NOT EXISTS estados_materia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) NOT NULL UNIQUE,
    tipo_fisica VARCHAR(50),
    viscosidad DECIMAL(10,4),
    densidad_estado DECIMAL(10,4),
    gravedad BOOLEAN DEFAULT true,
    flujo BOOLEAN DEFAULT false,
    propagacion BOOLEAN DEFAULT false,
    descripcion TEXT,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estados_materia_nombre ON estados_materia(nombre);
CREATE INDEX IF NOT EXISTS idx_estados_materia_tipo ON estados_materia(tipo_fisica);

-- Tabla de Partículas
CREATE TABLE IF NOT EXISTS particulas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dimension_id UUID NOT NULL REFERENCES dimensiones(id) ON DELETE CASCADE,
    
    -- Posición 3D
    celda_x INTEGER NOT NULL,
    celda_y INTEGER NOT NULL,
    celda_z INTEGER NOT NULL,
    
    -- Tipo y estado
    tipo_particula_id UUID NOT NULL REFERENCES tipos_particulas(id),
    estado_materia_id UUID NOT NULL REFERENCES estados_materia(id),
    
    -- Propiedades dinámicas
    cantidad DECIMAL(10,4) DEFAULT 1.0,
    temperatura DECIMAL(10,2) DEFAULT 20.0,
    energia DECIMAL(10,4) DEFAULT 0.0,
    extraida BOOLEAN DEFAULT false,
    
    -- Agrupación
    agrupacion_id UUID,
    es_nucleo BOOLEAN DEFAULT false,
    
    -- Propiedades especiales
    propiedades JSONB DEFAULT '{}',
    
    -- Metadatos
    creado_por UUID,
    creado_en TIMESTAMP DEFAULT NOW(),
    modificado_en TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(dimension_id, celda_x, celda_y, celda_z)
);

CREATE INDEX IF NOT EXISTS idx_particulas_dimension ON particulas(dimension_id);
CREATE INDEX IF NOT EXISTS idx_particulas_tipo ON particulas(tipo_particula_id);
CREATE INDEX IF NOT EXISTS idx_particulas_estado ON particulas(estado_materia_id);
CREATE INDEX IF NOT EXISTS idx_particulas_agrupacion ON particulas(agrupacion_id);
CREATE INDEX IF NOT EXISTS idx_particulas_nucleo ON particulas(agrupacion_id, es_nucleo) WHERE es_nucleo = true;
CREATE INDEX IF NOT EXISTS idx_particulas_posicion ON particulas(dimension_id, celda_x, celda_y, celda_z);
CREATE INDEX IF NOT EXISTS idx_particulas_z ON particulas(dimension_id, celda_z);

-- Tabla de Agrupaciones
CREATE TABLE IF NOT EXISTS agrupaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dimension_id UUID NOT NULL REFERENCES dimensiones(id) ON DELETE CASCADE,
    
    -- Identificación
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    descripcion TEXT,
    especie VARCHAR(100),
    
    -- Posición aproximada
    posicion_x INTEGER,
    posicion_y INTEGER,
    posicion_z INTEGER,
    
    -- Estado
    activa BOOLEAN DEFAULT true,
    salud DECIMAL(10,4) DEFAULT 100.0,
    
    -- Sistema de Núcleo
    tiene_nucleo BOOLEAN DEFAULT false,
    nucleo_conectado BOOLEAN DEFAULT true,
    ultima_verificacion_nucleo TIMESTAMP,
    
    -- Metadatos
    creado_por UUID,
    creado_en TIMESTAMP DEFAULT NOW(),
    modificado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agrupaciones_dimension ON agrupaciones(dimension_id);
CREATE INDEX IF NOT EXISTS idx_agrupaciones_tipo ON agrupaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_agrupaciones_dimension_tipo ON agrupaciones(dimension_id, tipo);
CREATE INDEX IF NOT EXISTS idx_agrupaciones_nombre ON agrupaciones(nombre);
CREATE INDEX IF NOT EXISTS idx_agrupaciones_especie ON agrupaciones(especie);

-- Agregar foreign key de agrupacion_id en particulas
ALTER TABLE particulas 
ADD CONSTRAINT fk_particulas_agrupacion 
FOREIGN KEY (agrupacion_id) REFERENCES agrupaciones(id) ON DELETE SET NULL;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Esquema de base de datos inicializado correctamente';
END $$;

