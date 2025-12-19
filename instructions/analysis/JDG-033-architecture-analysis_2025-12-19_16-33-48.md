# Análisis de Arquitectura - Migración de Modelos y Animaciones a Estructura Biped ([JDG-033])

## Situación Actual

### Backend

**Estructura actual de archivos:**
```
backend/static/models/
├── characters/
│   └── Character_output.glb
├── animations/
│   └── biped/
│       ├── axe/
│       ├── cuffs/
│       ├── hammer/
│       ├── hit-reactions/
│       ├── idle/
│       ├── interactions/
│       ├── movement/
│       ├── secondary-interactions/
│       ├── shield/
│       ├── skills/
│       ├── spear/
│       ├── sword/
│       ├── two-hand-axe/
│       ├── two-hand-hammer/
│       ├── two-hand-sword/
│       └── two-swords/
└── weapons/
```

**Problemas identificados:**
1. **Inconsistencia de estructura**: Los modelos de personajes están en `characters/` mientras que las animaciones ya están organizadas en `animations/biped/`
2. **Falta de organización por género/variante**: No hay separación entre modelos masculinos/femeninos u otras variantes
3. **Modelos y animaciones desacoplados**: Los modelos están en una ubicación y las animaciones en otra, dificultando mantener consistencia
4. **Rutas almacenadas en BD**: Las rutas de modelos están almacenadas en la base de datos como `characters/Character_output.glb`, lo que requiere actualización masiva de datos
5. **Reorganización de categorías de animaciones**: La nueva estructura `biped/male/animations/` organiza las animaciones de manera diferente:
   - Categorías antiguas (`sword/`, `axe/`, `hammer/`, `shield/`, etc.) se consolidan en `shield-and-one-hand-weapon/`
   - Categorías de dos manos (`two-hand-sword/`, `two-hand-hammer/`, etc.) se consolidan en `two-hands-weapon/`
   - `idle/` se mueve a `movement/`
   - `spear/` se mueve a `movement/`
   - Nueva categoría `transitions/` para animaciones de transición
   - Algunas categorías desaparecen (`skills/`, `two-swords/`, `two-hand-axe/`, `secondary-interactions/`)
6. **Cambio de nombres de archivos**: Los archivos ahora tienen prefijo `Meshy_AI_Animation_...` en lugar de `Animation_...`
7. **Frontend necesita actualización**: `animation-config.js` usa rutas antiguas `animations/biped/...` y necesita actualizarse a `biped/male/animations/...` con nueva organización

### Frontend

**Estructura actual:**
```
frontend/src/
├── config/
│   ├── animation-config.js          # Usa animations/biped/... (estructura antigua)
│   └── weapon-models-config.js
├── ecs/
│   ├── systems/
│   │   ├── animation-mixer-system.js    # Carga desde /static/models/${animationFile}
│   │   └── weapon-equip-system.js
│   └── factories/
│       └── player-factory.js
└── renderers/
    └── models/
        ├── model-utils.js           # Carga desde /static/models/${modelo3d.ruta}
        └── model-loader.js
```

**Problemas identificados:**
1. **Rutas de animaciones desactualizadas**: `animation-config.js` usa estructura antigua `animations/biped/{categoria}/Animation_...` pero necesita `biped/male/animations/{nueva_categoria}/Meshy_AI_Animation_...`
2. **Mapeo de categorías requerido**: Muchas animaciones cambian de categoría y necesitan mapeo:
   - `sword/` → `shield-and-one-hand-weapon/`
   - `axe/` → `shield-and-one-hand-weapon/`
   - `shield/` → `shield-and-one-hand-weapon/`
   - `two-hand-sword/`, `two-hand-hammer/` → `two-hands-weapon/`
   - `idle/` → `movement/`
   - `spear/` → `movement/`
   - `interactions/Animation_Stand_Up2_withSkin.glb` → `transitions/Meshy_AI_Animation_Stand_Up2_withSkin.glb`
3. **Nombres de archivos diferentes**: Prefijo `Animation_...` → `Meshy_AI_Animation_...`
4. **Animaciones sin equivalente**: Algunas animaciones de la estructura antigua no existen en la nueva (`skills/`, `two-swords/`, `two-hand-axe/`, algunas de `secondary-interactions/`)
5. **Modelos aún en ubicación antigua**: Las rutas de modelos vienen de la BD y apuntan a `characters/...`

