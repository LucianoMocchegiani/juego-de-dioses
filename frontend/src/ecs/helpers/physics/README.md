# Helpers de Física

Esta carpeta contiene helpers especializados para el sistema de física del ECS. Estos helpers extraen responsabilidades específicas del `PhysicsSystem` para mejorar legibilidad, mantenibilidad y testabilidad.

## Helpers Disponibles

### `physics-timestep-manager.js` - PhysicsTimestepManager

**Responsabilidad:** Gestión de timestep fijo y acumulador para ejecutar física con timestep fijo.

**Métodos:**
- `update(deltaTime, updateCallback)` - Actualiza con timestep fijo y ejecuta callback múltiples veces si es necesario.
- `getAccumulator()` - Obtiene el acumulador actual.
- `resetAccumulator()` - Resetea el acumulador.

**Dependencias:**
- Ninguna (recibe `fixedTimestep` como parámetro en constructor)

### `combat-movement-applier.js` - CombatMovementApplier

**Responsabilidad:** Aplicación de movimiento de acciones de combate basado en configuración.

**Métodos:**
- `applyCombatMovement(physics, input, combat, render, actionConfig)` - Aplica movimiento de combate si es necesario.

**Dependencias:**
- `config/combat-actions-config.js` (COMBAT_ACTIONS)

### `physics-friction-applier.js` - PhysicsFrictionApplier

**Responsabilidad:** Aplicación de fricción según el estado (vuelo, normal, bloqueado).

**Métodos:**
- `applyFriction(physics, shouldBlockNormalMovement)` - Aplica fricción según el estado.

**Dependencias:**
- Ninguna

### `physics-velocity-limiter.js` - PhysicsVelocityLimiter

**Responsabilidad:** Limitación de velocidad máxima según los límites configurados.

**Métodos:**
- `limitVelocity(physics)` - Limita velocidad según `maxVelocity`.

**Dependencias:**
- Ninguna

## Principios de Diseño

### Independencia del ECS

Los helpers **no dependen directamente del ECS**. Reciben componentes y datos como parámetros en lugar de buscarlos en el ECS. Esto los hace:

- **Testables:** Pueden probarse sin necesidad de un ECS completo
- **Reutilizables:** Pueden usarse fuera del contexto del ECS si es necesario
- **Desacoplados:** Cambios en el ECS no afectan directamente a los helpers

### Una Responsabilidad

Cada helper tiene una única responsabilidad clara:

- `PhysicsTimestepManager`: Solo maneja timestep fijo y acumulador
- `CombatMovementApplier`: Solo aplica movimiento de acciones de combate
- `PhysicsFrictionApplier`: Solo aplica fricción
- `PhysicsVelocityLimiter`: Solo limita velocidad máxima

### Modificación de Componentes

Los helpers pueden modificar componentes pasados como parámetros (por ejemplo, `physics` en `PhysicsFrictionApplier` y `PhysicsVelocityLimiter`), ya que estos son objetos mutables que representan el estado del juego.

## Uso en PhysicsSystem

El `PhysicsSystem` actúa como orquestador que:

1. Instancia los helpers en el constructor
2. Usa `PhysicsTimestepManager` para ejecutar física con timestep fijo
3. Delega operaciones específicas a los helpers apropiados
4. Mantiene lógica simple de saltos, gravedad y actualización de posición/velocidad

## Ejemplo de Uso

```javascript
// En PhysicsSystem.update()
this.timestepManager.update(deltaTime, (timestep) => {
    this.updatePhysics(timestep);
});

// En PhysicsSystem.updatePhysics()
this.combatMovementApplier.applyCombatMovement(physics, input, combat, render, actionConfig);
this.frictionApplier.applyFriction(physics, shouldBlockNormalMovement);
this.velocityLimiter.limitVelocity(physics);
```

## Notas de Implementación

- **Timestep Fijo:** El `PhysicsTimestepManager` maneja el acumulador interno y ejecuta el callback múltiples veces si es necesario para mantener física estable.
- **Movimiento de Combate:** El `CombatMovementApplier` calcula la dirección (input o cámara) y aplica impulso solo una vez usando el flag `movementApplied` en `render.mesh.userData`.
- **Fricción:** El `PhysicsFrictionApplier` maneja tres casos: vuelo (0.85 en todas direcciones), normal (horizontal según `groundFriction`/`airFriction`), y bloqueado (0.7 para transición suave).
- **Velocidad Máxima:** El `PhysicsVelocityLimiter` limita velocidad horizontal siempre, pero solo limita velocidad vertical si NO está volando (para permitir vuelo ilimitado hacia arriba).

## Testing

Los helpers son testables independientemente sin necesidad de un ECS completo. Pueden crearse instancias con mocks de dependencias (por ejemplo, `COMBAT_ACTIONS`, componentes de física, etc.).
