# Análisis de Arquitectura - Sistema de Personajes desde Base de Datos usando Templates/Builders/Creators (JDG-011)

## Situación Actual

### Backend

**Estructura actual:**
```
backend/src/database/
├── templates/
│   ├── base.py              # BaseTemplate (clase abstracta)
│   └── trees/               # Templates de árboles (implementado)
│       ├── base.py          # TreeTemplate
│       ├── roble.py         # RobleTemplate
│       ├── palmera.py       # PalmeraTemplate
│       ├── paraiso.py       # ParaisoTemplate
│       └── registry.py      # Registry de árboles
├── builders/
│   ├── base.py              # BaseBuilder (clase abstracta)
│   └── tree_builder.py      # TreeBuilder (implementado)
└── creators/
    └── entity_creator.py     # EntityCreator (soporta solo 'tree')
```

**Problemas identificados:**

1. **Sistema de templates limitado a árboles:** El sistema de templates/builders/creators solo soporta la categoría 'tree'. No existe infraestructura para bípedos/personajes.

2. **EntityCreator no extensible para bípedos:** El método `_get_builder()` en `EntityCreator` solo retorna `TreeBuilder` para categoría 'tree'. No hay soporte para 'biped' o 'race'.

3. **Falta de templates de bípedos:** No existe la carpeta `templates/bipedos/` ni ninguna implementación de templates para personajes.

4. **Falta de builder para bípedos:** No existe `BipedBuilder` que convierta templates de bípedos en partículas.

5. **Falta de endpoint de API para personajes:** No existe endpoint para obtener información de personajes desde la BD, incluyendo `geometria_agrupacion`.

6. **Falta de schemas para personajes:** No hay modelos Pydantic para representar personajes/bípedos en las respuestas de API.

### Frontend

**Estructura actual:**
```
frontend/src/
├── ecs/
│   ├── factories/
│   │   └── player-factory.js    # Crea personaje con primitivos hardcodeados
│   ├── components/              # Componentes ECS
│   └── systems/                 # Sistemas ECS
├── renderers/
│   ├── particle-renderer.js     # Renderiza partículas con geometría de BD
│   └── geometries/
│       └── registry.js          # Registry de geometrías
└── api/
    └── endpoints/               # Cliente API
```

**Problemas identificados:**

1. **Personaje hardcodeado:** `PlayerFactory` crea el mesh del personaje usando primitivos Three.js directamente (cilindro + esfera) sin consultar la BD.

2. **No usa geometria_agrupacion:** El personaje no se crea como agrupación en la BD, por lo que no puede usar el sistema de `geometria_agrupacion` para definir formas complejas.

3. **Falta integración con API:** No hay cliente API para cargar información de personajes desde el backend.

4. **No aprovecha sistema de renderizado existente:** El `ParticleRenderer` ya soporta renderizar partículas con `geometria_agrupacion`, pero el personaje no se crea como partículas.

5. **Personaje no existe en BD:** El personaje no se almacena como partículas en la BD, por lo que no puede interactuar con el sistema de partículas del mundo.

### Base de Datos

**Estructura actual:**
```
- agrupaciones: Tabla con campo geometria_agrupacion (JSONB)
- particulas: Tabla de partículas con campo agrupacion_id
- tipos_particulas: Tipos de partículas con estilos.visual.geometria
```

**Problemas identificados:**

1. **No hay personajes como agrupaciones:** Aunque la estructura de `geometria_agrupacion` soporta cualquier tipo (incluyendo 'biped'), no hay personajes creados como agrupaciones.

2. **Falta de tipos de partículas para personajes:** No hay tipos de partículas específicos para partes del cuerpo (carne, hueso, etc.) aunque esto puede ser opcional.

3. **Sistema de geometría subutilizado:** El campo `geometria_agrupacion` existe y funciona, pero no se usa para personajes.

## Necesidades Futuras

### Categorías de Entidades/Funcionalidades

1. **Bípedos/Personajes** (nuevo):
   - Humano (raza base)
   - Elfo (futuro)
   - Enano (futuro)
   - Otras razas (futuro)
   - Requisitos:
     - Estructura modular (cabeza, torso, brazos, piernas)
     - Definición de geometría desde BD
     - Soporte para variaciones (altura, proporciones)
     - Integración con sistema ECS del frontend

2. **Árboles** (existente):
   - Roble, Palmera, Paraíso
   - Sistema completo y funcional

