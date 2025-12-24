# Módulo World - Servicios de Integración del Mundo

Este módulo contiene servicios que integran múltiples sistemas para manejar aspectos del mundo virtual (vista, colisiones, interacciones).

## Estructura

```
world/
├── camera-controller.js     # Control de cámara que sigue al jugador
├── collision-detector.js    # Detección de colisiones con terreno
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

## ¿Por qué NO en `core/`?

Aunque estos servicios usan infraestructura de `core/`, **NO deben ir en `core/`** porque:

1. **Dependencias de dominio:** 
   - `camera-controller.js` tiene método `update(ecs)` que requiere acceso directo a ECS
   - `collision-detector.js` depende de `ParticlesApi` que consulta el sistema de terreno
   - Si van en `core/`, `core/` dependería de `ecs/` y `terrain/`, rompiendo la separación de capas

2. **Lógica de dominio específica:**
   - Lógica de seguir jugador, modos primera/tercera persona (lógica de juego)
   - Lógica de colisiones con partículas sólidas del terreno (lógica de juego)

3. **Principio de dependencias:**
   - `core/` debe ser independiente de sistemas de dominio (ECS, terrain)
   - `core/` proporciona infraestructura base que otros sistemas usan
   - Servicios que integran múltiples sistemas pertenecen a una capa superior

## Referencias

- Ver análisis de arquitectura: `instructions/analysis/JDG-035-3-architecture-analysis_*.md`
- Ver `../core/README.md` para infraestructura base
- Ver `../ecs/README.md` para sistema ECS
- Ver `../terrain/README.md` para sistema de terreno
