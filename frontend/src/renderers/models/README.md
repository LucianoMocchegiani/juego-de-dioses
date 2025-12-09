# Sistema de Carga de Modelos 3D

Este módulo proporciona un sistema completo para cargar, cachear y renderizar modelos 3D (GLTF/GLB) en Three.js.

## Estructura

```
models/
├── __init__.js              # Exports principales
├── model-loader.js          # Loader de modelos (Factory pattern)
├── model-cache.js           # Cache de modelos (Registry + Singleton)
├── model-utils.js           # Utilidades de carga y transformación
├── bones-utils.js           # Utilidades para bones/esqueleto (JDG-014, JDG-015)
├── vertex-groups-utils.js   # DEPRECADO: Reemplazado por bones-utils.js
└── README.md                # Este archivo
```

## Componentes

### ModelLoader

Carga modelos 3D usando los loaders de Three.js. Usa Factory pattern para soportar múltiples formatos:

- **GLTFLoader**: Para archivos `.gltf` y `.glb`
- **OBJLoader**: Para archivos `.obj` (opcional, descomentado si se necesita)

**Uso:**
```javascript
import { ModelLoader } from './model-loader.js';

const loader = new ModelLoader();
const model = await loader.loadModel('/static/models/characters/humano.glb', 'glb');
```

### ModelCache

Cache de modelos cargados para evitar recargas innecesarias. Usa Singleton pattern para un cache global.

**Uso:**
```javascript
import { ModelCache } from './model-cache.js';

const cache = ModelCache.getInstance();
if (cache.has(url)) {
    const model = cache.get(url); // Retorna clon
} else {
    // Cargar modelo
    cache.set(url, model);
}
```

### loadModel3D (model-utils.js)

Función helper que carga un modelo desde la BD y aplica transformaciones (escala, offset, rotación).

**Uso:**
```javascript
import { loadModel3D } from './model-utils.js';

const modelo3d = {
    tipo: 'glb',
    ruta: 'characters/humano.glb',
    escala: 1.0,
    offset: { x: 0, y: 0, z: 0 },
    rotacion: { x: 0, y: 0, z: 0 }
};

const model = await loadModel3D(modelo3d, cellSize);
```

## Mapeo de Coordenadas

El sistema mapea coordenadas del juego a Three.js:

- **Juego**: X=izq/der, Y=adelante/atrás, Z=arriba/abajo
- **Three.js**: X=izq/der, Y=arriba/abajo, Z=adelante/atrás

Por lo tanto:
- `offset.x` → `position.x` (igual)
- `offset.y` → `position.z` (Y del juego → Z de Three.js)
- `offset.z` → `position.y` (Z del juego → Y de Three.js)

Lo mismo aplica para rotaciones.

## Transformaciones

Las transformaciones se aplican en este orden:

1. **Escala**: `escala * cellSize` (aplica a todos los ejes)
2. **Offset**: Posición relativa en metros
3. **Rotación**: Rotación en grados (convertida a radianes)

## Cache

El cache almacena modelos originales (sin transformaciones). Al obtener un modelo del cache, se clona y se aplican las transformaciones. Esto permite:

- Reutilizar modelos entre múltiples personajes
- Aplicar diferentes transformaciones sin modificar el original
- Evitar recargas innecesarias

## Bones (Esqueleto)

Los modelos con animaciones incluyen un esqueleto (bones) que permite identificar partes específicas del cuerpo (ej: cabeza, brazos, piernas). Esto se usa tanto para animaciones como para el sistema de daño por partes (JDG-014).

**Modelo principal:** `Character_output.glb` incluye un esqueleto con bones mapeados a:
- `head` - Cabeza
- `torso` - Torso
- `left_arm` - Brazo izquierdo
- `right_arm` - Brazo derecho
- `left_leg` - Pierna izquierda
- `right_leg` - Pierna derecha

**Uso:**
```javascript
import { mapBonesToBodyParts, findBone, setBoneVisibility } from './bones-utils.js';

// Mapear bones a partes del cuerpo
const bodyPartsMap = mapBonesToBodyParts(model);

// Encontrar un bone específico
const headBone = findBone(model, 'head');

// Ocultar una parte (ej: brazo cortado)
setBoneVisibility(leftArmBone, false);
```

Los bones se mapean automáticamente y se almacenan en `mesh.userData.bodyPartsMap` cuando se carga un modelo con esqueleto.

## Referencias

- Three.js GLTFLoader: https://threejs.org/docs/#examples/en/loaders/GLTFLoader
- Three.js Object3D.clone(): https://threejs.org/docs/#api/en/core/Object3D.clone