3. **Plantas** (futuro):
   - Requiere mismo sistema de templates/builders/creators

4. **Cuadrúpedos** (futuro):
   - Animales de cuatro patas
   - Requiere mismo sistema de templates/builders/creators

### Requisitos de Escalabilidad

1. **Fácil agregar nuevos tipos:** El sistema debe permitir agregar nuevos templates de bípedos sin modificar código existente, solo agregando archivos nuevos.

2. **Reutilización de código:** Los builders y creators deben compartir lógica común a través de clases base abstractas.

3. **Separación de responsabilidades:** 
   - Templates definen estructura
   - Builders convierten a partículas
   - Creators simplifican creación
   - API expone información
   - Frontend renderiza

4. **Extensibilidad:** El sistema debe permitir:
   - Agregar nuevas partes al personaje (manos, pies, accesorios)
   - Variaciones de tamaño y proporciones
   - Diferentes materiales/colores por parte
   - Información de animación (futuro)

5. **Mantenibilidad:** 
   - Código organizado por categorías
   - Documentación clara
   - Tests para cada componente

## Arquitectura Propuesta

### Backend - Estructura Modular

```
backend/src/database/
├── templates/
│   ├── base.py                    # BaseTemplate (existente)
│   ├── trees/                     # Templates de árboles (existente)
│   └── bipedos/                   # Templates de bípedos (nuevo)
│       ├── base.py                # BipedTemplate
│       ├── humano.py              # HumanoTemplate
│       ├── elfo.py                # ElfoTemplate (futuro)
│       ├── enano.py               # EnanoTemplate (futuro)
│       └── registry.py            # Registry de bípedos
├── builders/
│   ├── base.py                    # BaseBuilder (existente)
│   ├── tree_builder.py            # TreeBuilder (existente)
│   └── biped_builder.py           # BipedBuilder (nuevo)
└── creators/
    └── entity_creator.py          # EntityCreator (actualizar para soportar 'biped')
```

**Nuevos archivos:**
- `templates/bipedos/base.py`: Clase base `BipedTemplate` que extiende `BaseTemplate`
- `templates/bipedos/humano.py`: Template específico para humanos
- `templates/bipedos/registry.py`: Registry pattern para descubrir templates de bípedos
- `builders/biped_builder.py`: Builder que convierte `BipedTemplate` en partículas
- Actualizar `creators/entity_creator.py`: Agregar soporte para categoría 'biped'

**Endpoints de API:**
```
backend/src/api/routes/
└── characters.py                  # Nuevo endpoint para personajes
    - GET /api/dimensions/{dimension_id}/characters/{character_id}
    - GET /api/dimensions/{dimension_id}/characters
    - POST /api/dimensions/{dimension_id}/characters (crear personaje)
```

**Schemas:**
```
backend/src/models/schemas.py     # Agregar schemas:
    - CharacterResponse
    - CharacterCreate
    - BipedGeometryPart
    - BipedGeometry
```

### Jerarquía de Clases

```
BaseTemplate (abstract)
├── TreeTemplate
│   ├── RobleTemplate
│   ├── PalmeraTemplate
│   └── ParaisoTemplate
└── BipedTemplate (nuevo)
    ├── HumanoTemplate (nuevo)
    ├── ElfoTemplate (futuro)
    └── EnanoTemplate (futuro)

BaseBuilder (abstract)
├── TreeBuilder
└── BipedBuilder (nuevo)

EntityCreator
└── _get_builder() -> soporta 'tree' y 'biped'
```

### Frontend - Estructura Modular

```
frontend/src/
├── ecs/
│   └── factories/
│       └── player-factory.js     # Modificar para cargar desde API
├── api/
│   └── endpoints/
│       └── characters.js          # Nuevo cliente API para personajes
└── renderers/
    └── particle-renderer.js      # Ya soporta geometria_agrupacion
```

**Modificaciones:**
- `player-factory.js`: Cambiar de crear mesh hardcodeado a cargar desde API y construir mesh desde `geometria_agrupacion`
- `api/endpoints/characters.js`: Nuevo cliente para endpoints de personajes
- Aprovechar `ParticleRenderer` existente que ya soporta `geometria_agrupacion`

## Patrones de Diseño a Usar

