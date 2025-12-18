# Configuración Global

Este directorio contiene todos los archivos de configuración del juego, centralizados para facilitar su acceso y mantenimiento.

## Archivos de Configuración

### Animación y Combate
- **`animation-config.js`**: Define los estados de animación, prioridades, condiciones y transiciones (isOneShot, preventInterruption, animation, etc.). Las rutas de animaciones apuntan a la estructura organizada en `biped/` por categorías (sword, movement, idle, hit-reactions, etc.).
- **`combat-actions-config.js`**: Define acciones de combate con propiedades específicas (cooldown, movimiento, i-frames). **Referencia** estados de animación en `animation-config.js` para evitar duplicación.
- **`combat-constants.js`**: Constantes centralizadas para sistema de combate (thresholds, IDs de acciones, tipos de armas). Evita strings y valores mágicos hardcodeados.
- **`combo-config.js`**: Define las cadenas de combos y sus timings.
- **`input-combinations-config.js`**: Define combinaciones de teclas para acciones de combate (ej: Ctrl+Click). (DEPRECATED: siendo reemplazado por `combat-actions-config.js`)
- **`weapon-animations-config.js`**: Configuración específica de animaciones por tipo de arma.
- **`weapon-models-config.js`**: Configuración de modelos 3D de armas (rutas GLB, puntos de attachment, offsets, rotación, escala). Define cómo se adjuntan las armas al personaje usando bones del esqueleto.

### Constantes del Sistema
- **`ecs-constants.js`**: Constantes centralizadas para sistema ECS (nombres de componentes). Evita typos y facilita refactoring.
- **`animation-constants.js`**: Constantes centralizadas para sistema de animaciones, física, input, combos y colisiones. Centraliza valores mágicos y strings para evitar errores de tipeo.

### Input
- **`input-map-config.js`**: Mapeo de teclas físicas a acciones abstractas (ej: `moveForward` -> `KeyW`).

## Uso

Importar directamente desde este directorio:

```javascript
import { ANIMATION_STATES } from '../../config/animation-config.js';
import { INPUT_MAP } from '../../config/input-map-config.js';
```
