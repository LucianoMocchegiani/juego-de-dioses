# Módulo World - Servicios de Integración del Mundo

Este módulo contiene servicios que integran múltiples sistemas para manejar aspectos del mundo virtual (vista, colisiones, interacciones).

## Estructura

```
world/
├── camera-controller.js     # Control de cámara que sigue al jugador
├── collision-detector.js    # Detección de colisiones con terreno
├── celestial-system.js      # Sistema celestial del frontend (calcula posiciones visuales)
├── celestial-renderer.js   # Renderizador de sol/luna en Three.js
└── README.md
```

## Componentes

### CameraController (`camera-controller.js`)

Controlador de cámara que sigue a una entidad en modo tercera persona o primera persona.

**Responsabilidades:**
- Seguir a una entidad objetivo (jugador)
- Posicionar cámara en modo tercera persona (detrás y arriba)
- Suavizado de movimiento de cámara
- Conversión correcta de coordenadas (celdas a metros)
- Zoom con rueda del mouse
- Rotación con click derecho

**Dependencias:**
- `core/camera.js` - Cámara Three.js
- `core/scene.js` - Escena Three.js
- `core/input/input-manager.js` - Input para mouse y teclado
- `ecs/` - Para obtener posición de entidades

**Uso:**
```javascript
import { CameraController } from './world/camera-controller.js';
import { InputManager } from './core/input/input-manager.js';

const cameraController = new CameraController(
    scene.camera,  // Objeto Camera del core
    scene,         // Objeto Scene3D del core
    0.25,          // Tamaño de celda en metros
    inputManager   // InputManager (opcional)
);

// Establecer entidad objetivo (jugador)
cameraController.setTarget(playerId);

// Actualizar en cada frame
cameraController.update(ecs);
```

**Métodos principales:**
- `setTarget(entityId)` - Establecer entidad a seguir
- `setMode(mode)` - Establecer modo ('first-person' | 'third-person')
- `update(ecs)` - Actualizar posición de cámara (llamar cada frame)

### CollisionDetector (`collision-detector.js`)

Detector de colisiones con partículas sólidas del mundo.

**Responsabilidades:**
- Consultar partículas en área pequeña alrededor de una posición
- Filtrar solo partículas sólidas
- Crear mapa de celdas ocupadas
- Cachear resultados para optimización

**Dependencias:**
- `api/endpoints/particles.js` - API para consultar partículas del terreno

**Uso:**
```javascript
import { CollisionDetector } from './world/collision-detector.js';

const collisionDetector = new CollisionDetector(particlesApi, 0.25);

// Verificar colisiones
const occupiedCells = await collisionDetector.checkCollision(
    { x: 80, y: 80, z: 1 }, // Posición
    2,                       // Radio de búsqueda
    bloqueId                  // ID del bloque
);

// Verificar si una celda está ocupada
if (collisionDetector.isCellOccupied(occupiedCells, 80, 80, 0)) {
    // Celda ocupada
}
```

**Métodos principales:**
- `checkCollision(position, radius, bloqueId)` - Obtener celdas ocupadas en área
- `isCellOccupied(occupiedCells, x, y, z)` - Verificar si celda está ocupada
- `clearCache()` - Limpiar cache de colisiones

**Características:**
- Cache automático con límite de 100 entradas
- Solo consulta partículas sólidas
- Optimizado para consultas frecuentes

### CelestialSystem (`celestial-system.js`)

Sistema celestial del frontend que calcula posiciones visuales del sol y la luna desde el estado autoritativo del backend.

**Responsabilidades:**
- Recibir estado celestial autoritativo del backend
- Calcular posiciones visuales del sol y la luna en coordenadas 3D
- Calcular radio del mundo desde el tamaño total (todos los bloques combinados)
- Proporcionar información útil (fase lunar, intensidad solar, hora del día)
- Interpolación suave entre actualizaciones del backend

**Dependencias:**
- `api/endpoints/celestial.js` - API para obtener estado celestial del backend
- `api/endpoints/bloques.js` - API para obtener tamaño del mundo completo

**Uso:**
```javascript
import { CelestialSystem } from './world/celestial-system.js';
import { BloquesApi } from './api/endpoints/bloques.js';

// Obtener tamaño del mundo completo
const worldSize = await bloquesApi.getWorldSize();

// Inicializar sistema celestial
const celestialSystem = new CelestialSystem(null, worldSize);

// Actualizar estado desde el backend
const state = await celestialApi.getState();
celestialSystem.update(state);

// Obtener posiciones visuales
const solPos = celestialSystem.getSunPosition(interpolationFactor);
const lunaPos = celestialSystem.getLunaPosition(interpolationFactor);

// Obtener información útil
const phase = celestialSystem.getLunaPhase();
const intensity = celestialSystem.getSunIntensity();
const isDay = celestialSystem.isDaytime();
const hour = celestialSystem.getCurrentHour();
```

