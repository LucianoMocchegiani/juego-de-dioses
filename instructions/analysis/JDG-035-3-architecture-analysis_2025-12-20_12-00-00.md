# Análisis de Arquitectura - Reorganización Post-Migración de Terreno (JDG-035-3)

## Situación Actual

### Frontend - Estructura Post-Migración JDG-035-2

**Estructura actual después de la migración del sistema de terreno:**

```
src/
├── main.js                    # Punto de entrada
├── app.js                     # Orquestación principal
├── scene.js                   # Wrapper legacy (temporal)
│
├── core/                      # ✅ Infraestructura base Three.js (BIEN)
│   ├── scene.js              # Escena base
│   ├── camera.js             # Gestión de cámara
│   ├── controls.js           # Controles de cámara
│   ├── renderer.js           # Renderizador WebGL
│   ├── lights.js             # Gestión de luces
│   └── helpers.js            # Helpers visuales
│
├── terrain/                   # ✅ Sistema de terreno (ORGANIZADO - JDG-035-2)
│   ├── manager.js            # TerrainManager - Núcleo
│   ├── components/           # Componentes de datos
│   ├── systems/              # Sistemas de procesamiento
│   ├── renderers/            # Renderizadores
│   ├── optimizations/        # Optimizaciones
│   ├── utils/                # Utilidades específicas
│   └── api/                  # Clientes API
│
├── ecs/                       # ✅ Sistema ECS (BIEN ESTRUCTURADO)
│   ├── manager.js            # ECSManager
│   ├── systems/              # Sistemas ECS
│   ├── components/           # Componentes ECS
│   ├── factories/            # Factories
│   ├── conditions/           # Sistema de condiciones
│   └── states/               # Sistema de estados
│
├── renderers/                 # ⚠️ PARCIALMENTE VACÍO
│   ├── base-renderer.js      # Clase base abstracta
│   ├── geometries/
│   │   └── registry.js       # Registry compartido (usado por terrain + app)
│   ├── models/               # Sistema de carga de modelos 3D
│   │   ├── model-loader.js
│   │   ├── model-cache.js
│   │   ├── bones-utils.js
│   │   └── ...               # SOLO usado por ECS
│   └── optimizations/        # ⚠️ VACÍO (migrado a terrain/)
│
├── managers/                  # ⚠️ CASI VACÍO
│   └── performance-manager.js # Solo 1 archivo
│
├── systems/                   # ⚠️ SERVICIOS DE JUEGO (confuso con ECS systems)
│   ├── input-manager.js      # Input centralizado (usado por app + ECS)
│   ├── collision-detector.js # Colisiones con terreno (usado por app)
│   └── camera-controller.js  # Control de cámara (usado por app)
│
├── state/                     # ✅ Estado global (BIEN)
│   ├── store.js
│   ├── actions.js
│   └── selectors.js
│
├── api/                       # ✅ Cliente API (BIEN)
├── config/                    # ✅ Configuración (BIEN)
├── components/                # ✅ Componentes UI (BIEN)
├── debug/                     # ✅ Debug tools (BIEN)
├── interfaces/                # ✅ Interfaces de debug (BIEN)
└── utils/                     # ✅ Utilidades generales (BIEN)
```

### Problemas Identificados

#### 1. Módulos con Contenido Residual o Mal Organizado

**`renderers/` - Problemas:**
- **Contenido mixto con responsabilidades diferentes:**
  - `base-renderer.js`: Clase base abstracta (infraestructura compartida) - usado por `terrain/renderers/particle-renderer.js`
  - `geometries/registry.js`: Registry compartido (infraestructura base) - usado por `terrain/` y `app.js`
  - `models/`: Sistema completo de carga de modelos 3D - **SOLO usado por ECS** (AnimationMixerSystem, WeaponEquipSystem, PlayerFactory)
- **Carpeta `optimizations/` vacía** después de la migración (LODManager y ParticleLimiter movidos a `terrain/optimizations/`)
- **Nombre confuso**: `renderers/` sugiere renderizadores especializados, pero contiene infraestructura base y modelos usados solo por ECS

**`managers/` - Problemas:**
- **Solo contiene 1 archivo** (`performance-manager.js`)
- **Ubicación no óptima**: Performance management es infraestructura base, debería estar en `core/`
- **Carpeta innecesaria**: No tiene suficiente contenido para justificar su existencia como módulo separado

