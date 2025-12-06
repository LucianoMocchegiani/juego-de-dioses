# Análisis de Arquitectura - Sistema de Personaje Jugable (JDG-010)

## Situación Actual

### Frontend

**Estructura actual:**
```
frontend/src/
├── main.js                    # Punto de entrada
├── app.js                     # Aplicación principal (orquestación)
├── core/                      # Núcleo de Three.js
│   ├── scene.js              # Escena base
│   ├── camera.js             # Gestión de cámara (PerspectiveCamera)
│   ├── controls.js           # Controles de cámara (OrbitControls wrapper)
│   ├── renderer.js           # Renderizador WebGL
│   ├── lights.js             # Gestión de luces
│   └── helpers.js            # Helpers (grid, axes)
├── renderers/                 # Sistema de renderizadores
│   ├── base-renderer.js      # Renderizador base abstracto
│   ├── particle-renderer.js  # Renderizador de partículas
│   └── geometries/           # Registry de geometrías
├── managers/                  # Gestores de alto nivel
│   ├── viewport-manager.js   # Gestión de viewport
│   ├── style-manager.js      # Gestión de estilos
│   ├── entity-manager.js     # Gestión de entidades
│   └── performance-manager.js # Gestión de performance
├── state/                     # Gestión de estado
│   ├── store.js              # Store centralizado
│   ├── actions.js            # Acciones
│   └── selectors.js          # Selectores
└── api/                       # Cliente API
    ├── client.js             # Cliente base
    └── endpoints/             # Endpoints específicos
```

**Problemas identificados:**

1. **Falta de sistema de input:** No existe ningún sistema para capturar eventos de teclado o mouse para controlar entidades. Solo existe OrbitControls para la cámara.

2. **Falta de sistema de física:** No hay sistema de gravedad, colisiones, ni detección de suelo. El mundo es estático y solo se renderiza.

3. **Falta de sistema de entidades dinámicas:** Solo se renderizan partículas estáticas. No hay entidades que se muevan, animen o interactúen con el mundo.

4. **Cámara fija:** La cámara usa OrbitControls y está fija en una posición. No hay sistema para que la cámara siga a una entidad.

5. **Falta de sistema de colisiones:** No hay forma de detectar si una posición está ocupada por partículas sólidas, lo cual es necesario para movimiento y física.

6. **Falta de sistema de animaciones:** No existe sistema para animar entidades (personajes, objetos, etc.).

7. **Loop de animación simple:** El loop actual solo actualiza OrbitControls y renderiza. No hay lugar para actualizar lógica de entidades, física, o input.

### Backend

**Estructura actual:**
```
backend/src/
├── api/routes/
│   ├── dimensions.py          # Endpoints de dimensiones
│   └── particles.py          # Endpoints de partículas (por viewport)
├── database/
│   └── ...                   # Sistema de creación de entidades
└── models/
    └── schemas.py            # Modelos Pydantic
```

**Problemas identificados:**

1. **Falta de endpoints para jugadores:** No hay endpoints para guardar/cargar posición del jugador, estado, inventario, etc.

2. **Falta de sistema de interacción:** No hay endpoints para modificar partículas (agarrar, golpear, construir, etc.).

3. **Viewport estático:** El viewport se calcula una vez al cargar. No hay sistema para actualizar el viewport dinámicamente cuando el jugador se mueve.

### Base de Datos

**Estructura actual:**
```
- dimensiones: Tabla de dimensiones
- particulas: Tabla de partículas (voxels)
- tipos_particulas: Tipos de partículas
- estados_materia: Estados de materia
- agrupaciones: Agrupaciones de partículas (entidades)
```

**Problemas identificados:**

1. **Falta de tabla de jugadores:** No existe tabla para almacenar información de jugadores (posición, estado, inventario, etc.).

2. **Falta de sistema de sesiones:** No hay forma de asociar un jugador con una sesión de juego.

## Necesidades Futuras

### Sistema de Personaje Jugable

