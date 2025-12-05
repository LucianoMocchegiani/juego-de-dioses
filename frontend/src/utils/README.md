# Módulo Utils

Este módulo contiene funciones de utilidad organizadas por tipo.

## Estructura

```
utils/
├── colors.js      # Utilidades de colores
├── geometry.js    # Utilidades de geometría
├── math.js        # Utilidades matemáticas
└── helpers.js     # Helpers generales
```

## Componentes

### Colors (`colors.js`)
Utilidades para manipulación de colores.

**Funciones:**
- `increaseBrightness(color, multiplier)`: Aumentar brillo de un color
- `parseColor(colorHex)`: Parsear color hexadecimal

### Geometry (`geometry.js`)
Utilidades para cálculos geométricos.

**Funciones:**
- `calculateBoundingBox(particles)`: Calcular bounding box de partículas
- `calculateCenter(particles)`: Calcular centro de partículas

### Math (`math.js`)
Utilidades matemáticas generales.

**Funciones:**
- `clamp(value, min, max)`: Limitar valor entre min y max
- `lerp(a, b, t)`: Interpolación lineal

### Helpers (`helpers.js`)
Helpers generales diversos.

**Funciones:**
- Funciones de utilidad general

## Uso

```javascript
import { increaseBrightness, parseColor } from './colors.js';
import { calculateBoundingBox } from './geometry.js';
import { clamp } from './math.js';

// Colores
const brighter = increaseBrightness(0x8B4513, 1.2);
const color = parseColor('#8B4513');

// Geometría
const bbox = calculateBoundingBox(particles);

// Math
const clamped = clamp(value, 0, 100);
```

## Referencias

- Ver `frontend/src/README.md` para información general

