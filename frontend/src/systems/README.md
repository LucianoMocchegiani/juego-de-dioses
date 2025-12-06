# Módulo Systems

Este módulo contiene sistemas de juego que operan sobre entidades del ECS o proporcionan servicios globales.

## Estructura

```
systems/
├── input-manager.js        # Gestor centralizado de input (teclado, mouse)
├── collision-detector.js   # Detector de colisiones con partículas
└── camera-controller.js    # Controlador de cámara que sigue al jugador
```

## Componentes

### InputManager (`input-manager.js`)

Gestor centralizado de input que captura eventos de teclado y mouse.

**Responsabilidades:**
- Capturar eventos de teclado (keydown, keyup)
- Capturar eventos de mouse (mousedown, mouseup, mousemove)
- Proporcionar interfaz para verificar estado de teclas y botones
- Gestionar estados de frame (keysDown, keysUp)
- Prevenir comportamiento por defecto para teclas de juego

**Uso:**
```javascript
import { InputManager } from './systems/input-manager.js';

const inputManager = new InputManager();

// Verificar teclas
if (inputManager.isKeyPressed('KeyW')) {
    // Tecla W está presionada
}

if (inputManager.isKeyDown('Space')) {
    // Tecla Space fue presionada en este frame
}

// Verificar mouse
if (inputManager.isMouseButtonDown(0)) {
    // Click izquierdo en este frame
}

// Limpiar frame (llamar al final de cada frame)
inputManager.clearFrame();
```

**Métodos principales:**
- `isKeyPressed(keyCode)` - Verificar si una tecla está presionada
- `isKeyDown(keyCode)` - Verificar si una tecla fue presionada en este frame
- `isKeyUp(keyCode)` - Verificar si una tecla fue soltada en este frame
- `isMouseButtonPressed(button)` - Verificar si un botón del mouse está presionado
- `isMouseButtonDown(button)` - Verificar si un botón fue presionado en este frame
- `getMousePosition()` - Obtener posición del mouse
- `getMouseDelta()` - Obtener movimiento del mouse (delta)
- `clearFrame()` - Limpiar estados de frame
- `destroy()` - Destruir el input manager y remover listeners

**Códigos de teclas comunes:**
- `'KeyW'`, `'KeyA'`, `'KeyS'`, `'KeyD'` - Teclas WASD
- `'ArrowUp'`, `'ArrowDown'`, `'ArrowLeft'`, `'ArrowRight'` - Flechas
- `'Space'` - Espacio
- `'ShiftLeft'`, `'ShiftRight'` - Shift
- `'ControlLeft'`, `'ControlRight'` - Ctrl
- `'KeyC'`, `'KeyE'` - Teclas C y E

**Botones del mouse:**
- `0` - Click izquierdo
- `1` - Click medio
- `2` - Click derecho

### CollisionDetector (`collision-detector.js`)

Detector de colisiones con partículas sólidas del mundo.

**Responsabilidades:**
- Consultar partículas en área pequeña alrededor de una posición
- Filtrar solo partículas sólidas
- Crear mapa de celdas ocupadas
- Cachear resultados para optimización

**Uso:**
```javascript
import { CollisionDetector } from './systems/collision-detector.js';

const collisionDetector = new CollisionDetector(particlesApi, 0.25);

// Verificar colisiones
const occupiedCells = await collisionDetector.checkCollision(
    { x: 80, y: 80, z: 1 }, // Posición
    2,                       // Radio de búsqueda
    dimensionId              // ID de dimensión
);

// Verificar si una celda está ocupada
if (collisionDetector.isCellOccupied(occupiedCells, 80, 80, 0)) {
    // Celda ocupada
}
```

**Métodos principales:**
- `checkCollision(position, radius, dimensionId)` - Obtener celdas ocupadas en área
- `isCellOccupied(occupiedCells, x, y, z)` - Verificar si celda está ocupada
- `clearCache()` - Limpiar cache de colisiones

**Características:**
- Cache automático con límite de 100 entradas
- Solo consulta partículas sólidas
- Optimizado para consultas frecuentes

### CameraController (`camera-controller.js`)

Controlador de cámara que sigue a una entidad en modo tercera persona o primera persona.

**Responsabilidades:**
- Seguir a una entidad objetivo
- Posicionar cámara en modo tercera persona (detrás y arriba)
- Suavizado de movimiento de cámara
- Conversión correcta de coordenadas (celdas a metros)

**Uso:**
```javascript
import { CameraController } from './systems/camera-controller.js';

const cameraController = new CameraController(
    scene.camera,  // Objeto Camera del core
    scene,         // Objeto Scene3D del core
    0.25           // Tamaño de celda en metros
);

// Establecer entidad objetivo
cameraController.setTarget(playerId);

// Actualizar en cada frame
cameraController.update(ecs);
```

**Métodos principales:**
- `setTarget(entityId)` - Establecer entidad a seguir
- `setMode(mode)` - Establecer modo ('first-person' | 'third-person')
- `update(ecs)` - Actualizar posición de cámara

**Características:**
- Modo tercera persona con offset configurable
- Suavizado usando lerp para movimiento fluido
- Conversión automática de coordenadas

## Referencias

- Ver análisis de arquitectura: `instructions/analysis/JDG-010-architecture-analysis_2025-12-06_10-18-44.md`
- Ver action plan: `instructions/tasks/JDG-010-action-plan_2025-12-06_10-40-04.md`