**Requisitos inmediatos (JDG-010):**
- Personaje humano renderizado en Three.js
- Movimiento básico (WASD, correr, saltar, agacharse)
- Física simple (gravedad, colisiones con partículas)
- Acciones (golpear, agarrar)
- Cámara que sigue al personaje
- Animaciones básicas

**Requisitos futuros (escalabilidad):**
- Múltiples jugadores (multiplayer)
- NPCs (usarán sistema similar)
- Inventario y objetos
- Sistema de combate
- Construcción y modificación del mundo
- Sistema de habilidades y estadísticas
- Sistema de respawn
- Sistema de guardado/carga de partidas

### Requisitos de Escalabilidad

1. **Fácil agregar nuevos tipos de entidades:** El sistema debe permitir agregar NPCs, animales, vehículos, etc. sin reescribir código base.

2. **Reutilización de código:** Física, colisiones, animaciones, y renderizado deben ser compartidos entre diferentes tipos de entidades.

3. **Separación de responsabilidades:** Input, física, renderizado, animaciones, y lógica de juego deben estar separados.

4. **Extensibilidad:** El sistema debe permitir agregar nuevas acciones, habilidades, y comportamientos fácilmente.

5. **Mantenibilidad:** El código debe ser modular y fácil de entender y modificar.

6. **Performance:** El sistema debe ser eficiente y no afectar significativamente el FPS del renderizado de partículas.

7. **Sincronización:** El sistema debe estar preparado para futura sincronización en tiempo real (WebSockets) para multiplayer.

## Arquitectura Propuesta

### Frontend - Estructura Modular para Entidades

```
frontend/src/
├── entities/                   # Sistema de entidades
│   ├── base/                  # Clases base
│   │   ├── entity.js          # Clase base abstracta para todas las entidades
│   │   ├── physics-entity.js  # Clase base para entidades con física
│   │   └── renderable-entity.js # Clase base para entidades renderizables
│   ├── player/                # Personaje jugable
│   │   ├── player.js          # Clase principal del jugador
│   │   ├── player-controller.js # Controlador de input del jugador
│   │   ├── player-physics.js  # Física específica del jugador
│   │   ├── player-renderer.js # Renderizado del jugador
│   │   └── player-animations.js # Animaciones del jugador
│   └── npc/                    # NPCs (futuro)
│       └── ...
├── systems/                    # Sistemas de juego
│   ├── input-manager.js       # Gestor centralizado de input (teclado, mouse)
│   ├── physics-system.js      # Sistema de física (gravedad, colisiones)
│   ├── collision-detector.js  # Detección de colisiones con partículas
│   ├── animation-system.js    # Sistema de animaciones (AnimationMixer)
│   └── camera-controller.js  # Controlador de cámara (sigue entidades)
├── core/                       # (existente, modificado)
│   ├── camera.js              # Modificado: soporte para seguir entidades
│   └── controls.js            # Modificado: toggle entre OrbitControls y player controls
└── app.js                      # Modificado: integración de sistemas de entidades
```

### Jerarquía de Clases

```
Entity (abstracta)
├── RenderableEntity (abstracta)
│   ├── PhysicsEntity (abstracta)
│   │   ├── Player
│   │   ├── NPC (futuro)
│   │   └── Animal (futuro)
│   └── StaticEntity (futuro)
└── ParticleEntity (futuro, para partículas dinámicas)
```

**Responsabilidades:**

- **Entity:** Interfaz base, posición, estado, ID único
- **RenderableEntity:** Renderizado 3D, modelo, materiales
- **PhysicsEntity:** Física, gravedad, velocidad, colisiones
- **Player:** Lógica específica del jugador, input, acciones

### Arquitectura de Sistemas

**Sistema de Input (InputManager):**
```
InputManager
├── KeyboardHandler: Detecta teclas presionadas/sueltas
├── MouseHandler: Detecta clicks, movimiento del mouse
└── ActionMapper: Mapea inputs a acciones (configurable)
```

