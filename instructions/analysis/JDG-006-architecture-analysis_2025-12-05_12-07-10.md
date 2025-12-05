# Análisis de Arquitectura - Almacenamiento de Formas Geométricas en Base de Datos (JDG-006)

## Situación Actual

### Base de Datos

**Estructura actual:**

1. **`tipos_particulas`**:
   - Campo `estilos JSONB` que ya incluye:
     ```json
     {
       "color_hex": "#8B4513",
       "color_rgb": [139, 69, 19],
       "material": {
         "metalness": 0.1,
         "roughness": 0.8,
         "emissive": false
       },
       "visual": {
         "modelo": "cube",  // ← Ya existe campo para modelo
         "escala": 1.0
       }
     }
     ```

2. **`particulas`**:
   - Campo `propiedades JSONB` para datos específicos de la partícula
   - Campo `agrupacion_id` para vincular con entidades completas

3. **`agrupaciones`**:
   - Representa entidades completas (árboles, animales, etc.)
   - Campos: `nombre`, `tipo`, `especie`, `posicion_x/y/z`
   - No tiene campo para formas geométricas actualmente

### Frontend Actual

**Renderizado:**
- Todas las partículas se renderizan como cubos (`BoxGeometry`)
- No hay diferenciación de formas según tipo o agrupación
- La forma está hardcodeada en el código del frontend

### Problema Identificado

**Situación:**
- Los objetos pueden tener formas diferentes (cilindros para troncos, esferas para copas, etc.)
- El sistema debe funcionar con múltiples frontends (no solo Three.js)
- La forma actualmente está en el código del frontend, no en la BD

**Pregunta clave:**
¿Es óptimo almacenar las formas geométricas en la base de datos? ¿A qué nivel (partícula o agrupación)?

## Concepto Clave: Parámetros vs Tamaño Físico

**IMPORTANTE:** Antes de analizar las opciones, es crucial entender la diferencia entre parámetros y tamaño físico.

### ¿Qué son los parámetros?

Los parámetros en `geometria.parametros` **NO son de animación** ni tamaños absolutos. Son **valores relativos** que definen la **forma y proporciones** de la geometría.

### Relación con `tamano_celda`

- **`tamano_celda`**: Tamaño físico base de una celda (default: 0.25m = 25cm)
- **Parámetros**: Valores relativos a `tamano_celda`
- **Fórmula**: `Tamaño absoluto = parámetro × tamano_celda × escala`

### Ejemplos Prácticos

**Ejemplo 1: Box estándar**
```json
{
  "geometria": {
    "tipo": "box",
    "parametros": {
      "width": 1.0,   // 1.0 × 0.25m = 0.25m (tamaño de celda)
      "height": 1.0,  // 1.0 × 0.25m = 0.25m
      "depth": 1.0    // 1.0 × 0.25m = 0.25m
    }
  }
}
```
Resultado: Cubo de 0.25m × 0.25m × 0.25m (tamaño estándar de partícula)

**Ejemplo 2: Box más ancho**
```json
{
  "geometria": {
    "tipo": "box",
    "parametros": {
      "width": 2.0,   // 2.0 × 0.25m = 0.5m (el doble de ancho)
      "height": 1.0,  // 1.0 × 0.25m = 0.25m
      "depth": 1.0    // 1.0 × 0.25m = 0.25m
    }
  }
}
```
Resultado: Caja de 0.5m × 0.25m × 0.25m (más ancha que estándar)

**Ejemplo 3: Cilindro (tronco de árbol)**
```json
{
  "geometria": {
    "tipo": "cylinder",
    "parametros": {
      "radiusTop": 0.4,    // 0.4 × 0.25m = 0.1m (10cm) radio superior
      "radiusBottom": 0.5, // 0.5 × 0.25m = 0.125m (12.5cm) radio inferior
      "height": 10.0        // 10.0 × 0.25m = 2.5m de altura
    }
  }
}
```
Resultado: Cilindro de 2.5m de alto, con radio que va de 10cm a 12.5cm

