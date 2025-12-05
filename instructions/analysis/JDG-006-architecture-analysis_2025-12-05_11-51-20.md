# Análisis de Arquitectura - Componentización del Frontend para Escalabilidad (JDG-006)

## Situación Actual

### Frontend

**Estructura actual:**
```
frontend/
├── index.html          # Página principal con HTML y estilos inline
├── src/
│   ├── main.js        # Lógica principal (162 líneas)
│   │                  # - Carga de dimensiones
│   │                  # - Cálculo de viewport
│   │                  # - Gestión de estado (variables globales)
│   │                  # - Orquestación de carga y renderizado
│   ├── api.js         # Cliente API (67 líneas)
│   │                  # - Métodos para todos los endpoints
│   │                  # - Sin separación por recurso
│   ├── scene.js       # Escena Three.js (443 líneas)
│   │                  # - Configuración de escena, cámara, controles
│   │                  # - Gestión de luces y helpers
│   │                  # - Cache de estilos
│   │                  # - Renderizado de partículas (instanced rendering)
│   │                  # - Creación de materiales y geometrías
│   │                  # - Utilidades de colores
│   ├── constants.js   # Constantes (51 líneas)
│   └── types.js       # Tipos JSDoc
└── nginx.conf         # Configuración nginx
```

**Problemas identificados:**

1. **Archivos monolíticos grandes:**
   - `scene.js` tiene 443 líneas con múltiples responsabilidades mezcladas
   - `main.js` tiene lógica de carga, cálculo de viewport, gestión de estado y orquestación
   - Difícil de mantener y testear

2. **Sin separación de responsabilidades:**
   - `Scene3D` maneja escena, cámara, controles, renderizado, cache, materiales, geometrías
   - `main.js` maneja carga de datos, cálculo de viewport, gestión de estado, UI
   - Todo está acoplado

3. **Renderizado genérico:**
   - Todas las partículas se renderizan igual (cubos con BoxGeometry)
   - No hay diferenciación visual entre tipos de entidades
   - No hay renderizadores especializados para árboles, plantas, animales

4. **Sin gestión de estado centralizada:**
   - Estado disperso en variables globales (`currentDimension`, `currentParticles`)
   - No hay sistema de eventos o notificaciones
   - Difícil rastrear cambios de estado

5. **Sin componentes reutilizables:**
   - UI está mezclada en `index.html` con estilos inline
   - No hay componentes UI reutilizables (botones, paneles, modales)
   - Difícil agregar nuevas funcionalidades de UI

6. **Sin sistema de eventos:**
   - No hay comunicación estructurada entre componentes
   - Todo se comunica directamente (acoplamiento fuerte)

7. **Utilidades mezcladas:**
   - Funciones de colores, geometría, etc. están en `scene.js`
   - No hay organización por tipo de utilidad

8. **API client genérico:**
   - Todos los endpoints en una sola clase
   - Sin separación por recurso o funcionalidad

9. **Difícil testear:**
   - Archivos grandes y acoplados
   - Dependencias directas entre módulos
   - No hay interfaces claras

10. **Sin preparación para escalar:**
    - Agregar nuevo tipo de renderizador requiere modificar `scene.js`
    - Agregar nueva funcionalidad de UI requiere modificar `index.html` y `main.js`
    - No hay estructura para manejar múltiples tipos de entidades

### Backend

**Estado:** Ya refactorizado en JDG-005 con estructura modular (templates, builders, creators)

**Relevancia:** El frontend necesita reflejar la estructura modular del backend para renderizar diferentes tipos de entidades correctamente.

## Necesidades Futuras

### Renderizadores Especializados

1. **Árboles**:
   - Renderizado optimizado para estructuras verticales (tronco + copa)
   - Posible uso de geometrías más complejas (cilindros para troncos, esferas para copas)
   - Animaciones de hojas (opcional)
   - Diferentes estilos según tipo de árbol (roble, palmera, paraíso)

2. **Plantas**:
   - Renderizado de estructuras pequeñas y variadas
   - Geometrías específicas según tipo de planta
   - Posibles animaciones de crecimiento