**`systems/` - Problemas:**
- **Confusión con `ecs/systems/`**: 
  - `systems/` contiene servicios de juego globales (input-manager, collision-detector, camera-controller)
  - `ecs/systems/` contiene sistemas del ECS (InputSystem, PhysicsSystem, RenderSystem)
  - El nombre es ambiguo y puede generar confusión
- **Agrupación inadecuada**:
  - `input-manager.js`: Infraestructura base (usado por app y ECS) - debería estar en `core/`
  - `collision-detector.js`: Servicio de juego de alto nivel (colisiones con terreno) - debería estar en módulo de servicios de juego
  - `camera-controller.js`: Servicio de juego de alto nivel (control de cámara) - debería estar en módulo de servicios de juego

#### 2. Falta de Cohesión y Claridad Arquitectónica

**Problemas de cohesión:**
- Infraestructura base compartida está dispersa entre `core/`, `renderers/`, `managers/`, y `systems/`
- Código específico de ECS (`renderers/models/`) está fuera de `ecs/`
- Servicios de juego globales no tienen un módulo dedicado

**Falta de claridad:**
- No está claro qué código es infraestructura base vs. código de dominio específico
- Difícil determinar dónde agregar nuevo código
- Los límites entre módulos no están bien definidos

#### 3. Escalabilidad Limitada

**Problemas de escalabilidad:**
- No hay un lugar claro para agregar nuevos servicios de juego globales
- Infraestructura base mezclada con código específico dificulta la extensión
- Estructura no refleja las dependencias reales del código

## Necesidades Futuras

### Categorías de Código y Sus Ubicaciones Ideales

1. **Infraestructura Base Compartida** (debería estar en `core/`):
   - Configuración Three.js (escena, cámara, renderer, controles, luces)
   - Registry de geometrías (compartido entre terrain y otros sistemas)
   - Clases base abstractas (BaseRenderer)
   - Sistema de input centralizado (usado por múltiples sistemas)
   - Sistema de métricas de rendimiento (monitoreo global)

2. **Código Específico de ECS** (debería estar en `ecs/`):
   - Sistemas ECS (InputSystem, PhysicsSystem, etc.)
   - Componentes ECS (Position, Physics, Render, etc.)
   - Factories de entidades
   - Sistema de carga de modelos 3D (usado solo por ECS)
   - Utilidades de bones/esqueleto (usado solo por ECS)

3. **Servicios de Juego Globales** (necesita nuevo módulo `game/` o similar):
   - Controlador de cámara (sigue al jugador)
   - Detector de colisiones con terreno
   - Otros servicios de alto nivel que operan entre sistemas

4. **Estado Global** (mantener en `state/`):
   - Store, actions, selectors
   - Funciona bien como está

### Requisitos de Escalabilidad

1. **Separación clara de responsabilidades:**
   - Infraestructura base vs. código de dominio específico
   - Servicios compartidos vs. servicios específicos de sistema

2. **Fácil agregar nuevos servicios:**
   - Lugar claro para servicios de juego globales
   - Estructura predecible y documentada

3. **Reutilización de código:**
   - Infraestructura base fácilmente accesible
   - Sin duplicación de código

4. **Mantenibilidad:**
   - Estructura que refleja las dependencias reales
   - Fácil navegación y comprensión

## Arquitectura Propuesta

### Frontend - Estructura Reorganizada (Opción 1: RECOMENDADA)