### Ventajas de Parámetros Relativos

1. ✅ **Escalabilidad**: Si cambias `tamano_celda`, todas las formas se escalan automáticamente
2. ✅ **Consistencia**: Todas las partículas usan la misma base de tamaño
3. ✅ **Simplicidad**: No necesitas recalcular tamaños cuando cambias la escala del mundo
4. ✅ **Frontend-agnostic**: Cada frontend escala según su `tamano_celda` local

### Parámetros que NO se Escalan

- `segments`: Número de divisiones para suavizado (no es una dimensión física)
- Cualquier parámetro que sea un contador, índice o configuración de calidad

## Análisis de Opciones

### Opción 1: Formas a Nivel de Tipo de Partícula (`tipos_particulas.estilos.visual`)

**Estructura propuesta:**
```json
{
  "visual": {
    "modelo": "cube",           // Deprecated: usar geometria.tipo
    "escala": 1.0,              // Multiplicador global (opcional, default: 1.0)
    "geometria": {
      "tipo": "box",            // box, sphere, cylinder, cone, torus, custom
      "parametros": {
        // IMPORTANTE: Estos parámetros son RELATIVOS a tamano_celda de la dimensión
        // Tamaño absoluto = parametro × tamano_celda
        // Ejemplo: si tamano_celda = 0.25m y width = 1.0, entonces width absoluto = 0.25m
        // Si width = 2.0, entonces width absoluto = 0.5m (el doble)
        "width": 1.0,           // Ancho relativo (1.0 = tamaño de celda base)
        "height": 1.0,          // Alto relativo
        "depth": 1.0            // Profundidad relativa
      }
    }
  }
}
```

**Nota importante sobre parámetros:**
- Los parámetros **NO son de animación**, son para definir la **forma física y proporciones** de la geometría
- Son **relativos a `tamano_celda`** de la dimensión (default: 0.25m)
- **Tamaño absoluto** = `parametro × tamano_celda × escala`
- Ejemplo: `width: 1.0` con `tamano_celda: 0.25m` = `0.25m` de ancho
- Ejemplo: `width: 2.0` con `tamano_celda: 0.25m` = `0.5m` de ancho (el doble)

**Ventajas:**
- ✅ **Simplicidad**: Todas las partículas del mismo tipo tienen la misma forma
- ✅ **Consistencia**: Garantiza que todas las partículas de "madera" se vean igual
- ✅ **Performance**: Cache eficiente (una forma por tipo)
- ✅ **Frontend-agnostic**: Cada frontend interpreta según su capacidad
- ✅ **Ya existe infraestructura**: Campo `estilos.visual` ya está en BD

**Desventajas:**
- ❌ **Limitación**: No permite variación de forma dentro del mismo tipo
- ❌ **Rigidez**: Un árbol completo (tronco + copa) requiere múltiples tipos de partículas

**Casos de uso:**
- Partículas simples: tierra, piedra, agua (todas cubos)
- Partículas uniformes: todas las partículas de "madera" son cilindros

### Opción 2: Formas a Nivel de Partícula Individual (`particulas.propiedades`)

**Estructura propuesta:**
```json
{
  "geometria": {
    "tipo": "cylinder",
    "parametros": {
      // Parámetros relativos a tamano_celda
      // radiusTop: 0.5 × 0.25m = 0.125m de radio superior
      // height: 2.0 × 0.25m = 0.5m de altura
      "radiusTop": 0.5,
      "radiusBottom": 0.5,
      "height": 2.0
    }
  }
}
```

**Ventajas:**
- ✅ **Máxima flexibilidad**: Cada partícula puede tener forma única
- ✅ **Variación**: Permite formas diferentes dentro del mismo tipo
- ✅ **Personalización**: Partículas individuales pueden tener formas especiales

**Desventajas:**
- ❌ **Overhead de datos**: Cada partícula almacena forma (millones de partículas)
- ❌ **Performance**: Más datos a transferir, más lento el renderizado
- ❌ **Complejidad**: Difícil mantener consistencia visual
- ❌ **Cache ineficiente**: No se puede cachear por tipo