### Base de Datos

**Estructura actual:**
- Tabla `agrupaciones` tiene campo `modelo_3d` (JSONB) con estructura:
```json
{
  "tipo": "glb",
  "ruta": "characters/Character_output.glb",
  "escala": 1.0,
  "offset": {"x": 0, "y": 0, "z": 0},
  "rotacion": {"x": 0, "y": 0, "z": 0}
}
```

**Problemas identificados:**
1. **Rutas hardcodeadas en BD**: Las rutas están almacenadas literalmente, lo que hace difícil migrar sin actualizar registros
2. **Sin información de género/variante**: No hay forma de saber qué variante usar (male/female)
3. **Falta normalización**: No hay separación entre tipo de entidad (biped, quadrupeds, etc.)

## Necesidades Futuras

### Categorías de Entidades/Funcionalidades

1. **Bipeds** (estado actual):
   - Personajes masculinos
   - Personajes femeninos
   - Diferentes razas/variantes
   - Requisitos: Modelos y animaciones organizados por género/variante

2. **Quadrupeds** (futuro):
   - Mascotas
   - Criaturas montables
   - Animales salvajes
   - Requisitos: Estructura similar a bipeds pero separada

3. **Weapons** (actual):
   - Armas de una mano
   - Armas de dos manos
   - Requisitos: Mantener estructura actual o migrar a estructura por tipo

### Requisitos de Escalabilidad

1. **Fácil agregar nuevos tipos**: Estructura clara que permita agregar nuevos tipos de entidades (quadrupeds, flying, etc.)
2. **Reutilización de código**: Sistema de carga que funcione para cualquier tipo de entidad
3. **Separación de responsabilidades**: Modelos y animaciones agrupados por tipo de entidad, no mezclados
4. **Extensibilidad**: Fácil agregar variantes (género, raza, etc.) sin romper código existente
5. **Mantenibilidad**: Rutas consistentes y predecibles que reflejen la organización lógica

## Arquitectura Propuesta

### Backend - Nueva Estructura de Archivos

```
backend/static/models/
├── biped/
│   ├── male/
│   │   ├── characters/
│   │   │   └── Meshy_AI_Character_output.glb
│   │   └── animations/
│   │       ├── cuffs/                    # Sin cambios (puños/golpes)
│   │       ├── hit-reactions/            # Sin cambios (reacciones de daño)
│   │       ├── interactions/             # Sin cambios (interacciones básicas)
│   │       ├── movement/                 # Expandido (incluye idle, spear, etc.)
│   │       ├── shield-and-one-hand-weapon/  # NUEVA: agrupa sword, axe, shield, hammer
│   │       ├── transitions/              # NUEVA: animaciones de transición
│   │       └── two-hands-weapon/         # NUEVA: agrupa two-hand-sword, two-hand-hammer
│   ├── female/                    # Futuro
│   │   ├── characters/
│   │   └── animations/
│   └── base/                      # Futuro: modelos base para sistema de skins
│       ├── characters/
│       └── animations/
├── quadrupeds/                    # Futuro
│   └── [mascotas y criaturas]
└── weapons/                       # Mantener o migrar
    └── [armas]
```

### Mapeo de Categorías de Animaciones

**Estructura antigua → Estructura nueva:**