**Sistema de Física (PhysicsSystem):**
```
PhysicsSystem
├── Gravity: Aplica gravedad a entidades
├── CollisionDetector: Detecta colisiones con partículas
├── MovementResolver: Resuelve movimiento y colisiones
└── GroundDetector: Detecta si hay suelo debajo
```

**Sistema de Colisiones (CollisionDetector):**
```
CollisionDetector
├── ParticleQuery: Consulta partículas en área específica
├── SolidDetector: Detecta partículas sólidas
└── CollisionResolver: Resuelve colisiones y ajusta posición
```

**Sistema de Animaciones (AnimationSystem):**
```
AnimationSystem
├── AnimationMixer: Three.js AnimationMixer
├── AnimationController: Controla transiciones entre animaciones
└── AnimationStates: Estados de animación (idle, walk, run, jump, etc.)
```

**Sistema de Cámara (CameraController):**
```
CameraController
├── FollowCamera: Cámara que sigue a una entidad
├── FirstPersonCamera: Cámara en primera persona
├── ThirdPersonCamera: Cámara en tercera persona
└── CameraSmoothing: Suavizado de movimiento de cámara
```

## Patrones de Diseño a Usar

### 1. Component System (ECS - Entity Component System)

**Descripción:** Separar entidades en componentes reutilizables (física, renderizado, input, animaciones).

**Cómo se aplica:**
- Cada entidad tiene componentes (PhysicsComponent, RenderComponent, InputComponent, AnimationComponent)
- Los sistemas operan sobre componentes específicos
- Permite composición flexible de entidades

**Beneficios:**
- Reutilización de código
- Fácil agregar nuevas entidades combinando componentes
- Separación clara de responsabilidades

**Implementación:**
- **ECS desde el inicio:** Se implementará ECS completo desde el principio
- **Estructura base:** `ecs/manager.js` (ECSManager), `ecs/system.js` (System base)
- **Componentes:** Position, Physics, Render, Input (extensibles)
- **Sistemas:** InputSystem, PhysicsSystem, RenderSystem (extensibles)
- **Ventajas:** Base sólida y escalable desde el inicio, sin necesidad de migración futura

### 2. Strategy Pattern

**Descripción:** Diferentes estrategias para movimiento, física, animaciones.

**Cómo se aplica:**
- `MovementStrategy`: Diferentes tipos de movimiento (caminar, correr, volar, nadar)
- `PhysicsStrategy`: Diferentes tipos de física (terrestre, aérea, acuática)
- `AnimationStrategy`: Diferentes tipos de animaciones según estado

**Beneficios:**
- Fácil cambiar comportamiento sin modificar código base
- Extensible para nuevos tipos de movimiento/física

### 3. Observer Pattern

**Descripción:** Sistema de eventos para comunicación entre sistemas.

**Cómo se aplica:**
- Eventos: `onMove`, `onJump`, `onCollision`, `onAction`
- Sistemas se suscriben a eventos relevantes
- Desacopla sistemas entre sí

**Beneficios:**
- Bajo acoplamiento
- Fácil agregar nuevos listeners
- Permite logging, debugging, y efectos visuales

### 4. Factory Pattern

**Descripción:** Crear entidades de diferentes tipos.

**Cómo se aplica:**
- `EntityFactory`: Crea entidades según tipo (player, npc, animal)
- `ComponentFactory`: Crea componentes según tipo

**Beneficios:**
- Centraliza lógica de creación
- Fácil agregar nuevos tipos de entidades

### 5. State Pattern

**Descripción:** Estados de entidad (idle, walking, running, jumping, crouching).

**Cómo se aplica:**
- `EntityState`: Estado base
- `PlayerState`: Estados específicos del jugador
- `StateMachine`: Máquina de estados para transiciones

**Beneficios:**
- Control claro de estados y transiciones
- Fácil agregar nuevos estados
- Previene estados inválidos

### 6. Command Pattern

**Descripción:** Encapsular acciones como objetos.