### 1. Template Method Pattern
- **Descripción:** Define el esqueleto de un algoritmo en una clase base, permitiendo que las subclases sobrescriban pasos específicos.
- **Cómo se aplica:** `BaseTemplate` define métodos abstractos (`get_posiciones()`, `get_propiedades_particula()`) que cada template específico implementa.
- **Beneficios:** 
  - Código reutilizable
  - Estructura consistente entre templates
  - Fácil agregar nuevos tipos

### 2. Builder Pattern
- **Descripción:** Construye objetos complejos paso a paso, separando la construcción de la representación.
- **Cómo se aplica:** `BipedBuilder` construye partículas paso a paso (cabeza, torso, brazos, piernas) desde un `BipedTemplate`.
- **Beneficios:**
  - Construcción compleja manejable
  - Separación de lógica de construcción
  - Reutilizable para diferentes templates

### 3. Registry Pattern
- **Descripción:** Mantiene un registro de objetos disponibles, permitiendo descubrimiento dinámico.
- **Cómo se aplica:** `registry.py` en cada categoría mantiene un diccionario de templates disponibles.
- **Beneficios:**
  - Descubrimiento dinámico de templates
  - Fácil agregar nuevos sin modificar código existente
  - Centralización de templates disponibles

### 4. Factory Pattern
- **Descripción:** Crea objetos sin especificar la clase exacta del objeto que se creará.
- **Cómo se aplica:** `EntityCreator` actúa como factory que selecciona el builder apropiado según la categoría del template.
- **Beneficios:**
  - Desacoplamiento de creación
  - Extensible para nuevas categorías
  - Simplifica uso del sistema

### 5. Strategy Pattern
- **Descripción:** Define una familia de algoritmos, los encapsula y los hace intercambiables.
- **Cómo se aplica:** Diferentes builders (TreeBuilder, BipedBuilder) implementan la misma interfaz pero con diferentes estrategias de construcción.
- **Beneficios:**
  - Intercambiabilidad de algoritmos
  - Extensibilidad
  - Separación de responsabilidades

## Beneficios de la Nueva Arquitectura

1. **Consistencia con sistema existente:** Los bípedos usan el mismo patrón que los árboles, facilitando mantenimiento y comprensión.

2. **Centralización de definiciones:** Las formas de personajes se definen en la BD, permitiendo cambios sin modificar código.

3. **Extensibilidad:** Fácil agregar nuevas razas o variaciones sin tocar código existente.

4. **Reutilización de código:** El sistema de renderizado existente (`ParticleRenderer`) ya soporta `geometria_agrupacion`, solo necesita datos.

5. **Integración con mundo:** Los personajes existen como partículas en la BD, permitiendo interacción con el sistema de partículas del mundo.

6. **Escalabilidad:** El sistema puede crecer para soportar plantas, cuadrúpedos, y otras categorías usando el mismo patrón.

7. **Mantenibilidad:** Código organizado por categorías, con responsabilidades claras y documentación.

## Migración Propuesta

### Fase 1: Crear Infraestructura de Templates y Builders

**Objetivo:** Establecer la base del sistema de bípedos en el backend.

**Pasos:**
1. Crear carpeta `backend/src/database/templates/bipedos/`
2. Crear `bipedos/base.py` con clase `BipedTemplate` que extiende `BaseTemplate`
3. Implementar métodos abstractos:
   - `get_posiciones()`: Retorna posiciones de todas las partes del cuerpo
   - `get_propiedades_particula()`: Retorna propiedades por parte (cabeza, torso, etc.)
4. Crear `bipedos/humano.py` con `HumanoTemplate` básico (cabeza, torso, 2 brazos, 2 piernas)
5. Crear `bipedos/registry.py` con registry pattern similar a árboles
6. Crear `builders/biped_builder.py` con clase `BipedBuilder` que extiende `BaseBuilder`
7. Implementar `create_at_position()` para crear partículas del personaje
8. Implementar `get_particle_type_ids()` para retornar tipos de partículas necesarios
9. Implementar `create_agrupacion()` para crear agrupación con `geometria_agrupacion`
10. Actualizar `EntityCreator._get_builder()` para soportar categoría 'biped'

**Criterios de éxito:**
- Se puede instanciar `HumanoTemplate`
- Se puede crear `BipedBuilder` con `HumanoTemplate`
- `EntityCreator` puede crear bípedos usando `create_entity()`
- Se crean agrupaciones con `geometria_agrupacion` correctamente

### Fase 2: Crear Endpoints de API

**Objetivo:** Exponer información de personajes a través de API REST.