**Casos de uso:**
- Partículas especiales con formas únicas
- Variación artística específica
- Debugging y desarrollo

### Opción 3: Formas a Nivel de Agrupación (`agrupaciones` + `particulas.propiedades`)

**Estructura propuesta:**

**En `agrupaciones`:**
```json
{
  "geometria_agrupacion": {
    "tipo": "arbol",
    "partes": {
      "tronco": {
        "geometria": {
          "tipo": "cylinder",
          "parametros": {
            // Parámetros relativos a tamano_celda
            // radiusTop: 0.3 × 0.25m = 0.075m (7.5cm) radio superior
            // radiusBottom: 0.5 × 0.25m = 0.125m (12.5cm) radio inferior
            // height: 10.0 × 0.25m = 2.5m de altura
            "radiusTop": 0.3,
            "radiusBottom": 0.5,
            "height": 10.0
          }
        }
      },
      "copa": {
        "geometria": {
          "tipo": "sphere",
          "parametros": {
            // radius: 3.0 × 0.25m = 0.75m de radio (1.5m de diámetro)
            "radius": 3.0
          }
        }
      },
      "raices": {
        "geometria": {
          "tipo": "cylinder",
          "parametros": {
            // radiusTop: 0.2 × 0.25m = 0.05m (5cm)
            // radiusBottom: 0.4 × 0.25m = 0.1m (10cm)
            // height: 2.0 × 0.25m = 0.5m de profundidad
            "radiusTop": 0.2,
            "radiusBottom": 0.4,
            "height": 2.0
          }
        }
      }
    }
  }
}
```

**En `particulas.propiedades` (para partículas de agrupación):**
```json
{
  "parte_entidad": "tronco",  // tronco, copa, raiz, cuerpo, cabeza, etc.
  "indice_parte": 0
}
```

**Ventajas:**
- ✅ **Eficiencia**: Una definición de forma por agrupación (no por partícula)
- ✅ **Coherencia**: Todas las partículas de un árbol comparten la misma definición
- ✅ **Flexibilidad**: Permite formas complejas con múltiples partes
- ✅ **Escalabilidad**: Funciona bien con millones de partículas
- ✅ **Semántica**: Refleja la realidad (un árbol es una entidad con partes)

**Desventajas:**
- ❌ **Complejidad**: Requiere lógica adicional para mapear partículas a partes
- ❌ **Dependencia**: Las partículas dependen de su agrupación para la forma
- ❌ **Migración**: Requiere actualizar datos existentes

**Casos de uso:**
- Árboles (tronco + copa + raíces)
- Animales (cuerpo + cabeza + patas)
- Construcciones (múltiples partes)

### Opción 4: Híbrida (Tipo + Agrupación)

**Estructura:**
- **Forma base** en `tipos_particulas.estilos.visual` (default para partículas sueltas)
- **Forma especializada** en `agrupaciones` (override para partículas agrupadas)
- **Prioridad**: Agrupación > Tipo > Default

**Ventajas:**
- ✅ **Flexibilidad máxima**: Soporta ambos casos de uso
- ✅ **Backward compatible**: Partículas sin agrupación usan forma del tipo
- ✅ **Eficiencia**: Cache por tipo y por agrupación

**Desventajas:**
- ❌ **Complejidad**: Lógica de resolución de formas más compleja
- ❌ **Overhead**: Requiere verificar agrupación antes de tipo

## Recomendación: Opción 4 (Híbrida)

### Justificación

1. **Compatibilidad con múltiples frontends:**
   - La forma se define de forma abstracta en BD (tipo, parámetros)
   - Cada frontend interpreta según su capacidad:
     - Three.js: `BoxGeometry`, `SphereGeometry`, `CylinderGeometry`
     - Unity: `Cube`, `Sphere`, `Cylinder`
     - WebGL puro: Implementación custom
     - 2D: Proyección de formas 3D

