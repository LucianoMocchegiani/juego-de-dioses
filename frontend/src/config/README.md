# Configuración Global

Este directorio contiene todos los archivos de configuración del juego, centralizados para facilitar su acceso y mantenimiento.

## Archivos de Configuración

### Animación y Combate
- **`animation-config.js`**: Define los estados de animación, prioridades, condiciones y transiciones.
- **`combo-config.js`**: Define las cadenas de combos y sus timings.
- **`input-combinations-config.js`**: Define combinaciones de teclas para acciones de combate (ej: Ctrl+Click).
- **`weapon-animations-config.js`**: Configuración específica de animaciones por tipo de arma.

### Input
- **`input-map-config.js`**: Mapeo de teclas físicas a acciones abstractas (ej: `moveForward` -> `KeyW`).

## Uso

Importar directamente desde este directorio:

```javascript
import { ANIMATION_STATES } from '../../config/animation-config.js';
import { INPUT_MAP } from '../../config/input-map-config.js';
```