**Métodos principales:**
- `update(newState)` - Actualizar estado celestial desde el backend
- `getSunPosition(interpolationFactor)` - Obtener posición visual del sol
- `getLunaPosition(interpolationFactor)` - Obtener posición visual de la luna
- `getLunaPhase()` - Obtener fase lunar (0.0 a 1.0)
- `getSunIntensity()` - Obtener intensidad solar (0.0 a 1.0)
- `isDaytime()` - Determinar si es de día
- `getCurrentHour()` - Obtener hora del día (0-24)
- `updateWorldRadius(worldSize)` - Actualizar radio del mundo

**Características:**
- El backend es autoritativo: el frontend solo renderiza
- Interpolación suave entre actualizaciones del backend
- Radio del mundo calculado desde todos los bloques combinados
- Soporta múltiples bloques: el sol/luna orbitan alrededor del mundo completo

### CelestialRenderer (`celestial-renderer.js`)

Renderizador de sol y luna en Three.js usando las posiciones calculadas por `CelestialSystem`.

**Responsabilidades:**
- Crear meshes del sol y la luna en Three.js
- Actualizar posiciones según `CelestialSystem`
- Actualizar apariencia de la luna según su fase
- Manejar el centro del mundo para posicionamiento correcto

**Dependencias:**
- `world/celestial-system.js` - Sistema celestial para obtener posiciones
- `three` - Three.js para renderizado 3D

**Uso:**
```javascript
import { CelestialRenderer } from './world/celestial-renderer.js';
import { CelestialSystem } from './world/celestial-system.js';

// Inicializar renderizador
const celestialRenderer = new CelestialRenderer(scene, celestialSystem);

// Actualizar en cada frame (en el loop de animación)
celestialRenderer.update(interpolationFactor);

// Limpiar al destruir
celestialRenderer.dispose();
```

**Métodos principales:**
- `update(interpolationFactor)` - Actualizar posición y apariencia del sol/luna
- `dispose()` - Remover meshes de la escena y liberar recursos

**Características:**
- Sol: esfera dorada emisiva (radio 20 unidades)
- Luna: esfera lavanda emisiva (radio 10 unidades)
- Fase lunar: ajusta intensidad emisiva según fase
- Posicionamiento: considera el centro del mundo completo

## Sincronización con Backend

El sistema celestial utiliza una arquitectura híbrida:

- **Backend (autoritativo):** Controla el tiempo del juego y calcula ángulos del sol/luna, fases lunares, y estado día/noche
- **Frontend (visualización):** Recibe el estado del backend y calcula posiciones visuales para renderizado en Three.js

**Flujo de sincronización:**
1. El frontend sincroniza con el backend periódicamente (cada 5 segundos por defecto)
2. El backend envía estado celestial completo (tiempo, ángulos, fases)
3. El frontend interpola suavemente entre actualizaciones para movimiento fluido
4. El renderizador y la iluminación se actualizan en cada frame

**Ejemplo de integración en `app.js`:**
```javascript
// Inicializar sistema celestial
const worldSize = await bloquesApi.getWorldSize();
this.celestialSystem = new CelestialSystem(null, worldSize);
this.celestialRenderer = new CelestialRenderer(scene, this.celestialSystem);

// Sincronizar estado inicial
await this.syncCelestialState();

// En el loop de animación:
// Sincronizar periódicamente
if (currentTime - this.lastCelestialSync >= this.celestialSyncInterval) {
    await this.syncCelestialState();
    this.lastCelestialSync = currentTime;
}

// Actualizar renderizador e iluminación
const interpolationFactor = this.celestialInterpolationTime / this.celestialSyncInterval;
this.celestialRenderer.update(interpolationFactor);
this.scene.lights.updateLighting(this.celestialSystem);
```

## ¿Por qué NO en `core/`?

Aunque estos servicios usan infraestructura de `core/`, **NO deben ir en `core/`** porque:

1. **Dependencias de dominio:** 
   - `camera-controller.js` tiene método `update(ecs)` que requiere acceso directo a ECS
   - `collision-detector.js` depende de `ParticlesApi` que consulta el sistema de terreno
   - `celestial-system.js` depende de `CelestialApi` y `BloquesApi` que consultan el backend
   - Si van en `core/`, `core/` dependería de `ecs/`, `terrain/` y `api/`, rompiendo la separación de capas

2. **Lógica de dominio específica:**
   - Lógica de seguir jugador, modos primera/tercera persona (lógica de juego)
   - Lógica de colisiones con partículas sólidas del terreno (lógica de juego)
   - Lógica de cálculo de posiciones celestiales y sincronización con backend (lógica de juego)

3. **Principio de dependencias:**
   - `core/` debe ser independiente de sistemas de dominio (ECS, terrain)
   - `core/` proporciona infraestructura base que otros sistemas usan
   - Servicios que integran múltiples sistemas pertenecen a una capa superior

## Referencias

- Ver análisis de arquitectura: `instructions/analysis/JDG-035-3-architecture-analysis_*.md`
- Ver `../core/README.md` para infraestructura base
- Ver `../ecs/README.md` para sistema ECS
- Ver `../terrain/README.md` para sistema de terreno