2. **Performance:**
   - Cache eficiente: formas por tipo (muchos tipos, pocos cambios)
   - Cache por agrupación: formas complejas (pocas agrupaciones activas)
   - No se duplica información en cada partícula

3. **Escalabilidad:**
   - Funciona con millones de partículas
   - No aumenta significativamente el tamaño de datos
   - Permite agregar nuevos tipos de formas sin migración

4. **Flexibilidad:**
   - Soporta partículas sueltas (tierra, piedra)
   - Soporta entidades complejas (árboles, animales)
   - Permite override por agrupación cuando es necesario

## Arquitectura Propuesta

### Estructura de Base de Datos

#### 1. Extender `tipos_particulas.estilos.visual`

```sql
-- Ya existe, solo documentar estructura completa
COMMENT ON COLUMN juego_dioses.tipos_particulas.estilos IS 
'Estilos visuales en JSONB. Estructura:
{
  "color_hex": "#8B4513",
  "material": {...},
  "visual": {
    "modelo": "cube|sphere|cylinder|cone|torus|custom",
    "escala": 1.0,
    "geometria": {
      "tipo": "box|sphere|cylinder|cone|torus",
      "parametros": {
        // Parámetros según tipo
        // box: {width, height, depth}
        // sphere: {radius, segments}
        // cylinder: {radiusTop, radiusBottom, height, segments}
        // cone: {radius, height, segments}
        // torus: {radius, tube, segments}
      }
    }
  }
}';
```

**Ejemplo para tipo "madera":**
```json
{
  "visual": {
    "modelo": "cylinder",  // Deprecated, usar geometria.tipo
    "escala": 1.0,
    "geometria": {
      "tipo": "cylinder",
      "parametros": {
        // Parámetros relativos a tamano_celda (0.25m por defecto)
        // radiusTop: 0.4 × 0.25m = 0.1m (10cm) radio superior
        // radiusBottom: 0.5 × 0.25m = 0.125m (12.5cm) radio inferior
        // height: 1.0 × 0.25m = 0.25m (25cm) altura
        // Tamaño absoluto final: cilindro de 0.25m de alto, 0.1-0.125m de radio
        "radiusTop": 0.4,
        "radiusBottom": 0.5,
        "height": 1.0,
        "segments": 8  // NO se escala (número de divisiones)
      }
    }
  }
}
```

#### 2. Agregar campo a `agrupaciones`

```sql
ALTER TABLE juego_dioses.agrupaciones
ADD COLUMN IF NOT EXISTS geometria_agrupacion JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN juego_dioses.agrupaciones.geometria_agrupacion IS 
'Definición de geometría para la agrupación completa. Estructura:
{
  "tipo": "arbol|animal|construccion|...",
  "partes": {
    "parte_nombre": {
      "geometria": {
        "tipo": "box|sphere|cylinder|...",
        "parametros": {...}
      },
      "offset": {"x": 0, "y": 0, "z": 0},
      "rotacion": {"x": 0, "y": 0, "z": 0}
    }
  }
}';

CREATE INDEX IF NOT EXISTS idx_agrupaciones_geometria 
ON juego_dioses.agrupaciones USING GIN (geometria_agrupacion);
```

**Ejemplo para agrupación "árbol":**
```json
{
  "tipo": "arbol",
  "partes": {
    "tronco": {
      "geometria": {
        "tipo": "cylinder",
        "parametros": {
          "radiusTop": 0.3,
          "radiusBottom": 0.5,
          "height": 10.0,
          "segments": 8
        }
      },
      "offset": {"x": 0, "y": 0, "z": 0},
      "rotacion": {"x": 0, "y": 0, "z": 0}
    },
    "copa": {
      "geometria": {
        "tipo": "sphere",
        "parametros": {
          "radius": 3.0,
          "segments": 16
        }
      },
      "offset": {"x": 0, "y": 10, "z": 0},
      "rotacion": {"x": 0, "y": 0, "z": 0}
    }
  }
}
```

#### 3. Extender `particulas.propiedades`