**Pasos:**
1. Crear `api/routes/characters.py` con endpoints:
   - `GET /api/dimensions/{dimension_id}/characters/{character_id}`: Obtener información de personaje
   - `GET /api/dimensions/{dimension_id}/characters`: Listar personajes en dimensión
   - `POST /api/dimensions/{dimension_id}/characters`: Crear personaje desde template
2. Crear schemas en `models/schemas.py`:
   - `CharacterResponse`: Respuesta con información completa del personaje
   - `CharacterCreate`: Request para crear personaje
   - `BipedGeometryPart`: Schema para parte de geometría
   - `BipedGeometry`: Schema completo de geometría
3. Implementar lógica de endpoints:
   - Consultar agrupación desde BD
   - Obtener `geometria_agrupacion`
   - Obtener partículas del personaje
   - Retornar información estructurada
4. Registrar rutas en `api/__init__.py` o `api/routes/__init__.py`

**Criterios de éxito:**
- Endpoints responden correctamente
- Schemas validan datos correctamente
- Respuestas incluyen `geometria_agrupacion` completa
- Se pueden crear personajes desde API

### Fase 3: Integración Frontend - Cliente API

**Objetivo:** Crear cliente API en frontend para cargar información de personajes.

**Pasos:**
1. Crear `frontend/src/api/endpoints/characters.js` con funciones:
   - `getCharacter(dimensionId, characterId)`: Obtener personaje
   - `createCharacter(dimensionId, templateId, x, y, z)`: Crear personaje
   - `listCharacters(dimensionId)`: Listar personajes
2. Integrar con cliente API existente (`api/client.js`)
3. Manejar errores y casos edge (personaje no encontrado, etc.)

**Criterios de éxito:**
- Cliente API funciona correctamente
- Maneja errores apropiadamente
- Retorna datos en formato esperado

### Fase 4: Modificar PlayerFactory para Usar BD

**Objetivo:** Cambiar `PlayerFactory` para cargar forma del personaje desde BD en lugar de hardcodear.

**Pasos:**
1. Modificar `PlayerFactory.createPlayer()` para:
   - Aceptar `characterId` o `templateId` como parámetro
   - Si `characterId` existe, cargar desde API
   - Si `templateId` existe, crear personaje en BD primero, luego cargar
   - Construir mesh Three.js desde `geometria_agrupacion`
2. Crear función helper `buildMeshFromGeometry(geometria_agrupacion, cellSize)`:
   - Iterar sobre `partes` en `geometria_agrupacion`
   - Crear geometría Three.js según `tipo` y `parametros`
   - Aplicar `offset` y `rotacion` a cada parte
   - Agrupar todas las partes en un `THREE.Group`
3. Mantener compatibilidad con personaje hardcodeado como fallback
4. Integrar con sistema ECS existente (componentes no cambian)

**Criterios de éxito:**
- `PlayerFactory` crea personaje desde BD
- Mesh renderizado coincide con `geometria_agrupacion`
- Sistema ECS funciona correctamente
- Fallback a personaje hardcodeado si API falla

### Fase 5: Testing y Refinamiento

**Objetivo:** Verificar que todo funciona correctamente y refinar detalles.

**Pasos:**
1. Crear script de seed para crear personaje de prueba:
   - Usar `EntityCreator` para crear humano en dimensión de prueba
   - Verificar que se crea correctamente en BD
2. Probar flujo completo:
   - Crear personaje desde template
   - Cargar desde API
   - Renderizar en frontend
   - Verificar que coincide con definición
3. Probar casos edge:
   - Personaje sin `geometria_agrupacion` (fallback)
   - API no disponible (fallback)
   - Geometría inválida (validación)
4. Optimizar performance:
   - Cachear información de personajes
   - Optimizar consultas de BD
5. Documentar:
   - Actualizar READMEs
   - Documentar nuevos endpoints
   - Documentar estructura de templates

**Criterios de éxito:**
- Todos los tests pasan
- Performance aceptable
- Documentación completa
- Sistema listo para producción

## Consideraciones Técnicas

### Backend

1. **Compatibilidad:**
   - Mantener compatibilidad con sistema de árboles existente
   - No romper funcionalidad de otros templates
   - `EntityCreator` debe seguir funcionando para árboles

