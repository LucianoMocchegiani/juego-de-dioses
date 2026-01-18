# Helpers de Combate

Esta carpeta contiene helpers especializados para el sistema de combate del ECS. Estos helpers extraen responsabilidades específicas del `CombatSystem` para mejorar legibilidad, mantenibilidad y testabilidad.

## Helpers Disponibles

### `combat-animation-state-cache.js` - CombatAnimationStateCache

**Responsabilidad:** Cache O(1) para lookup de animation states por ID.

**Métodos:**
- `getAnimationState(animationStateId)` - Obtiene un animation state por ID (O(1) lookup).
- `hasAnimationState(animationStateId)` - Verifica si existe un animation state con el ID dado.
- `getAvailableStateIds()` - Obtiene todos los IDs de animation states disponibles.

**Dependencias:**
- `config/animation-config.js` (ANIMATION_STATES)

### `combat-action-input-checker.js` - CombatActionInputChecker

**Responsabilidad:** Verificación de input de acción desde InputComponent.

**Métodos:**
- `checkActionInput(input, inputAction)` - Verifica si el input corresponde a la acción.

**Dependencias:**
- `config/combat-constants.js` (COMBAT_CONSTANTS)

### `combat-action-validator.js` - CombatActionValidator

**Responsabilidad:** Verificación de condiciones de ejecución (arma requerida, tipo de arma, etc.).

**Métodos:**
- `canExecuteAction(actionConfig, weapon, weaponType)` - Verifica si se puede ejecutar una acción.

**Dependencias:**
- `config/combat-constants.js` (COMBAT_CONSTANTS)

### `combat-action-config-applier.js` - CombatActionConfigApplier

**Responsabilidad:** Aplicación de configuración de acción y mapeo de animation states al CombatComponent.

**Métodos:**
- `applyActionConfig(combat, actionConfig)` - Aplica la configuración de acción al CombatComponent.

**Dependencias:**
- `debug/validator.js` (stateValidator)
- `debug/logger.js` (debugLogger)
- `config/combat-actions-config.js` (COMBAT_ACTIONS)
- `CombatAnimationStateCache` (para obtener animation states)

## Principios de Diseño

### Independencia del ECS

Los helpers **no dependen directamente del ECS**. Reciben componentes y datos como parámetros en lugar de buscarlos en el ECS. Esto los hace:

- **Testables:** Pueden probarse sin necesidad de un ECS completo
- **Reutilizables:** Pueden usarse fuera del contexto del ECS si es necesario
- **Desacoplados:** Cambios en el ECS no afectan directamente a los helpers

### Una Responsabilidad

Cada helper tiene una única responsabilidad clara:

- `CombatAnimationStateCache`: Solo maneja cache de animation states
- `CombatActionInputChecker`: Solo verifica input de acción
- `CombatActionValidator`: Solo valida condiciones de ejecución
- `CombatActionConfigApplier`: Solo aplica configuración de acción

### Modificación de Componentes

Los helpers pueden modificar componentes pasados como parámetros (por ejemplo, `combat` en `CombatActionConfigApplier`), ya que estos son objetos mutables que representan el estado del juego.

## Uso en CombatSystem

El `CombatSystem` actúa como orquestador que:

1. Instancia los helpers en el constructor
2. Delega operaciones específicas a los helpers apropiados
3. Mantiene la lógica de coordinación (cooldowns, combo activo, tipo de arma)
4. Conserva logging y eventos de debug en el lugar apropiado

## Ejemplo de Uso

```javascript
// En CombatSystem.update()
const wantsAction = this.actionInputChecker.checkActionInput(input, actionConfig.inputAction);

const canExecute = this.actionValidator.canExecuteAction(actionConfig, weapon, weaponType);

if (wantsAction && canExecute && !combat.isOnCooldown(actionId)) {
    combat.startAction(actionId);
    this.actionConfigApplier.applyActionConfig(combat, actionConfig);
    // ...
}
```

## Notas de Implementación

- **Cache:** El `CombatAnimationStateCache` maneja cache interno para lookup O(1) de animation states, crítico para rendimiento.
- **Validación:** El `CombatActionValidator` verifica condiciones como arma requerida (parry) o tipo de arma específico (special_attack requiere espada).
- **Configuración:** El `CombatActionConfigApplier` valida acciones usando `stateValidator`, obtiene animation states del cache, y aplica propiedades al CombatComponent.
- **Logging:** El `CombatActionConfigApplier` mantiene logging para debugging y diagnóstico.

## Testing

Los helpers son testables independientemente sin necesidad de un ECS completo. Pueden crearse instancias con mocks de dependencias (por ejemplo, `ANIMATION_STATES`, `COMBAT_CONSTANTS`, `COMBAT_ACTIONS`).