```sql
-- Ya existe, solo documentar uso para formas
COMMENT ON COLUMN juego_dioses.particulas.propiedades IS 
'Propiedades específicas de la partícula. Para partículas agrupadas:
{
  "parte_entidad": "tronco|copa|raiz|cuerpo|cabeza|...",
  "indice_parte": 0,
  "offset_relativo": {"x": 0, "y": 0, "z": 0}
}';
```

### Backend - Schemas y Lógica

#### 1. Extender `EstilosParticula` schema

```python
class GeometriaParametros(BaseModel):
    """
    Parámetros de geometría según tipo.
    
    IMPORTANTE: Estos parámetros son RELATIVOS a tamano_celda de la dimensión.
    Tamaño absoluto = parametro × tamano_celda × escala
    
    Ejemplo:
    - tamano_celda = 0.25m (default)
    - width = 1.0 → width absoluto = 0.25m
    - width = 2.0 → width absoluto = 0.5m (el doble)
    
    NO son parámetros de animación, son dimensiones físicas de la forma.
    """
    # Box
    width: Optional[float] = Field(None, description="Ancho relativo a tamano_celda (default: 1.0 = tamaño de celda)")
    height: Optional[float] = Field(None, description="Alto relativo a tamano_celda (default: 1.0)")
    depth: Optional[float] = Field(None, description="Profundidad relativa a tamano_celda (default: 1.0)")
    
    # Sphere
    radius: Optional[float] = Field(None, description="Radio relativo a tamano_celda (default: 0.5)")
    segments: Optional[int] = Field(default=16, ge=3, le=64, description="Número de segmentos para suavizado")
    
    # Cylinder
    radiusTop: Optional[float] = Field(None, description="Radio superior relativo a tamano_celda")
    radiusBottom: Optional[float] = Field(None, description="Radio inferior relativo a tamano_celda")
    height: Optional[float] = Field(None, description="Altura relativa a tamano_celda")
    
    # Cone (usa radius, height, segments)
    
    # Torus
    # radius: radio principal relativo a tamano_celda
    # tube: radio del tubo relativo a tamano_celda

class GeometriaVisual(BaseModel):
    """Definición de geometría visual"""
    tipo: Literal["box", "sphere", "cylinder", "cone", "torus", "custom"] = "box"
    parametros: GeometriaParametros = Field(default_factory=GeometriaParametros)

class VisualProperties(BaseModel):
    """Propiedades visuales extendidas"""
    modelo: Optional[str] = None  # Deprecated, usar geometria.tipo
    escala: float = Field(default=1.0, ge=0.1, le=10.0)
    geometria: Optional[GeometriaVisual] = None

class EstilosParticula(BaseModel):
    """Estilos de partícula extendidos"""
    color_hex: Optional[str] = None
    color_rgb: Optional[List[int]] = None
    material: Optional[MaterialProperties] = None
    visual: Optional[VisualProperties] = None
```

#### 2. Schema para Geometría de Agrupación

```python
class GeometriaParte(BaseModel):
    """Geometría de una parte de una agrupación"""
    geometria: GeometriaVisual
    offset: Optional[Dict[str, float]] = Field(default_factory=lambda: {"x": 0, "y": 0, "z": 0})
    rotacion: Optional[Dict[str, float]] = Field(default_factory=lambda: {"x": 0, "y": 0, "z": 0})

class GeometriaAgrupacion(BaseModel):
    """Geometría completa de una agrupación"""
    tipo: str  # "arbol", "animal", "construccion", etc.
    partes: Dict[str, GeometriaParte] = Field(default_factory=dict)
```

#### 3. Lógica de Resolución de Formas