2. **Base de datos:**
   - Usar transacciones para crear personajes (agrupación + partículas)
   - Validar que `geometria_agrupacion` es JSON válido
   - Índices en `agrupaciones` para búsquedas eficientes
   - Considerar particionamiento si hay muchos personajes

3. **APIs:**
   - Validar permisos para crear personajes
   - Rate limiting para prevenir abuso
   - Cachear respuestas de personajes (Redis opcional)
   - Paginación para listar personajes

4. **Testing:**
   - Tests unitarios para templates
   - Tests unitarios para builders
   - Tests de integración para `EntityCreator`
   - Tests de API (endpoints)

### Frontend

1. **Renderizado:**
   - Reutilizar `ParticleRenderer` existente que ya soporta `geometria_agrupacion`
   - Cachear meshes de personajes para evitar recrear
   - Optimizar instancias si hay múltiples personajes

2. **Optimización:**
   - Lazy loading de información de personajes
   - Cachear respuestas de API
   - Preload personajes cercanos al jugador

3. **Extensibilidad:**
   - Sistema debe permitir agregar animaciones futuras
   - Estructura debe soportar accesorios/equipamiento
   - Preparar para sistema de skins/variaciones

## Ejemplo de Uso Futuro

```python
# Backend: Crear personaje desde template
from src.database.templates.bipedos.registry import get_biped_template
from src.database.creators.entity_creator import EntityCreator

# Obtener template
template = get_biped_template('humano')

# Crear creator
creator = EntityCreator(conn, dimension_id)

# Crear personaje
particulas_creadas = await creator.create_entity(
    template, 
    x=45, 
    y=45, 
    z=1
)

# El personaje se crea como agrupación con geometria_agrupacion
```

```javascript
// Frontend: Cargar y renderizar personaje
import { getCharacter } from './api/endpoints/characters.js';
import { PlayerFactory } from './ecs/factories/player-factory.js';

// Cargar información del personaje
const character = await getCharacter(dimensionId, characterId);

// Crear entidad de jugador desde BD
const playerId = PlayerFactory.createPlayer({
    ecs,
    scene,
    characterId: character.id,
    x: character.position.x,
    y: character.position.y,
    z: character.position.z,
    cellSize: 0.25
});

// El mesh se construye desde character.geometria_agrupacion
```

```json
// Estructura de geometria_agrupacion en BD
{
  "tipo": "biped",
  "partes": {
    "cabeza": {
      "geometria": {
        "tipo": "sphere",
        "parametros": {"radius": 0.25, "segments": 8}
      },
      "offset": {"x": 0, "y": 0, "z": 1.25},
      "rotacion": {"x": 0, "y": 0, "z": 0}
    },
    "torso": {
      "geometria": {
        "tipo": "cylinder",
        "parametros": {"radiusTop": 0.3, "radiusBottom": 0.3, "height": 1.0}
      },
      "offset": {"x": 0, "y": 0, "z": 0.5},
      "rotacion": {"x": 0, "y": 0, "z": 0}
    },
    "brazo_izquierdo": {
      "geometria": {
        "tipo": "cylinder",
        "parametros": {"radiusTop": 0.1, "radiusBottom": 0.1, "height": 0.6}
      },
      "offset": {"x": -0.4, "y": 0, "z": 0.8},
      "rotacion": {"x": 0, "y": 0, "z": 90}
    },
    "brazo_derecho": { ... },
    "pierna_izquierda": { ... },
    "pierna_derecha": { ... }
  }
}
```

## Conclusión

Este análisis propone una arquitectura escalable y mantenible para integrar personajes en el sistema de templates/builders/creators existente. La solución:

1. **Reutiliza patrones existentes:** Usa el mismo patrón que los árboles, facilitando comprensión y mantenimiento.

2. **Separa responsabilidades:** Templates definen estructura, builders convierten a partículas, creators simplifican uso, API expone información, frontend renderiza.

3. **Es extensible:** Fácil agregar nuevas razas, partes del cuerpo, o variaciones sin modificar código existente.

4. **Integra con sistemas existentes:** Aprovecha `ParticleRenderer` que ya soporta `geometria_agrupacion`, y el sistema ECS del frontend.

5. **Centraliza definiciones:** Las formas de personajes se definen en la BD, permitiendo cambios sin modificar código.

La migración propuesta es incremental y segura, permitiendo probar cada fase antes de continuar. El sistema resultante será la base para futuras expansiones (plantas, cuadrúpedos, etc.) usando el mismo patrón.

