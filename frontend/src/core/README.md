# Módulo Core

Este módulo contiene la configuración base de Three.js, separada en responsabilidades claras.

## Estructura

```
core/
├── scene.js      # Escena base (configuración mínima)
├── camera.js     # Gestión de cámara
├── controls.js   # Controles de cámara (OrbitControls wrapper)
├── renderer.js   # Renderizador WebGL
├── lights.js      # Gestión de luces
└── helpers.js    # Helpers (grid, axes) con gestión dinámica
```

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

## Referencias

- Ver `frontend/src/README.md` para información general
- Ver análisis de arquitectura para más detalles