```python
class GeometryResolver:
    """Resuelve la geometría de una partícula"""
    
    async def get_particle_geometry(
        self,
        conn: asyncpg.Connection,
        particle: Particle,
        tipo_particula: TipoParticula
    ) -> Optional[GeometriaVisual]:
        """
        Resuelve geometría con prioridad:
        1. Agrupación (si existe)
        2. Tipo de partícula
        3. Default (box)
        """
        # 1. Verificar si tiene agrupación
        if particle.agrupacion_id:
            agrupacion = await self.get_agrupacion(conn, particle.agrupacion_id)
            if agrupacion and agrupacion.geometria_agrupacion:
                parte_nombre = particle.propiedades.get("parte_entidad")
                if parte_nombre and parte_nombre in agrupacion.geometria_agrupacion.get("partes", {}):
                    return agrupacion.geometria_agrupacion["partes"][parte_nombre]["geometria"]
        
        # 2. Usar geometría del tipo
        if tipo_particula.estilos and tipo_particula.estilos.get("visual"):
            visual = tipo_particula.estilos["visual"]
            if visual.get("geometria"):
                return visual["geometria"]
            # Fallback a modelo (deprecated)
            if visual.get("modelo"):
                return self._convert_modelo_to_geometria(visual["modelo"])
        
        # 3. Default
        return GeometriaVisual(tipo="box", parametros=GeometriaParametros(width=1.0, height=1.0, depth=1.0))
```

### Frontend - Interpretación de Formas

#### 1. Registry de Geometrías

```javascript
// renderers/geometries/registry.js
class GeometryRegistry {
    constructor() {
        this.geometries = new Map();
        this.registerDefaults();
    }
    
    registerDefaults() {
        // Box
        this.register('box', (params) => {
            return new THREE.BoxGeometry(
                params.width || 1.0,
                params.height || 1.0,
                params.depth || 1.0
            );
        });
        
        // Sphere
        this.register('sphere', (params) => {
            return new THREE.SphereGeometry(
                params.radius || 0.5,
                params.segments || 16
            );
        });
        
        // Cylinder
        this.register('cylinder', (params) => {
            return new THREE.CylinderGeometry(
                params.radiusTop || 0.5,
                params.radiusBottom || 0.5,
                params.height || 1.0,
                params.segments || 8
            );
        });
        
        // Cone
        this.register('cone', (params) => {
            return new THREE.ConeGeometry(
                params.radius || 0.5,
                params.height || 1.0,
                params.segments || 8
            );
        });
        
        // Torus
        this.register('torus', (params) => {
            return new THREE.TorusGeometry(
                params.radius || 0.5,
                params.tube || 0.2,
                params.segments || 16
            );
        });
    }
    
    register(tipo, factory) {
        this.geometries.set(tipo, factory);
    }
    
    create(tipo, params, cellSize = 0.25) {
        const factory = this.geometries.get(tipo);
        if (!factory) {
            console.warn(`Geometría desconocida: ${tipo}, usando box`);
            return new THREE.BoxGeometry(cellSize, cellSize, cellSize);
        }
        
        // Escalar parámetros por cellSize
        const scaledParams = this.scaleParams(params, cellSize);
        return factory(scaledParams);
    }
    
    scaleParams(params, cellSize) {
        /**
         * Escalar parámetros relativos a tamaño absoluto
         * 
         * Los parámetros en BD son relativos a tamano_celda.
         * Aquí los convertimos a tamaño absoluto multiplicando por cellSize.
         * 
         * Ejemplo:
         * - Parámetro en BD: width: 1.0
         * - cellSize: 0.25m
         * - Resultado: width: 0.25m (tamaño absoluto)
         */
        const scaled = {...params};
        // Escalar dimensiones lineales (width, height, depth, radius, etc.)
        ['width', 'height', 'depth', 'radius', 'radiusTop', 'radiusBottom', 'tube', 'height'].forEach(key => {
            if (scaled[key] !== undefined) {
                scaled[key] *= cellSize;
            }
        });
        // NO escalar segments (es un número de divisiones, no una dimensión)
        return scaled;
    }
}
```

#### 2. Renderizador con Soporte de Formas