3. **Animales cuadrúpedos**:
   - Renderizado de estructuras complejas con múltiples partes
   - Animaciones de movimiento (futuro)
   - Diferentes modelos según tipo (vaca, oveja, etc.)

4. **Razas bípedas**:
   - Renderizado de humanoides
   - Estructuras complejas con múltiples partes
   - Animaciones de movimiento y acciones (futuro)

### Sistemas de UI

1. **Componentes básicos:**
   - Botones, paneles, modales, tooltips
   - Formularios, inputs, selects
   - Indicadores de carga, mensajes de error

2. **Sistemas específicos:**
   - Panel de información de entidades
   - Inventario del jugador
   - Sistema de construcción
   - Interfaz de interacción con entidades

### Gestión de Estado

1. **Estado de la aplicación:**
   - Dimensión actual
   - Partículas cargadas
   - Viewport actual
   - Estado de carga

2. **Estado del jugador:**
   - Inventario
   - Posición
   - Acciones disponibles

3. **Estado de UI:**
   - Paneles abiertos/cerrados
   - Modales activos
   - Selección de entidades

### Efectos Visuales

1. **Iluminación dinámica:**
   - Día/noche
   - Luces por tipo de entidad

2. **Animaciones:**
   - Movimiento de entidades
   - Efectos de partículas
   - Transiciones de UI

3. **Optimizaciones visuales:**
   - LOD (Level of Detail) para entidades lejanas
   - Frustum culling mejorado
   - Occlusion culling

### Requisitos de Escalabilidad

1. **Fácil agregar nuevos renderizadores**: Agregar nuevo tipo solo requiere crear nuevo archivo
2. **Reutilización de código**: Funcionalidad común en clases base
3. **Separación de responsabilidades**: Cada módulo tiene una responsabilidad clara
4. **Extensibilidad**: Fácil agregar nuevas funcionalidades sin modificar código existente
5. **Mantenibilidad**: Código organizado y fácil de entender
6. **Testabilidad**: Módulos pequeños y desacoplados

## Arquitectura Propuesta

### Frontend - Estructura Modular

```
frontend/
├── index.html                    # Página principal (simplificada)
├── src/
│   ├── main.js                   # Punto de entrada, inicialización mínima
│   ├── app.js                    # Aplicación principal (orquestación)
│   │
│   ├── api/                      # Cliente API modular
│   │   ├── client.js             # Cliente base con configuración
│   │   ├── endpoints/
│   │   │   ├── dimensions.js    # Endpoints de dimensiones
│   │   │   ├── particles.js      # Endpoints de partículas
│   │   │   └── agrupaciones.js   # Endpoints de agrupaciones
│   │   └── __init__.js           # Exportaciones centralizadas
│   │
│   ├── core/                     # Núcleo de Three.js
│   │   ├── scene.js              # Escena base (configuración mínima)
│   │   ├── camera.js             # Gestión de cámara
│   │   ├── controls.js           # Controles de cámara (OrbitControls wrapper)
│   │   ├── renderer.js           # Renderizador WebGL
│   │   ├── lights.js             # Gestión de luces
│   │   └── helpers.js            # Helpers (grid, axes) con gestión dinámica
│   │
│   ├── renderers/                # Sistema de renderizadores
│   │   ├── base-renderer.js      # Renderizador base abstracto
│   │   ├── particle-renderer.js  # Renderizador genérico de partículas
│   │   ├── tree-renderer.js      # Renderizador especializado para árboles
│   │   ├── plant-renderer.js     # Renderizador especializado para plantas
│   │   ├── entity-renderer.js    # Renderizador para animales/razas
│   │   └── registry.js           # Registry de renderizadores
│   │
│   ├── components/               # Componentes reutilizables
│   │   ├── ui/                   # Componentes UI
│   │   │   ├── button.js
│   │   │   ├── panel.js
│   │   │   ├── modal.js
│   │   │   ├── loading.js
│   │   │   └── info-panel.js
│   │   └── entities/             # Componentes de entidades
│   │       ├── entity-info.js
│   │       └── entity-selector.js
│   │
│   ├── state/                    # Gestión de estado
│   │   ├── store.js              # Store centralizado (custom o Redux-like)
│   │   ├── actions.js            # Acciones para modificar estado
│   │   ├── selectors.js           # Selectores de estado
│   │   └── reducers.js            # Reducers (si se usa patrón Redux)
│   │
│   ├── managers/                 # Gestores de alto nivel
│   │   ├── viewport-manager.js   # Gestión de viewport y carga de datos
│   │   ├── style-manager.js      # Gestión de cache de estilos
│   │   └── entity-manager.js     # Gestión de entidades y renderizadores
│   │
│   ├── utils/                    # Utilidades organizadas
│   │   ├── colors.js             # Utilidades de colores
│   │   ├── geometry.js           # Utilidades de geometría
│   │   ├── math.js               # Utilidades matemáticas
│   │   └── helpers.js             # Helpers generales
│   │
│   ├── constants.js              # Constantes (sin cambios)
│   └── types.js                  # Tipos JSDoc (sin cambios)
│
└── nginx.conf                     # Configuración nginx (sin cambios)
```