```
src/
├── main.js                    # Punto de entrada
├── app.js                     # Orquestación principal
│
├── core/                      # ✅ Infraestructura base compartida
│   ├── scene.js              # Escena base Three.js
│   ├── camera.js             # Gestión de cámara
│   ├── controls.js           # Controles de cámara
│   ├── renderer.js           # Renderizador WebGL
│   ├── lights.js             # Gestión de luces
│   ├── helpers.js            # Helpers visuales
│   │
│   ├── geometries/           # ← MOVER desde renderers/geometries/
│   │   └── registry.js       # Registry compartido (terrain + otros)
│   │
│   ├── renderers/            # ← MOVER desde renderers/
│   │   └── base-renderer.js  # Clase base abstracta
│   │
│   ├── performance/          # ← MOVER desde managers/
│   │   └── performance-manager.js
│   │
│   └── input/                # ← MOVER desde systems/
│       └── input-manager.js  # Input centralizado
│
├── ecs/                       # ✅ Sistema ECS
│   ├── manager.js            # ECSManager
│   ├── systems/              # Sistemas ECS
│   ├── components/           # Componentes ECS
│   ├── factories/            # Factories
│   ├── conditions/           # Sistema de condiciones
│   ├── states/               # Sistema de estados
│   │
│   └── models/               # ← MOVER desde renderers/models/
│       ├── model-loader.js   # Carga de modelos 3D
│       ├── model-cache.js
│       ├── bones-utils.js
│       ├── model-utils.js
│       └── ...               # Solo usado por ECS
│
├── terrain/                   # ✅ Sistema de terreno (MANTENER)
│   ├── manager.js            # TerrainManager
│   ├── components/
│   ├── systems/
│   ├── renderers/
│   │   └── particle-renderer.js  # Extiende core/renderers/base-renderer.js
│   ├── optimizations/
│   ├── utils/
│   └── api/
│
├── world/                     # ← NUEVO: Servicios que integran sistemas para el mundo
│   ├── camera-controller.js  # ← MOVER desde systems/ (vista del mundo, sigue jugador)
│   └── collision-detector.js # ← MOVER desde systems/ (colisiones con terreno/mundo)
│
├── state/                     # ✅ Estado global (MANTENER)
│   ├── store.js
│   ├── actions.js
│   └── selectors.js
│
├── api/                       # ✅ Cliente API (MANTENER)
├── config/                    # ✅ Configuración (MANTENER)
├── components/                # ✅ Componentes UI (MANTENER)
├── debug/                     # ✅ Debug tools (MANTENER)
├── interfaces/                # ✅ Interfaces (MANTENER)
└── utils/                     # ✅ Utilidades generales (MANTENER)
```

### Justificación de la Reorganización

#### `core/` - Infraestructura Base Compartida

**Propósito:** Agrupar toda la infraestructura base que es compartida entre múltiples sistemas.

**Contenido:**
- Configuración Three.js (scene, camera, renderer, controls, lights, helpers)
- `geometries/registry.js`: Registry compartido usado por terrain y potencialmente otros sistemas
- `renderers/base-renderer.js`: Clase base abstracta para renderizadores
- `performance/performance-manager.js`: Métricas globales de rendimiento
- `input/input-manager.js`: Input centralizado usado por app y ECS

**Principio clave:** `core/` debe ser **independiente** de sistemas de dominio (ECS, terrain). Solo proporciona infraestructura base que otros sistemas usan.

**Ventajas:**
- ✅ Todo en un lugar: fácil encontrar infraestructura base
- ✅ Cohesión: código relacionado está agrupado
- ✅ Reutilización: infraestructura claramente disponible para todos los sistemas
- ✅ Independencia: `core/` no depende de `ecs/`, `terrain/`, u otros sistemas de dominio

#### `ecs/models/` - Código Específico de ECS

**Propósito:** Agrupar código usado exclusivamente por el sistema ECS.

**Contenido:**
- Sistema completo de carga de modelos 3D (GLTF/GLB)
- Utilidades de bones/esqueleto
- Cache de modelos

**Ventajas:**
- ✅ Cohesión: todo el código de ECS está en `ecs/`
- ✅ Claridad: está claro que este código pertenece a ECS
- ✅ Encapsulación: dependencias de ECS están contenidas

#### `world/` - Servicios de Integración del Mundo

**Propósito:** Servicios que integran múltiples sistemas para manejar aspectos del mundo virtual (vista, colisiones, interacciones).

**Contenido:**
- `camera-controller.js`: Control de cámara que sigue al jugador (integra ECS + core/camera para vista del mundo)
- `collision-detector.js`: Detección de colisiones con terreno (integra terrain + ECS para interacciones con el mundo)

**¿Por qué NO en `core/`?**

Aunque estos servicios usan infraestructura de `core/`, **NO deben ir en `core/`** porque:

1. **Dependencias de dominio:** 
   - `camera-controller.js` tiene método `update(ecs)` que requiere acceso directo a ECS para obtener posición de entidades
   - `collision-detector.js` depende de `ParticlesApi` que consulta el sistema de terreno
   - Si van en `core/`, `core/` dependería de `ecs/` y `terrain/`, rompiendo la separación de capas

2. **Lógica de dominio específica:**
   - `camera-controller`: Lógica de seguir jugador, modos primera/tercera persona (lógica de juego)
   - `collision-detector`: Lógica de colisiones con partículas sólidas del terreno (lógica de juego)

3. **Principio de dependencias:**
   - `core/` debe ser independiente de sistemas de dominio (ECS, terrain)
   - `core/` proporciona infraestructura base que otros sistemas usan
   - Servicios que integran múltiples sistemas pertenecen a una capa superior

**Ventajas de `world/`:**
- ✅ Claridad: servicios específicos del mundo virtual diferenciados de infraestructura
- ✅ Escalabilidad: lugar claro para agregar más servicios de mundo (física, iluminación dinámica, etc.)
- ✅ Separación de capas: `core/` (infraestructura) → `world/` (integración) vs. `ecs/`, `terrain/` (sistemas específicos)
- ✅ Nombre descriptivo: "world" describe que maneja aspectos del mundo virtual
- ✅ Evita dependencias circulares: `core/` no depende de `ecs/` ni `terrain/`

**Alternativas de nombres consideradas:**

1. **`world/` (RECOMENDADO)** - Enfatiza que maneja aspectos del mundo virtual (vista del mundo, colisiones con mundo/terreno)
2. **`runtime/`** - Enfatiza servicios que operan en tiempo de ejecución (más genérico, menos descriptivo del dominio)
3. **`integration/`** - Enfatiza que integra múltiples sistemas (técnico, menos descriptivo del propósito)
4. **`coordination/`** - Enfatiza que coordina sistemas (muy descriptivo pero más largo)
5. **`interactions/`** - Enfatiza interacciones entre sistemas (menos específico al dominio del juego)
6. **`scene-services/`** - Podría confundirse con `core/scene.js`

### Alternativa: Opción 2 (Consolidación Mínima)

Si se prefiere menos cambios, esta opción mantiene `renderers/` pero mueve contenido:

```
src/
├── core/
│   ├── geometries/           # ← MOVER desde renderers/
│   └── performance-manager.js # ← MOVER desde managers/
│
├── renderers/
│   └── base-renderer.js     # Mantener aquí
│
├── services/                 # ← NUEVO (alternativa a world/)
│   ├── input-manager.js      # Nota: input-manager va a core/input/
│   ├── camera-controller.js
│   └── collision-detector.js
│
├── ecs/
│   └── models/               # ← MOVER desde renderers/
│
└── managers/                 # ELIMINAR (vacío)
```

**Desventajas:**
- ⚠️ `base-renderer.js` queda en `renderers/` aunque es infraestructura base
- ⚠️ `services/` podría confundirse con servicios externos/API
- ⚠️ Menos cohesión que Opción 1

## Patrones de Diseño a Usar

### 1. Separation of Concerns (SoC)

**Descripción:** Separar código por responsabilidades claras.

**Cómo se aplica:**
- `core/`: Infraestructura base (no conoce lógica de negocio)
- `ecs/`: Sistema ECS (no conoce detalles de terreno)
- `terrain/`: Sistema de terreno (no conoce detalles de ECS)
- `world/`: Servicios de integración del mundo (orquesta interacciones entre sistemas)
- `state/`: Estado global (no conoce detalles de implementación)

**Beneficios:**
- Código más mantenible
- Fácil testing (módulos independientes)
- Reducción de acoplamiento

### 2. Dependency Inversion Principle (DIP)

**Descripción:** Módulos de alto nivel no dependen de módulos de bajo nivel; ambos dependen de abstracciones.

**Cómo se aplica:**
- `terrain/renderers/particle-renderer.js` depende de `core/renderers/base-renderer.js` (abstracción)
- `game/camera-controller.js` depende de `core/camera.js` (abstracción)
- Servicios de juego dependen de interfaces, no implementaciones específicas

**Beneficios:**
- Facilita intercambio de implementaciones
- Reduce acoplamiento
- Mejora testabilidad

### 3. Single Responsibility Principle (SRP)