**Cómo se aplica:**
- `ActionCommand`: Comando base
- `MoveCommand`, `JumpCommand`, `AttackCommand`, `GrabCommand`
- `CommandQueue`: Cola de comandos para ejecutar

**Beneficios:**
- Deshacer/rehacer acciones (futuro)
- Logging de acciones
- Ejecución diferida de acciones

## Beneficios de la Nueva Arquitectura

1. **Modularidad:** Cada sistema es independiente y puede desarrollarse/testearse por separado.

2. **Escalabilidad:** Fácil agregar nuevos tipos de entidades, acciones, y comportamientos sin modificar código existente.

3. **Mantenibilidad:** Código organizado y fácil de entender. Cambios localizados no afectan otros sistemas.

4. **Performance:** Sistemas optimizados independientemente. Posibilidad de optimizar colisiones, renderizado, y física por separado.

5. **Testabilidad:** Sistemas aislados son más fáciles de testear unitariamente.

6. **Extensibilidad:** Preparado para futuras features (multiplayer, NPCs, inventario, combate).

7. **Reutilización:** Componentes y sistemas pueden reutilizarse para diferentes tipos de entidades.

## Migración Propuesta

### Fase 1: Sistema ECS Base (MVP)

**Objetivo:** Crear estructura base del sistema ECS y entidad básica del jugador.

**Pasos:**
1. ✅ Crear estructura ECS (`ecs/manager.js`, `ecs/system.js`)
2. ✅ Crear componentes base (`Position`, `Physics`, `Render`, `Input`)
3. ✅ Crear sistemas base (`InputSystem`, `PhysicsSystem`, `RenderSystem`)
4. Crear `InputManager` para capturar teclado y mouse
5. Crear factory para crear entidad de jugador con todos los componentes
6. Integrar ECS en `app.js` y crear jugador
7. Crear renderizado básico del personaje (primitivo Three.js)

**Resultado:** Sistema ECS funcionando, jugador visible en la escena, sin movimiento aún.

### Fase 2: Sistema de Input y Movimiento Básico

**Objetivo:** Implementar movimiento básico del personaje.

**Pasos:**
1. Implementar `InputManager` completo (teclado, mouse, mapeo de acciones)
2. Conectar `InputManager` con `Player`
3. Implementar movimiento básico (WASD) sin física
4. Implementar orientación del personaje según dirección
5. Integrar en loop de animación

**Resultado:** Personaje se mueve con WASD, se orienta correctamente.

### Fase 3: Sistema de Física y Colisiones

**Objetivo:** Implementar física básica y colisiones con partículas.

**Pasos:**
1. Crear `CollisionDetector` para consultar partículas del viewport
2. Crear `PhysicsSystem` con gravedad simple
3. Implementar detección de suelo
4. Implementar detección de colisiones laterales
5. Integrar física en `Player`
6. Implementar sistema de saltos

**Resultado:** Personaje tiene gravedad, colisiones, y puede saltar.

### Fase 4: Acciones Avanzadas

**Objetivo:** Implementar correr, agacharse, golpear, agarrar.

**Pasos:**
1. Implementar correr (Shift + movimiento)
2. Implementar agacharse (Ctrl/C)
3. Implementar golpear (click izquierdo)
4. Implementar agarrar (click derecho/E)
5. Agregar feedback visual para acciones

**Resultado:** Todas las acciones básicas funcionan.

### Fase 5: Sistema de Cámara

**Objetivo:** Implementar cámara que sigue al personaje.

**Pasos:**
1. Crear `CameraController` con modo tercera persona
2. Integrar con `Player` para seguir posición
3. Implementar suavizado de movimiento de cámara
4. Deshabilitar OrbitControls cuando el jugador está activo
5. Agregar toggle entre modos de cámara (opcional)

**Resultado:** Cámara sigue al personaje suavemente.

### Fase 6: Sistema de Animaciones

**Objetivo:** Implementar animaciones básicas del personaje.