```javascript
// renderers/particle-renderer.js
class ParticleRenderer extends BaseRenderer {
    constructor(geometryRegistry) {
        super();
        this.geometryRegistry = geometryRegistry;
        this.geometryCache = new Map(); // Cache de geometrías por tipo
    }
    
    getGeometry(particle, tipoEstilos, agrupacionGeometria) {
        // 1. Verificar agrupación
        if (particle.agrupacion_id && agrupacionGeometria) {
            const parte = particle.propiedades?.parte_entidad;
            if (parte && agrupacionGeometria.partes[parte]) {
                const geometriaDef = agrupacionGeometria.partes[parte].geometria;
                return this.geometryRegistry.create(
                    geometriaDef.tipo,
                    geometriaDef.parametros,
                    particle.cellSize
                );
            }
        }
        
        // 2. Verificar tipo
        if (tipoEstilos?.visual?.geometria) {
            const geometriaDef = tipoEstilos.visual.geometria;
            const cacheKey = `${geometriaDef.tipo}_${JSON.stringify(geometriaDef.parametros)}`;
            
            if (!this.geometryCache.has(cacheKey)) {
                this.geometryCache.set(
                    cacheKey,
                    this.geometryRegistry.create(
                        geometriaDef.tipo,
                        geometriaDef.parametros,
                        particle.cellSize
                    )
                );
            }
            return this.geometryCache.get(cacheKey);
        }
        
        // 3. Default (box)
        return new THREE.BoxGeometry(
            particle.cellSize,
            particle.cellSize,
            particle.cellSize
        );
    }
}
```

## Conceptos Importantes: Parámetros vs Tamaño Físico

### Relación entre Parámetros y Tamaño Físico

**IMPORTANTE:** Los parámetros en la BD son **relativos a `tamano_celda`** de la dimensión, NO son tamaños absolutos ni parámetros de animación.

**Fórmula:**
```
Tamaño absoluto = parámetro × tamano_celda × escala
```

**Ejemplo práctico:**
- `tamano_celda` = 0.25m (default)
- Parámetro `width: 1.0` → Tamaño absoluto = 1.0 × 0.25m = **0.25m**
- Parámetro `width: 2.0` → Tamaño absoluto = 2.0 × 0.25m = **0.5m** (el doble)

**Para un cilindro:**
- `radiusTop: 0.4` → Radio absoluto = 0.4 × 0.25m = **0.1m (10cm)**
- `height: 10.0` → Altura absoluta = 10.0 × 0.25m = **2.5m**

**Ventajas de usar parámetros relativos:**
- ✅ **Escalabilidad**: Si cambias `tamano_celda`, todas las formas se escalan automáticamente
- ✅ **Consistencia**: Todas las partículas usan la misma base de tamaño
- ✅ **Simplicidad**: No necesitas recalcular tamaños cuando cambias la escala del mundo

**Parámetros que NO se escalan:**
- `segments`: Número de divisiones para suavizado (no es una dimensión física)
- Cualquier parámetro que sea un contador o índice

## Consideraciones de Compatibilidad con Múltiples Frontends

### Estrategia de Abstracción

**Principio:** La BD almacena definiciones abstractas (tipo + parámetros relativos), cada frontend las interpreta según su capacidad y las escala usando `tamano_celda`.

### Ejemplos de Interpretación

#### Three.js (WebGL)
```javascript
// Interpreta directamente
box → THREE.BoxGeometry
sphere → THREE.SphereGeometry
cylinder → THREE.CylinderGeometry
```

#### Unity (C#)
```csharp
// Interpreta según Unity
box → GameObject con MeshFilter + BoxCollider
sphere → GameObject con MeshFilter + SphereCollider
cylinder → GameObject con MeshFilter + CapsuleCollider
```

#### WebGL Puro
```javascript
// Implementación custom
box → generar vértices manualmente
sphere → generar vértices con algoritmo
cylinder → generar vértices con algoritmo
```

#### Frontend 2D
```javascript
// Proyección 2D
box → rectángulo
sphere → círculo
cylinder → rectángulo (vista lateral) o elipse (vista superior)
```

### Formato de Datos Neutral