**Descripción:** Cada módulo tiene una única razón para cambiar.

**Cómo se aplica:**
- `core/`: Cambia solo cuando cambia infraestructura base
- `ecs/`: Cambia solo cuando cambia el sistema ECS
- `terrain/`: Cambia solo cuando cambia el sistema de terreno
- `world/`: Cambia solo cuando cambian servicios de integración del mundo

**Beneficios:**
- Fácil identificar qué módulo modificar
- Cambios localizados
- Menos efectos secundarios

## Beneficios de la Nueva Arquitectura

1. **Claridad Arquitectónica:**
   - Límites claros entre módulos
   - Responsabilidades bien definidas
   - Fácil entender qué código pertenece a qué sistema

2. **Cohesión Mejorada:**
   - Código relacionado está agrupado
   - Infraestructura base en `core/`
   - Código específico de ECS en `ecs/`
   - Servicios de juego en `game/`

3. **Escalabilidad:**
   - Lugar claro para agregar nuevos servicios (`game/`)
   - Infraestructura base extensible (`core/`)
   - Sistemas específicos encapsulados (ECS, terrain)

4. **Mantenibilidad:**
   - Estructura que refleja dependencias reales
   - Fácil navegación
   - Cambios localizados

5. **Reducción de Confusión:**
   - `systems/` ya no compite con `ecs/systems/`
   - `renderers/` ya no contiene código no relacionado con renderizado especializado
   - `managers/` eliminado (contenido insuficiente)
   - `world/` claramente diferente de `game/` (más específico: servicios de integración del mundo virtual)

## Migración Propuesta

### Fase 1: Mover Infraestructura a `core/`

**Objetivo:** Consolidar infraestructura base compartida.

**Pasos:**
1. Crear `core/geometries/` y mover `renderers/geometries/registry.js` → `core/geometries/registry.js`
2. Crear `core/renderers/` y mover `renderers/base-renderer.js` → `core/renderers/base-renderer.js`
3. Crear `core/performance/` y mover `managers/performance-manager.js` → `core/performance/performance-manager.js`
4. Crear `core/input/` y mover `systems/input-manager.js` → `core/input/input-manager.js`

**Archivos afectados:**
- `app.js`: Actualizar imports
- `terrain/renderers/particle-renderer.js`: Actualizar import de BaseRenderer
- `ecs/systems/input-system.js`: Actualizar import de InputManager
- `core/__init__.js`: Actualizar exports si existe

**Testing:**
- Verificar que app.js sigue funcionando
- Verificar que terrain carga correctamente
- Verificar que ECS recibe input correctamente

### Fase 2: Mover Modelos a `ecs/`

**Objetivo:** Agrupar código específico de ECS.

**Pasos:**
1. Crear `ecs/models/` y mover `renderers/models/` → `ecs/models/`
2. Actualizar imports en archivos que usan modelos:
   - `ecs/systems/animation-mixer-system.js`
   - `ecs/systems/weapon-equip-system.js`
   - `ecs/factories/player-factory.js`
   - `utils/weapon-attachment.js`

**Testing:**
- Verificar que personajes se cargan correctamente
- Verificar que animaciones funcionan
- Verificar que armas se equipan correctamente

### Fase 3: Crear `game/` y Mover Servicios

**Objetivo:** Agrupar servicios de juego globales.

**Pasos:**
1. Crear directorio `game/`
2. Mover `systems/camera-controller.js` → `game/camera-controller.js`
3. Mover `systems/collision-detector.js` → `game/collision-detector.js`
4. Crear `game/__init__.js` con exports
5. Crear `game/README.md` con documentación

**Archivos afectados:**
- `app.js`: Actualizar imports

**Testing:**
- Verificar que cámara sigue al jugador
- Verificar que colisiones funcionan correctamente

### Fase 4: Actualizar Imports y Limpiar

**Objetivo:** Actualizar todos los imports y eliminar módulos vacíos.

**Pasos:**
1. Buscar y actualizar todos los imports afectados
2. Verificar que no hay imports rotos
3. Eliminar `renderers/` (debe estar vacío después de Fase 1 y 2)
4. Eliminar `managers/` (debe estar vacío después de Fase 1)
5. Eliminar `systems/` (debe estar vacío después de Fase 3)
6. Actualizar READMEs:
   - `src/README.md`: Actualizar estructura
   - `core/README.md`: Documentar nuevas subcarpetas
   - `ecs/README.md`: Documentar `ecs/models/`
   - Crear `game/README.md`: Documentar servicios de juego

