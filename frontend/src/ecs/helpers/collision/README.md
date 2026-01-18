# Helpers de Colisiones

Esta carpeta contiene helpers especializados para el sistema de colisiones del ECS. Estos helpers extraen responsabilidades específicas del `CollisionSystem` para mejorar legibilidad, mantenibilidad y testabilidad.

## Helpers Disponibles

### `collision-cache-manager.js` - CollisionCacheManager

**Responsabilidad:** Gestión de cache de colisiones por entidad, invalidación basada en movimiento y actualización de celdas ocupadas desde partículas cargadas.

**Métodos:**
- `updateLoadedCells(particles)` - Actualiza el mapa de celdas ocupadas desde partículas cargadas.
- `getOccupiedCells(entityId, position, collisionDetector, bloqueId)` - Obtiene celdas ocupadas (usa cache, cargadas o consulta).
- `invalidateCacheIfNeeded(entityId, position)` - Invalida cache si la entidad se movió significativamente.
- `updateLastPosition(entityId, position)` - Actualiza la última posición conocida de la entidad.
- `clearCache()` - Limpia el cache completo.
- `clearEntityCache(entityId)` - Limpia el cache de una entidad específica.
- `getLoadedOccupiedCells()` - Obtiene las celdas ocupadas cargadas.
- `setLoadedOccupiedCells(cells)` - Establece las celdas ocupadas cargadas.

**Dependencias:**
- `config/animation-constants.js` (ANIMATION_CONSTANTS)
- CollisionDetector (para consultas async de colisiones)

### `collision-detector-helper.js` - CollisionDetectorHelper

**Responsabilidad:** Detección de colisiones laterales (X/Y) y con suelo (Z), ajustando velocidad y posición.

**Métodos:**
- `checkLateralCollisions(position, physics, deltaTime, occupiedCells)` - Verifica colisiones laterales X/Y y ajusta velocidad.
- `checkGroundCollision(position, physics, occupiedCells, dimension)` - Verifica colisión con suelo Z y ajusta `isGrounded`/posición.

**Dependencias:**
- `config/animation-constants.js` (ANIMATION_CONSTANTS)
- CollisionDetector (para usar `isCellOccupied`)

### `liquid-detector.js` - LiquidDetector

**Responsabilidad:** Detección de líquidos en una posición dada basándose en partículas cargadas.

**Métodos:**
- `detectLiquidAtPosition(position, particles)` - Detecta si hay líquidos en la posición dada.

**Dependencias:**
- `config/animation-constants.js` (ANIMATION_CONSTANTS)

### `terrain-bounds-checker.js` - TerrainBoundsChecker

**Responsabilidad:** Verificación de límites del terreno y respawn si la entidad cae fuera.

**Métodos:**
- `checkAndApplyBounds(position, physics, dimension)` - Verifica y aplica límites del terreno, respawn si es necesario.

**Dependencias:**
- `config/animation-constants.js` (ANIMATION_CONSTANTS)

## Principios de Diseño

### Independencia del ECS

Los helpers **no dependen directamente del ECS**. Reciben componentes y datos como parámetros en lugar de buscarlos en el ECS. Esto los hace:

- **Testables:** Pueden probarse sin necesidad de un ECS completo
- **Reutilizables:** Pueden usarse fuera del contexto del ECS si es necesario
- **Desacoplados:** Cambios en el ECS no afectan directamente a los helpers

### Una Responsabilidad

Cada helper tiene una única responsabilidad clara:

- `CollisionCacheManager`: Solo gestiona cache y celdas ocupadas
- `CollisionDetectorHelper`: Solo detecta colisiones y ajusta física
- `LiquidDetector`: Solo detecta líquidos
- `TerrainBoundsChecker`: Solo verifica límites del terreno

### Modificación de Componentes

Los helpers pueden modificar componentes pasados como parámetros (por ejemplo, `physics` y `position` en `CollisionDetectorHelper`), ya que estos son objetos mutables que representan el estado del juego.

## Uso en CollisionSystem

El `CollisionSystem` actúa como orquestador que:

1. Instancia los helpers en el constructor
2. Delega operaciones específicas a los helpers apropiados
3. Mantiene la lógica de coordinación entre helpers y el ECS
4. Conserva métodos públicos como `setParticles()` y `detectLiquidAtPosition()` para compatibilidad

## Ejemplo de Uso

```javascript
// En CollisionSystem.update()
const occupiedCells = this.collisionCacheManager.getOccupiedCells(
    entityId,
    position,
    this.collisionDetector,
    this.bloqueId
);

this.collisionDetectorHelper.checkLateralCollisions(
    position,
    physics,
    deltaTime,
    occupiedCells
);

this.collisionDetectorHelper.checkGroundCollision(
    position,
    physics,
    occupiedCells,
    this.dimension
);

physics.isInWater = this.liquidDetector.detectLiquidAtPosition(
    position,
    this.particles
);
```

## Notas de Implementación

- **Cache:** El `CollisionCacheManager` maneja cache interno para optimizar consultas repetidas.
- **Invalidación:** El cache se invalida basándose en umbral de movimiento para balancear rendimiento y precisión.
- **Consultas Async:** Las consultas de colisiones pueden ser asíncronas, por lo que el cache puede estar vacío inicialmente.
- **Límites del Terreno:** El `TerrainBoundsChecker` maneja respawn automático si la entidad cae fuera del terreno.

## Testing

Los helpers son testables independientemente sin necesidad de un ECS completo. Pueden crearse instancias con mocks de dependencias (por ejemplo, `CollisionDetector`, `ANIMATION_CONSTANTS`).