**Pasos:**
1. Crear `AnimationSystem` usando Three.js AnimationMixer
2. Crear estados de animación (idle, walk, run, jump, crouch)
3. Implementar transiciones entre estados
4. Conectar animaciones con estados del jugador
5. Agregar animaciones básicas (escalado, rotación, o modelos 3D)

**Resultado:** Personaje tiene animaciones básicas según estado.

### Fase 7: Optimización y Refinamiento

**Objetivo:** Optimizar rendimiento y mejorar experiencia.

**Pasos:**
1. Optimizar detección de colisiones (spatial partitioning, caching)
2. Optimizar renderizado del personaje
3. Ajustar parámetros de física (velocidades, gravedad, saltos)
4. Mejorar feedback visual (partículas al golpear, efectos)
5. Agregar límites del terreno (prevenir caída infinita)

**Resultado:** Sistema optimizado y pulido.

## Consideraciones Técnicas

### Frontend

1. **Renderizado:**
   - El personaje debe renderizarse en cada frame
   - Usar instancing si hay múltiples personajes (futuro)
   - Optimizar geometría del personaje (LOD si es necesario)

2. **Optimización:**
   - **Colisiones:** Solo verificar partículas en área cercana al personaje (radio de 2-3 celdas)
   - **Viewport dinámico:** Actualizar viewport cuando el personaje se mueve fuera del área actual
   - **Caching:** Cachear consultas de partículas para colisiones
   - **Spatial partitioning:** Usar grid espacial para colisiones (futuro)

3. **Extensibilidad:**
   - Preparar estructura para múltiples jugadores
   - Preparar para NPCs (usarán misma estructura base)
   - Preparar para sistema de inventario y objetos

4. **Performance:**
   - El sistema de colisiones debe ser O(1) o O(n) donde n es pequeño (solo partículas cercanas)
   - El sistema de física debe ejecutarse a 60 FPS sin problemas
   - El renderizado del personaje no debe afectar significativamente el FPS

5. **Loop de animación:**
   - Integrar actualización de entidades en el loop existente
   - Orden: Input → Física → Colisiones → Animaciones → Renderizado

### Backend (Futuro)

1. **Endpoints necesarios:**
   - `POST /api/players` - Crear jugador
   - `GET /api/players/{id}` - Obtener jugador
   - `PUT /api/players/{id}/position` - Actualizar posición
   - `POST /api/players/{id}/actions` - Ejecutar acción (golpear, agarrar)
   - `GET /api/particles/nearby` - Obtener partículas cercanas a posición

2. **Base de datos:**
   - Tabla `jugadores`: id, usuario_id, dimension_id, posicion_x, posicion_y, posicion_z, estado, inventario
   - Tabla `acciones_jugador`: id, jugador_id, tipo_accion, posicion, timestamp

3. **Sincronización:**
   - Preparar para WebSockets para sincronización en tiempo real
   - Sistema de eventos para notificar cambios a otros jugadores

### Testing

1. **Unit tests:**
   - Testear sistemas individuales (InputManager, PhysicsSystem, CollisionDetector)
   - Testear estados y transiciones

2. **Integration tests:**
   - Testear integración entre sistemas
   - Testear movimiento completo del personaje

3. **Performance tests:**
   - Medir FPS con personaje activo
   - Medir tiempo de detección de colisiones
   - Medir uso de memoria

## Ejemplo de Uso Futuro

### Crear y usar un jugador:

```javascript
// En app.js
import { Player } from './entities/player/player.js';
import { InputManager } from './systems/input-manager.js';
import { PhysicsSystem } from './systems/physics-system.js';
import { CameraController } from './systems/camera-controller.js';

// Inicializar sistemas
const inputManager = new InputManager();
const physicsSystem = new PhysicsSystem();
const collisionDetector = new CollisionDetector(particlesApi, viewportManager);

// Crear jugador
const player = new Player({
    position: { x: 80, y: 80, z: 1 }, // Posición inicial en celdas
    dimension: demoDimension,
    scene: scene.scene
});

// Conectar sistemas
player.setInputManager(inputManager);
player.setPhysicsSystem(physicsSystem);
player.setCollisionDetector(collisionDetector);

// Configurar cámara
const cameraController = new CameraController(scene.camera, player);
cameraController.setMode('third-person');

// En loop de animación
function animate() {
    requestAnimationFrame(animate);
    
    // 1. Actualizar input
    inputManager.update();
    
    // 2. Actualizar jugador (input, física, colisiones)
    player.update(deltaTime);
    
    // 3. Actualizar cámara
    cameraController.update();
    
    // 4. Renderizar
    renderer.render(scene, camera);
}
```

### Agregar un NPC (futuro):

```javascript
import { NPC } from './entities/npc/npc.js';

// Crear NPC (usa misma estructura base que Player)
const npc = new NPC({
    position: { x: 100, y: 100, z: 1 },
    ai: 'wander', // Tipo de IA
    scene: scene.scene
});

// NPC usa mismos sistemas (física, colisiones) pero con AI en lugar de input
npc.setPhysicsSystem(physicsSystem);
npc.setCollisionDetector(collisionDetector);
npc.setAISystem(aiSystem);
```

## Optimizaciones de Rendimiento

### 1. Sistema de Colisiones Optimizado

**Problema:** Verificar todas las partículas del viewport para colisiones es O(n) donde n puede ser muy grande (cientos de miles).

**Solución:**
- **Área de colisión limitada:** Solo verificar partículas en radio de 2-3 celdas alrededor del personaje
- **Caching:** Cachear resultados de consultas de partículas para colisiones
- **Spatial Grid:** Usar grid espacial para indexar partículas (futuro)
- **Lazy loading:** Solo cargar partículas de colisión cuando el personaje se mueve

**Implementación:**
```javascript
class CollisionDetector {
    constructor(particlesApi, cellSize) {
        this.particlesApi = particlesApi;
        this.cellSize = cellSize;
        this.collisionCache = new Map(); // Cache de partículas por área
    }
    
    async checkCollision(position, radius = 2) {
        // Calcular área de colisión
        const xMin = Math.floor(position.x - radius);
        const xMax = Math.floor(position.x + radius);
        const yMin = Math.floor(position.y - radius);
        const yMax = Math.floor(position.y + radius);
        const zMin = Math.floor(position.z - radius);
        const zMax = Math.floor(position.z + radius);
        
        // Verificar cache
        const cacheKey = `${xMin}-${xMax}-${yMin}-${yMax}-${zMin}-${zMax}`;
        if (this.collisionCache.has(cacheKey)) {
            return this.collisionCache.get(cacheKey);
        }
        
        // Consultar solo partículas en área pequeña
        const particles = await this.particlesApi.getParticles(
            dimensionId,
            { x_min: xMin, x_max: xMax, y_min: yMin, y_max: yMax, z_min: zMin, z_max: zMax }
        );
        
        // Filtrar solo partículas sólidas
        const solidParticles = particles.filter(p => p.estado_nombre === 'solido');
        
        // Cachear resultado
        this.collisionCache.set(cacheKey, solidParticles);
        
        return solidParticles;
    }
}
```

### 2. Viewport Dinámico

**Problema:** El viewport se calcula una vez al cargar. Si el personaje se mueve fuera del viewport, no se cargan nuevas partículas.

**Solución:**
- **Viewport dinámico:** Actualizar viewport cuando el personaje se acerca a los bordes
- **Precarga:** Precargar partículas en dirección de movimiento
- **Lazy loading:** Cargar partículas solo cuando son necesarias