**Testing:**
- Ejecutar aplicación completa
- Verificar que no hay errores de imports
- Verificar funcionalidad completa

## Consideraciones Técnicas

### Frontend

1. **Compatibilidad con Imports:**
   - Usar imports relativos (`../../core/...`)
   - Considerar crear aliases de imports en el futuro si el proyecto crece
   - Verificar que todos los paths sean correctos después de la migración

2. **Testing:**
   - Cada fase debe incluir testing manual
   - Verificar funcionalidad crítica después de cada fase
   - No proceder a siguiente fase si hay errores

3. **Documentación:**
   - Actualizar READMEs en tiempo real durante la migración
   - Documentar cambios en commits
   - Actualizar diagramas de arquitectura si existen

4. **Rollback:**
   - Hacer commit después de cada fase exitosa
   - Facilitar rollback si es necesario
   - Mantener rama de backup si es necesario

5. **Dependencias:**
   - Verificar que no hay dependencias circulares
   - Asegurar que imports son unidireccionales cuando sea posible
   - `game/` puede depender de `core/` y `ecs/` y `terrain/`, pero no al revés

## Ejemplo de Uso Futuro

```javascript
// app.js - Después de la reorganización

import { Scene3D } from './core/scene.js';
import { GeometryRegistry } from './core/geometries/registry.js';
import { PerformanceManager } from './core/performance/performance-manager.js';
import { InputManager } from './core/input/input-manager.js';

import { TerrainManager } from './terrain/manager.js';
import { ECSManager } from './ecs/index.js';
import { PlayerFactory } from './ecs/factories/player-factory.js';

import { CameraController } from './world/camera-controller.js';
import { CollisionDetector } from './world/collision-detector.js';

import { Store } from './state/store.js';
import { actions } from './state/actions.js';

export class App {
    constructor(container) {
        // Core - Infraestructura base
        this.scene = new Scene3D(container);
        this.geometryRegistry = new GeometryRegistry();
        this.performanceManager = new PerformanceManager();
        this.inputManager = new InputManager();
        
        // State
        this.store = new Store();
        
        // Sistemas específicos
        this.terrain = new TerrainManager(
            this.scene.scene,
            particlesApi,
            dimensionsApi,
            this.geometryRegistry // ← De core/geometries/
        );
        
        this.ecs = new ECSManager();
        // ECS usa ecs/models/ internamente
        
        // Servicios de integración del mundo
        this.cameraController = new CameraController(
            this.scene.camera,
            this.scene,
            cellSize
        );
        
        this.collisionDetector = new CollisionDetector(
            particlesApi,
            cellSize
        );
    }
}
```

## Conclusión

Esta reorganización post-migración del sistema de terreno (JDG-035-2) mejora significativamente la estructura del frontend:

**Beneficios principales:**
- ✅ **Claridad**: Límites claros entre infraestructura, sistemas específicos, y servicios de juego
- ✅ **Cohesión**: Código relacionado agrupado lógicamente
- ✅ **Escalabilidad**: Lugar claro para agregar nuevo código
- ✅ **Mantenibilidad**: Estructura que refleja dependencias reales

**Cambios clave:**
1. `core/` agrupa toda la infraestructura base compartida
2. `ecs/models/` agrupa código usado solo por ECS
3. `world/` proporciona lugar para servicios que integran sistemas del mundo virtual
4. Eliminación de módulos residuales (`renderers/`, `managers/`, `systems/`)

La **Opción 1 (Integración en módulos existentes)** es la recomendada por proporcionar la mejor separación de responsabilidades y mayor claridad arquitectónica, aunque requiere más cambios en imports que la Opción 2.

El nombre del módulo para servicios de integración se propone como **`world/`** por ser descriptivo del dominio (servicios del mundo virtual: vista, colisiones). Se incluyen alternativas en la sección de justificación si se prefiere otro nombre.

La migración propuesta es **incremental y segura**, con testing después de cada fase para minimizar riesgos.