**La BD almacena:**
- Tipo de geometría (string): `"box"`, `"sphere"`, `"cylinder"`, etc.
- Parámetros genéricos (objeto): `{width, height, depth}`, `{radius}`, etc.
- No almacena código específico de Three.js, Unity, etc.

**Cada frontend:**
- Tiene su propio registry de geometrías
- Mapea tipos abstractos a sus implementaciones nativas
- Puede ignorar tipos que no soporta (fallback a box)

## Beneficios de Almacenar en BD

1. **Frontend-agnostic**: 
   - La forma está definida una vez en BD
   - Cada frontend la interpreta según su capacidad
   - No requiere cambios en BD para nuevos frontends

2. **Modificable por IA**:
   - La IA puede cambiar formas dinámicamente
   - No requiere deploy de código
   - Cambios inmediatos en todos los frontends

3. **Consistencia**:
   - Todas las partículas del mismo tipo tienen la misma forma
   - Todas las agrupaciones del mismo tipo tienen la misma estructura
   - Garantiza coherencia visual

4. **Performance**:
   - Cache eficiente (formas por tipo, no por partícula)
   - Menos datos a transferir
   - Renderizado optimizado

5. **Escalabilidad**:
   - Funciona con millones de partículas
   - No aumenta significativamente el tamaño de datos
   - Permite agregar nuevos tipos sin migración

## Desventajas y Mitigaciones

### Desventaja 1: Complejidad de Implementación

**Problema:** Requiere lógica adicional para resolver formas.

**Mitigación:**
- Crear `GeometryResolver` centralizado
- Cachear resultados
- Documentar bien el flujo

### Desventaja 2: Validación de Parámetros

**Problema:** Parámetros inválidos pueden romper renderizado.

**Mitigación:**
- Validación en backend (Pydantic schemas)
- Valores por defecto si inválido
- Fallback a box si geometría desconocida

### Desventaja 3: Migración de Datos Existentes

**Problema:** Partículas existentes no tienen formas definidas.

**Mitigación:**
- Default a box si no hay forma definida
- Script de migración para tipos comunes
- Migración gradual (no rompe funcionalidad existente)

## Plan de Implementación

### Fase 1: Extender Schemas y Documentación
1. Extender `EstilosParticula` con `GeometriaVisual`
2. Agregar campo `geometria_agrupacion` a `agrupaciones`
3. Documentar estructuras JSONB
4. Crear schemas Pydantic para validación

### Fase 2: Implementar Resolución de Formas
1. Crear `GeometryResolver` en backend
2. Modificar endpoints para incluir geometría en respuestas
3. Agregar cache de geometrías

### Fase 3: Frontend - Registry de Geometrías
1. Crear `GeometryRegistry` en frontend
2. Implementar mapeo de tipos abstractos a Three.js
3. Modificar renderizadores para usar geometrías de BD

### Fase 4: Migración de Datos
1. Script para agregar formas a tipos comunes
2. Script para agregar formas a agrupaciones existentes
3. Verificar que todo funciona con datos existentes

### Fase 5: Testing y Optimización
1. Testear con múltiples tipos de formas
2. Optimizar cache y performance
3. Documentar uso para otros frontends

## Conclusión

**Recomendación: SÍ, almacenar formas en BD es óptimo**

**Razones:**
1. ✅ Compatible con múltiples frontends (formato abstracto)
2. ✅ Performance (cache eficiente, no duplica datos)
3. ✅ Escalabilidad (funciona con millones de partículas)
4. ✅ Flexibilidad (soporta partículas sueltas y agrupaciones)
5. ✅ Modificable por IA (cambios dinámicos sin deploy)

**Estructura recomendada:**
- **Forma base** en `tipos_particulas.estilos.visual.geometria` (para partículas sueltas)
- **Forma especializada** en `agrupaciones.geometria_agrupacion` (para entidades complejas)
- **Prioridad**: Agrupación > Tipo > Default (box)

**Próximos pasos:**
1. Extender schemas y documentación
2. Implementar resolución de formas
3. Crear registry de geometrías en frontend
4. Migrar datos existentes
5. Testear y optimizar