### Jerarquía de Clases

```
BaseRenderer (abstract)
├── ParticleRenderer (genérico)
│   └── InstancedParticleRenderer (optimizado)
├── TreeRenderer (especializado)
│   ├── RobleRenderer (específico)
│   ├── PalmeraRenderer (específico)
│   └── ParaisoRenderer (específico)
├── PlantRenderer (especializado)
└── EntityRenderer (especializado)
    ├── CuadrupedoRenderer
    └── BipedoRenderer
```

### Flujo de Datos Propuesto

```
1. Usuario interactúa / App carga
   ↓
2. App.js orquesta flujo
   ↓
3. ViewportManager calcula viewport
   ↓
4. ApiClient carga datos (partículas, tipos)
   ↓
5. StyleManager cachea estilos
   ↓
6. EntityManager selecciona renderizadores apropiados
   ↓
7. Renderizadores especializados renderizan entidades
   ↓
8. Store actualiza estado
   ↓
9. Componentes UI se actualizan (reactivos al estado)
```

## Patrones de Diseño a Usar

### 1. Strategy Pattern
- **Renderizadores**: Cada tipo de entidad tiene su estrategia de renderizado
- **Beneficio**: Fácil agregar nuevos tipos sin modificar código existente
- **Implementación**: `BaseRenderer` define interfaz, renderizadores específicos implementan

### 2. Factory Pattern
- **Renderizadores**: Factory selecciona renderizador apropiado según tipo de entidad
- **Beneficio**: Desacopla creación de uso
- **Implementación**: `EntityManager` o `RendererRegistry` selecciona renderizador

### 3. Observer Pattern
- **Estado**: Componentes se suscriben a cambios de estado
- **Beneficio**: Desacopla componentes, facilita reactividad
- **Implementación**: Store notifica cambios a suscriptores

### 4. Component Pattern
- **UI**: Componentes reutilizables encapsulan lógica y presentación
- **Beneficio**: Reutilización y mantenibilidad
- **Implementación**: Clases de componentes con métodos `render()`, `update()`, `destroy()`

### 5. Manager Pattern
- **Gestores**: Managers coordinan múltiples sistemas
- **Beneficio**: Separación de responsabilidades, fácil testear
- **Implementación**: `ViewportManager`, `StyleManager`, `EntityManager`

### 6. Registry Pattern
- **Renderizadores**: Registry registra y descubre renderizadores disponibles
- **Beneficio**: Extensibilidad sin modificar código existente
- **Implementación**: `RendererRegistry` con funciones `getRenderer()`, `registerRenderer()`

## Beneficios de la Nueva Arquitectura