**Implementación:**
```javascript
class DynamicViewportManager extends ViewportManager {
    constructor(maxCells, particlesApi) {
        super(maxCells);
        this.particlesApi = particlesApi;
        this.currentViewport = null;
        this.loadedChunks = new Set(); // Chunks ya cargados
    }
    
    updateViewport(playerPosition, dimension) {
        // Calcular viewport centrado en jugador
        const playerCellX = Math.floor(playerPosition.x);
        const playerCellY = Math.floor(playerPosition.y);
        
        // Calcular viewport dinámico
        const viewport = this.calculateViewportAroundPosition(
            playerCellX, playerCellY, dimension
        );
        
        // Si el viewport cambió significativamente, cargar nuevas partículas
        if (this.hasViewportChanged(viewport)) {
            this.loadViewport(viewport, dimension);
        }
        
        return viewport;
    }
}
```

### 3. Sistema de Física Optimizado

**Problema:** Física debe ejecutarse a 60 FPS sin afectar rendimiento.

**Solución:**
- **Fixed timestep:** Usar timestep fijo para física (independiente de FPS)
- **Interpolación:** Interpolar posición para renderizado suave
- **Simplificación:** Física simple sin motor externo inicialmente

**Implementación:**
```javascript
class PhysicsSystem {
    constructor() {
        this.fixedTimestep = 1/60; // 60 FPS
        this.accumulator = 0;
    }
    
    update(entities, deltaTime) {
        this.accumulator += deltaTime;
        
        // Ejecutar física con timestep fijo
        while (this.accumulator >= this.fixedTimestep) {
            for (const entity of entities) {
                if (entity.hasPhysics) {
                    this.applyGravity(entity, this.fixedTimestep);
                    this.updateVelocity(entity, this.fixedTimestep);
                    this.updatePosition(entity, this.fixedTimestep);
                }
            }
            this.accumulator -= this.fixedTimestep;
        }
        
        // Interpolar posición para renderizado suave
        const alpha = this.accumulator / this.fixedTimestep;
        for (const entity of entities) {
            entity.interpolatePosition(alpha);
        }
    }
}
```

### 4. Renderizado Optimizado del Personaje

**Problema:** Renderizar el personaje no debe afectar significativamente el FPS.

**Solución:**
- **Geometría simple:** Usar primitivos Three.js inicialmente (cilindro, esfera)
- **Instancing:** Si hay múltiples personajes, usar instancing
- **LOD:** Niveles de detalle según distancia (futuro)
- **Frustum culling:** Solo renderizar si está en frustum de cámara

**Implementación:**
```javascript
class PlayerRenderer {
    constructor(scene, cellSize) {
        this.scene = scene;
        this.cellSize = cellSize;
        this.mesh = null;
    }
    
    createMesh() {
        // Geometría simple para MVP
        const group = new THREE.Group();
        
        // Cuerpo (cilindro)
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.0, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        group.add(body);
        
        // Cabeza (esfera)
        const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBB3 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.25;
        group.add(head);
        
        return group;
    }
    
    update(position, rotation) {
        // Actualizar posición y rotación
        this.mesh.position.set(
            position.x * this.cellSize,
            position.z * this.cellSize,
            position.y * this.cellSize
        );
        this.mesh.rotation.y = rotation;
    }
}
```

## Conclusión

La arquitectura propuesta para el sistema de personaje jugable es **modular, escalable y mantenible**. Utiliza patrones de diseño establecidos (Component System, Strategy, Observer, Factory, State, Command) para crear un sistema flexible que puede extenderse fácilmente para futuras features.

**Puntos clave:**
- **Separación de responsabilidades:** Input, física, renderizado, animaciones están separados
- **Reutilización:** Componentes y sistemas pueden usarse para diferentes tipos de entidades
- **Performance:** Optimizaciones específicas para colisiones, viewport dinámico, y física
- **Extensibilidad:** Preparado para NPCs, multiplayer, inventario, combate, etc.

**Próximos pasos:**
1. Implementar Fase 1 (Sistema Base de Entidades)
2. Iterar sobre fases siguientes
3. Optimizar según métricas de performance
4. Extender para nuevas features según necesidades

Esta arquitectura proporciona una base sólida para el sistema de personaje jugable y futuras expansiones del juego.

