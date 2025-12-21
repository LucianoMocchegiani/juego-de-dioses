# Módulo Utils

Este módulo contiene funciones de utilidad organizadas por tipo.

## Estructura

```
utils/
├── colors.js              # Utilidades de colores
├── geometry.js            # Utilidades de geometría
├── math.js                # Utilidades matemáticas
├── helpers.js             # Helpers generales
├── config.js              # Configuración de utilidades
├── weapon-attachment.js   # Utilidades para adjuntar armas al personaje
└── weapon-utils.js        # Utilidades para equipar/desequipar armas (testing)
```

**Nota**: `culling.js` y `sorting.js` fueron migrados a `terrain/utils/` como parte de la refactorización JDG-035-2.

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

### Culling (migrado a `terrain/utils/culling.js`)
Utilidades para frustum culling de partículas.

**Nota**: Este módulo fue migrado a `terrain/utils/culling.js` como parte de JDG-035-2. Ver `../terrain/README.md` para más información.

**Funciones:**
- `frustumCull(particles, camera, cellSize)`: Filtrar partículas visibles usando frustum culling
- `FrustumCache`: Clase para cachear resultados de frustum culling

**Clases:**
- `FrustumCache`: Cache de frustum para evitar recalcular si cámara no se mueve

### Sorting (migrado a `terrain/utils/sorting.js`)
Utilidades de ordenamiento optimizado para partículas.

**Nota**: Este módulo fue migrado a `terrain/utils/sorting.js` como parte de JDG-035-2. Ver `../terrain/README.md` para más información.

### Weapon Attachment (`weapon-attachment.js`)
Utilidades para adjuntar armas al personaje usando bones del esqueleto.

**Funciones:**
- `attachWeaponToCharacter(weaponModel, characterMesh, attachmentConfig)`: Adjuntar arma al personaje usando un bone del esqueleto
- `detachWeaponFromCharacter(weaponModel)`: Desadjuntar arma del personaje

**Requisitos:**
- El personaje debe tener esqueleto (skeleton) para que el attachment funcione
- Los bones disponibles incluyen: `RightHand`, `LeftHand`, `Spine`, etc.

### Weapon Utils (`weapon-utils.js`)
Utilidades para equipar/desequipar armas durante desarrollo y testing. Útil para probar diferentes armas desde la consola del navegador.

**Funciones:**
- `equipWeapon(ecs, entityId, weaponType)`: Equipar o desequipar arma a una entidad
- `getEquippedWeapon(ecs, entityId)`: Obtener tipo de arma equipada
- `listAvailableWeapons()`: Listar todos los tipos de armas disponibles

**Uso desde consola:**
```javascript
// Equipar espada al jugador
equipWeapon(app.ecs, app.playerId, 'sword');

// Equipar hacha
equipWeapon(app.ecs, app.playerId, 'axe');

// Desequipar arma
equipWeapon(app.ecs, app.playerId, null);

// Ver arma equipada
getEquippedWeapon(app.ecs, app.playerId);

// Listar armas disponibles
listAvailableWeapons();
```

**Notas:**
- El `WeaponEquipSystem` se encarga automáticamente de cargar y visualizar el arma
- Los tipos de arma deben existir en `WEAPON_MODELS` para funcionar

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

// Nota: Para culling y sorting de partículas de terreno, usar terrain/utils/
// Ver: ../terrain/README.md

// Weapon Attachment
import { attachWeaponToCharacter, detachWeaponFromCharacter } from './weapon-attachment.js';
attachWeaponToCharacter(swordModel, characterMesh, {
    point: 'RightHand',
    offset: { x: 0.05, y: 0, z: 0.1 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1.0
});

// Weapon Utils (testing)
import { equipWeapon, getEquippedWeapon, listAvailableWeapons } from './weapon-utils.js';
equipWeapon(ecs, playerId, 'sword');
const currentWeapon = getEquippedWeapon(ecs, playerId);
const availableWeapons = listAvailableWeapons();
```

## Referencias

- Ver `frontend/src/README.md` para información general