1. **Escalabilidad**: Agregar nuevo renderizador es solo crear nuevo archivo y registrar
2. **Mantenibilidad**: Código organizado por responsabilidad, fácil de encontrar y modificar
3. **Reutilización**: Funcionalidad común en clases base y utilidades
4. **Testabilidad**: Módulos pequeños y desacoplados, fácil testear independientemente
5. **Extensibilidad**: Fácil agregar nuevas funcionalidades sin afectar existentes
6. **Claridad**: Estructura clara y predecible, fácil de entender
7. **Performance**: Renderizadores especializados pueden optimizarse por tipo
8. **Separación de responsabilidades**: Cada módulo tiene una responsabilidad clara

## Migración Propuesta

### Fase 1: Crear Estructura Base y Separar Core

**Objetivo:** Separar responsabilidades del núcleo de Three.js

**Pasos:**
1. Crear estructura de carpetas (`core/`, `renderers/`, `components/`, `state/`, `utils/`, `managers/`, `api/`)
2. Extraer `Camera` de `scene.js` a `core/camera.js`
3. Extraer `Controls` de `scene.js` a `core/controls.js`
4. Extraer `Renderer` de `scene.js` a `core/renderer.js`
5. Extraer `Lights` de `scene.js` a `core/lights.js`
6. Extraer `Helpers` de `scene.js` a `core/helpers.js`
7. Refactorizar `Scene3D` para usar módulos core
8. Verificar que funciona igual que antes

### Fase 2: Separar API Client

**Objetivo:** Modularizar cliente API

**Pasos:**
1. Crear `api/client.js` con configuración base
2. Crear `api/endpoints/dimensions.js` con métodos de dimensiones
3. Crear `api/endpoints/particles.js` con métodos de partículas
4. Crear `api/endpoints/agrupaciones.js` con métodos de agrupaciones
5. Refactorizar `main.js` para usar nuevo API client
6. Verificar que funciona igual que antes

### Fase 3: Crear Sistema de Renderizadores

**Objetivo:** Implementar sistema de renderizadores especializados

**Pasos:**
1. Crear `renderers/base-renderer.js` (clase base abstracta)
2. Crear `renderers/particle-renderer.js` (mover lógica actual de renderizado)
3. Crear `renderers/registry.js` (registry de renderizadores)
4. Crear `renderers/tree-renderer.js` (renderizador especializado para árboles)
5. Refactorizar `Scene3D` para usar sistema de renderizadores
6. Verificar que funciona igual que antes

### Fase 4: Crear Sistema de Gestión de Estado

**Objetivo:** Centralizar gestión de estado

**Pasos:**
1. Crear `state/store.js` (store centralizado)
2. Crear `state/actions.js` (acciones para modificar estado)
3. Crear `state/selectors.js` (selectores de estado)
4. Refactorizar `main.js` para usar store
5. Hacer componentes reactivos al estado
6. Verificar que funciona igual que antes

### Fase 5: Crear Managers y Separar Lógica

**Objetivo:** Separar lógica de orquestación en managers

**Pasos:**
1. Crear `managers/viewport-manager.js` (cálculo de viewport)
2. Crear `managers/style-manager.js` (gestión de cache de estilos)
3. Crear `managers/entity-manager.js` (gestión de entidades y renderizadores)
4. Crear `app.js` (aplicación principal que orquesta managers)
5. Refactorizar `main.js` para ser punto de entrada mínimo
6. Verificar que funciona igual que antes

### Fase 6: Crear Componentes UI Reutilizables

**Objetivo:** Componentizar UI

**Pasos:**
1. Crear `components/ui/button.js`
2. Crear `components/ui/panel.js`
3. Crear `components/ui/modal.js`
4. Crear `components/ui/loading.js`
5. Crear `components/ui/info-panel.js`
6. Refactorizar `index.html` para usar componentes
7. Verificar que funciona igual que antes

### Fase 7: Organizar Utilidades

**Objetivo:** Organizar funciones de utilidad

**Pasos:**
1. Extraer funciones de colores a `utils/colors.js`
2. Extraer funciones de geometría a `utils/geometry.js`
3. Extraer funciones matemáticas a `utils/math.js`
4. Refactorizar código para usar utilidades organizadas
5. Verificar que funciona igual que antes

