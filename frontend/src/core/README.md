# Módulo Core

Este módulo contiene la configuración base de Three.js, separada en responsabilidades claras.

## Estructura

```
core/
├── scene.js              # Escena base (configuración mínima)
├── camera.js             # Gestión de cámara
├── controls.js           # Controles de cámara (OrbitControls wrapper)
├── renderer.js           # Renderizador WebGL
├── lights.js             # Gestión de luces
├── helpers.js            # Helpers (grid, axes) con gestión dinámica
│
├── geometries/           # Registry de geometrías (compartido)
│   └── registry.js       # Registry de geometrías (box, sphere, etc.)
│
├── renderers/            # Renderizadores base
│   └── base-renderer.js  # Clase base abstracta
│
├── performance/          # Gestión de rendimiento
│   └── performance-manager.js
│
└── input/                # Input centralizado
    └── input-manager.js
```

**Nota:** Este módulo agrupa toda la infraestructura base compartida. Fue expandido como parte de la refactorización JDG-035-3 para incluir geometrías, renderers base, performance e input que anteriormente estaban dispersos en otros módulos.

## Componentes

### Scene (`scene.js`)
Escena base de Three.js con configuración mínima.

**Responsabilidades:**
- Crear y gestionar la escena Three.js
- Coordinar módulos core (cámara, controles, renderizador, luces, helpers)

### Camera (`camera.js`)
Gestión de cámara PerspectiveCamera.

**Responsabilidades:**
- Crear y configurar cámara
- Actualizar aspect ratio en resize
- Posicionar y orientar cámara
- Exponer frustum para frustum culling
- Tracking de movimiento de cámara

**Métodos principales:**
- `getFrustum()`: Obtener frustum de la cámara para frustum culling
- `hasCameraMoved(lastMatrix)`: Verificar si la cámara se movió
- `getMatrixWorldInverse()`: Obtener matriz world inverse actual

### Controls (`controls.js`)
Wrapper para OrbitControls.

**Responsabilidades:**
- Configurar controles de cámara
- Actualizar controles en cada frame
- Gestionar límites de distancia y damping

### Renderer (`renderer.js`)
Renderizador WebGL.

**Responsabilidades:**
- Crear y configurar renderizador WebGL
- Gestionar tamaño del canvas
- Renderizar escena

### Lights (`lights.js`)
Gestión de luces de la escena.

**Responsabilidades:**
- Crear luz ambiente
- Crear luz direccional
- Configurar posiciones e intensidades

### Helpers (`helpers.js`)
Helpers visuales (grid, axes) con gestión dinámica.

**Responsabilidades:**
- Crear y actualizar GridHelper según tamaño del terreno
- Crear y actualizar AxesHelper según tamaño del terreno
- Posicionar helpers correctamente

## Uso

```javascript
import { Scene3D, Camera, Controls, Renderer, Lights, Helpers } from './core/index.js';

// Crear componentes
const scene = new Scene3D(container);
const camera = new Camera(container);
const controls = new Controls(camera.camera, container);
const renderer = new Renderer(container);
const lights = new Lights();
const helpers = new Helpers();

// Configurar
lights.setup(scene.scene);
helpers.update(scene.scene, anchoMetros, altoMetros);

// Renderizar
function animate() {
    controls.update();
    renderer.render(scene.scene, camera.camera);
    requestAnimationFrame(animate);
}
```

## Submódulos

### Geometries (`geometries/`)
Registry de geometrías compartido usado por terrain y otros sistemas.

**Ver:** `geometries/registry.js` para más detalles.

### Renderers (`renderers/`)
Renderizadores base abstractos.

**Ver:** `renderers/base-renderer.js` y `geometries/registry.js` para más detalles.

### Performance (`performance/`)
Gestión de métricas de rendimiento globales.

**Ver:** `performance/performance-manager.js` para más detalles.

### Input (`input/`)
Input centralizado usado por app y ECS.

**Ver:** `input/input-manager.js` para más detalles.

## Referencias

- Ver `frontend/src/README.md` para información general
- Ver análisis de arquitectura JDG-035-3 para más detalles sobre la reorganización