| Antigua (`animations/biped/`) | Nueva (`biped/male/animations/`) | Archivos Afectados |
|-------------------------------|----------------------------------|-------------------|
| `sword/` | `shield-and-one-hand-weapon/` | `Animation_Left_Slash`, `Animation_Charged_Slash`, `Animation_Sword_Judgment`, `Animation_Sword_Parry_Backward` |
| `axe/` | `shield-and-one-hand-weapon/` | `Animation_Axe_Spin_Attack` |
| `hammer/` | ❓ (No encontrado en nueva estructura) | `Animation_Charged_Upward_Slash` |
| `shield/` | `shield-and-one-hand-weapon/` | `Animation_Shield_Push_Left` |
| `two-hand-sword/` | `two-hands-weapon/` | `Animation_Attack` |
| `two-hand-hammer/` | `two-hands-weapon/` | `Animation_Heavy_Hammer_Swing` |
| `two-hand-axe/` | ❓ (No encontrado en nueva estructura) | `Animation_Charged_Axe_Chop` |
| `two-swords/` | ❓ (No encontrado en nueva estructura) | `Animation_Double_Blade_Spin` |
| `cuffs/` | `cuffs/` | `Animation_Simple_Kick` |
| `spear/` | `movement/` | `Animation_Spear_Walk` |
| `idle/` | `movement/` | `Animation_Combat_Stance`, `Animation_Idle_11`, `Animation_Swim_Idle` |
| `movement/` | `movement/` | `Animation_Walking`, `Animation_Running`, etc. |
| `hit-reactions/` | `hit-reactions/` | Mismo nombre pero archivos renombrados |
| `interactions/` | `interactions/` + `transitions/` | `Animation_Stand_Up2` → `transitions/`, otros en `interactions/` |
| `secondary-interactions/` | ❓ (Mayoría no encontrada, algunas en `movement/`) | Varias animaciones |
| `skills/` | ❓ (No encontrado en nueva estructura) | `Animation_Charged_Spell_Cast`, `Animation_Skill_01`, etc. |

**Nota:** ❓ = Categoría o archivos no encontrados en la nueva estructura. Requiere verificación manual.

### Sistema de Rutas Propuesto

**Para modelos:**
- Base: `/static/models/biped/male/characters/{model_name}.glb`
- Ejemplo: `/static/models/biped/male/characters/Meshy_AI_Character_output.glb`

**Para animaciones:**
- Base: `/static/models/biped/male/animations/{category}/{animation_name}.glb`
- Ejemplo: `/static/models/biped/male/animations/movement/Meshy_AI_Animation_Walking_withSkin.glb`

**Nueva estructura de datos en BD:**
```json
{
  "tipo": "glb",
  "ruta": "biped/male/characters/Meshy_AI_Character_output.glb",
  "escala": 1.0,
  "offset": {"x": 0, "y": 0, "z": 0},
  "rotacion": {"x": 0, "y": 0, "z": 0},
  "entidad_tipo": "biped",
  "variante": "male"
}
```

### Frontend - Sistema de Carga Unificado

**Nueva estructura:**
```javascript
// config/entity-model-config.js (nuevo)
export const ENTITY_MODEL_PATHS = {
  biped: {
    male: {
      base: 'biped/male/characters/Meshy_AI_Character_output.glb',
      animations: {
        walk: 'biped/male/animations/movement/Meshy_AI_Animation_Walking_withSkin.glb',
        run: 'biped/male/animations/movement/Meshy_AI_Animation_Running_withSkin.glb',
        // ... etc
      }
    },
    female: {
      // Futuro
    }
  }
};
```

**Ventajas:**
- Una sola fuente de verdad para rutas
- Fácil agregar nuevos tipos de entidades
- Validación de rutas en un solo lugar
- Fácil migrar cuando cambien las estructuras

### Jerarquía de Clases (Backend)

```
EntityModelResolver (abstracto)
├── BipedModelResolver
│   ├── MaleBipedModelResolver
│   └── FemaleBipedModelResolver
└── QuadrupedModelResolver (futuro)
    └── PetModelResolver
```

## Patrones de Diseño a Usar

### 1. Strategy Pattern
- Descripción: Diferentes estrategias para resolver rutas según el tipo de entidad
- Cómo se aplica: `EntityModelResolver` usa diferentes estrategias (Biped, Quadruped) para construir rutas
- Beneficios: Fácil agregar nuevos tipos sin modificar código existente

### 2. Factory Pattern
- Descripción: Crear resolvers apropiados según el tipo de entidad
- Cómo se aplica: `ModelResolverFactory` crea el resolver correcto basado en `entidad_tipo` y `variante`
- Beneficios: Encapsula lógica de creación, fácil de testear

### 3. Template Method Pattern
- Descripción: Algoritmo común para construir rutas, con pasos específicos por tipo
- Cómo se aplica: `EntityModelResolver` define método template, subclases implementan pasos específicos
- Beneficios: Reutilización de código, consistencia