### Fase 8: Documentación y Testing

**Objetivo:** Documentar y preparar para testing

**Pasos:**
1. Crear READMEs en cada módulo siguiendo práctica establecida
2. Documentar flujos de ejecución
3. Crear ejemplos de uso
4. Preparar estructura para testing (si se implementa)

## Consideraciones Técnicas

### Frontend

1. **Compatibilidad**: El renderizado actual debe seguir funcionando durante la migración
2. **Performance**: Instanced rendering debe mantenerse o mejorarse
3. **APIs**: No cambian APIs del backend, solo organización interna
4. **Testing**: Cada módulo debe ser testeable independientemente
5. **Bundle size**: Considerar impacto en tamaño del bundle (minimizar si es necesario)

### Performance

1. **Instanced rendering**: Debe mantenerse para partículas genéricas
2. **Renderizadores especializados**: Pueden usar técnicas diferentes según necesidad
3. **LOD**: Implementar Level of Detail para entidades lejanas (futuro)
4. **Frustum culling**: Mejorar culling para mejor rendimiento (futuro)

### Compatibilidad

1. **Navegadores**: Mantener compatibilidad con navegadores actuales
2. **Three.js**: Mantener versión actual o planificar migración si es necesario
3. **APIs del backend**: No cambian, solo organización interna del cliente

### Testing

1. **Unit tests**: Cada módulo debe ser testeable independientemente
2. **Integration tests**: Verificar que componentes trabajan juntos correctamente
3. **E2E tests**: Verificar flujo completo de carga y renderizado (futuro)

## Ejemplo de Uso Futuro

```javascript
// Inicialización simplificada
import { App } from './app.js';

const app = new App(document.getElementById('canvas-container'));
await app.loadDemo();

// Agregar nuevo renderizador (solo crear archivo y registrar)
import { TreeRenderer } from './renderers/tree-renderer.js';
import { RendererRegistry } from './renderers/registry.js';

RendererRegistry.register('tree', TreeRenderer);

// Usar componente UI reutilizable
import { InfoPanel } from './components/ui/info-panel.js';

const panel = new InfoPanel({
    title: 'Información de Entidad',
    content: entityData
});
panel.render(document.body);

// Acceder a estado centralizado
import { store } from './state/store.js';
import { selectCurrentDimension } from './state/selectors.js';

const dimension = selectCurrentDimension(store.getState());
```

## Documentación con READMEs

### Práctica Establecida

**Cada carpeta/módulo debe tener su `README.md`** que explique:
- Qué es y qué contiene el módulo/carpeta
- Estructura de archivos y componentes principales
- Responsabilidades de cada componente
- Cómo usar el módulo (ejemplos de código)
- Referencias a READMEs de subcarpetas

### Mantenimiento de Documentación

**Cuando se modifica un módulo:**
1. **Actualizar el README del módulo/carpeta modificado**
2. **Verificar y actualizar READMEs padres si es necesario**
3. **Mantener documentación sincronizada con el código**

**Ejemplo:**
- Si se agrega un nuevo renderizador en `renderers/`:
  - Actualizar `renderers/README.md`
  - Verificar si `frontend/README.md` necesita actualización

### En Planes de Acción

Todos los planes de acción deben incluir pasos para:
- Crear/actualizar READMEs cuando se crean o modifican carpetas/módulos
- Verificar READMEs padres cuando se actualiza uno hijo
- Mantener documentación actualizada como parte del proceso de desarrollo

## Conclusión

La arquitectura propuesta permite:
- Escalar fácilmente agregando nuevos renderizadores sin modificar código existente
- Mantener código organizado y mantenible
- Reutilizar funcionalidad común
- Preparar el frontend para crecimiento futuro (UI, interacciones, animaciones)
- **Documentación clara y mantenida con READMEs en cada módulo**

La migración puede hacerse de forma incremental sin romper funcionalidad existente. Cada fase puede verificarse independientemente antes de continuar con la siguiente.