### 4. Configuration Object Pattern
- Descripción: Configuración centralizada de rutas en el frontend
- Cómo se aplica: `ENTITY_MODEL_PATHS` define todas las rutas en un solo lugar
- Beneficios: Mantenibilidad, fácil de actualizar

## Beneficios de la Nueva Arquitectura

1. **Organización lógica**: Modelos y animaciones agrupados por tipo de entidad y variante
2. **Escalabilidad**: Fácil agregar nuevos tipos (quadrupeds, flying, etc.)
3. **Consistencia**: Rutas predecibles que reflejan la estructura del archivo
4. **Mantenibilidad**: Cambios estructurales solo requieren actualizar configuración
5. **Flexibilidad**: Sistema de resolvers permite diferentes estrategias por tipo de entidad
6. **Preparado para sistema de skins**: Estructura base preparada para futuros modelos base + skins

## Migración Propuesta

### Fase 1: Preparación de Estructura
- Crear nueva estructura de carpetas `biped/male/characters/` y `biped/male/animations/`
- Mover archivos existentes a nueva estructura
- Verificar que todos los archivos estén accesibles en nuevas ubicaciones

### Fase 2: Actualización de Backend
- Crear `EntityModelResolver` y `BipedModelResolver`
- Actualizar endpoint `/api/v1/dimensions/{id}/characters/{id}/model` para usar nuevos resolvers
- Crear script de migración de datos para actualizar rutas en BD
- Mantener compatibilidad hacia atrás durante migración

### Fase 3: Actualización de Frontend
- Crear `entity-model-config.js` con nuevas rutas
- Actualizar `animation-config.js` para usar configuración centralizada
- Actualizar `model-utils.js` para usar nueva estructura
- Actualizar `animation-mixer-system.js` si es necesario

### Fase 4: Migración de Datos
- Ejecutar script de migración para actualizar rutas en BD
- Verificar que todos los personajes existentes funcionen correctamente
- Actualizar templates de bipeds para usar nuevas rutas

### Fase 5: Limpieza
- Eliminar estructura antigua (`characters/`, `animations/biped/` desde raíz si aplica)
- Actualizar documentación
- Actualizar tests

## Consideraciones Técnicas

### Backend

1. **Compatibilidad**: Mantener compatibilidad temporal con rutas antiguas durante migración
2. **Base de datos**: Migración de datos puede requerir downtime o migración en caliente
3. **APIs**: Endpoints deben seguir funcionando, solo cambiar rutas internas
4. **Testing**: Crear tests para verificar que resolvers funcionan correctamente

### Frontend

1. **Cache**: Invalidar cache del navegador para forzar descarga de nuevos modelos
2. **Optimización**: Sistema de carga debe seguir siendo eficiente con nueva estructura
3. **Extensibilidad**: Preparar estructura para futuros tipos de entidades

## Ejemplo de Uso Futuro

```javascript
// Backend - Obtener modelo con resolver
const resolver = ModelResolverFactory.create('biped', 'male');
const modelPath = resolver.getModelPath('Meshy_AI_Character_output.glb');
// Retorna: 'biped/male/characters/Meshy_AI_Character_output.glb'

// Frontend - Cargar modelo
const modelConfig = ENTITY_MODEL_PATHS.biped.male;
const modelUrl = `${backendBase}/static/models/${modelConfig.base}`;
const model = await loader.loadModel(modelUrl, 'glb');

// Frontend - Cargar animación
const animationPath = ENTITY_MODEL_PATHS.biped.male.animations.walk;
const animationUrl = `${backendBase}/static/models/${animationPath}`;
const animations = await loadAnimation(animationUrl);
```

## Conclusión

La migración a la estructura `biped/` es necesaria para:
- Organizar mejor los recursos según tipo de entidad
- Preparar el sistema para futuras expansiones (quadrupeds, flying, etc.)
- Mantener consistencia entre modelos y animaciones
- Facilitar el mantenimiento y escalabilidad

La implementación debe ser gradual, manteniendo compatibilidad hacia atrás durante la transición, y utilizando patrones de diseño que faciliten futuras extensiones.
