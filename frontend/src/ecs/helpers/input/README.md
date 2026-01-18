# Helpers de Input

Esta carpeta contiene helpers especializados para el sistema de input del ECS. Estos helpers extraen responsabilidades específicas del `InputSystem` para mejorar legibilidad, mantenibilidad y testabilidad.

## Helpers Disponibles

### `input-action-checker.js` - InputActionChecker

**Responsabilidad:** Verificación de acciones de input basadas en el mapa de input, manejando combinaciones de teclas, clicks de mouse y mapeo de acciones.

**Métodos:**
- `checkAction(actionName, input)` - Verifica si una acción está activa basada en INPUT_MAP, manejando combinaciones (Control+Click, Shift+Click, etc.), clicks simples y teclas normales.

**Dependencias:**
- `config/input-map-config.js` (INPUT_MAP)
- `config/animation-constants.js` (ANIMATION_CONSTANTS)
- InputManager (recibido en constructor)

### `movement-direction-calculator.js` - MovementDirectionCalculator

**Responsabilidad:** Cálculo de dirección de movimiento 2D (normal) y 3D (en vuelo) basada en input del jugador y rotación de la cámara.

**Métodos:**
- `calculateMovementDirection(input, physics, inputActionChecker, cameraRotation)` - Calcula dirección de movimiento normalizada basada en input y rotación de cámara.
- `calculateFlyingDirection(localX, localY, cameraRotation)` - Calcula dirección 3D para movimiento en vuelo.
- `calculateNormalDirection(localX, localY, cameraRotation)` - Calcula dirección 2D para movimiento normal.

**Dependencias:**
- `config/animation-constants.js` (ANIMATION_CONSTANTS)
- CameraController (opcional, recibido en constructor)
- InputActionChecker (para verificar acciones de movimiento)

### `jump-handler.js` - JumpHandler

**Responsabilidad:** Sistema de saltos (normal, doble salto) y activación de vuelo mediante triple salto consecutivo.

**Métodos:**
- `processJump(input, physics, currentTime)` - Procesa input de salto y actualiza estado de salto/vuelo, incluyendo contador de saltos consecutivos.

**Dependencias:**
- `config/input-map-config.js` (INPUT_MAP)
- InputManager (recibido en constructor)

### `combat-input-processor.js` - CombatInputProcessor

**Responsabilidad:** Procesamiento de inputs relacionados con combate: defensas (parry, dodge), ataques (attack, heavyAttack, chargedAttack, specialAttack) y acciones (grab).

**Métodos:**
- `processCombatInputs(input)` - Procesa todos los inputs de combate y actualiza flags en InputComponent.
- `processDefenses(input)` - Procesa inputs de defensas (parry, dodge).
- `processAttacks(input)` - Procesa inputs de ataques en orden de prioridad.
- `processActions(input)` - Procesa inputs de acciones (grab, etc.).

**Dependencias:**
- `config/input-map-config.js` (INPUT_MAP)
- InputManager (recibido en constructor)
- InputActionChecker (recibido en constructor, para verificar acciones)

## Principios de Diseño

1. **Independencia del ECS:** Los helpers reciben componentes como parámetros, NO buscan en el ECS directamente.
2. **Una responsabilidad:** Cada helper maneja una responsabilidad única y clara.
3. **Testabilidad:** Los helpers pueden testearse independientemente sin necesidad del ECS completo.
4. **Reutilización:** Los helpers pueden ser reutilizados por otros sistemas si es necesario.

## Uso

Los helpers son instanciados y usados por el `InputSystem`, que actúa como orquestador:

```javascript
// En InputSystem
constructor(inputManager, cameraController) {
    this.inputActionChecker = new InputActionChecker(inputManager, ANIMATION_CONSTANTS);
    this.movementDirectionCalculator = new MovementDirectionCalculator(cameraController, ANIMATION_CONSTANTS);
    this.jumpHandler = new JumpHandler(inputManager);
    this.combatInputProcessor = new CombatInputProcessor(inputManager, this.inputActionChecker);
}
```

## Notas

- Esta estructura fue creada como parte de JDG-059 para refactorizar `InputSystem` (385 líneas → ~180 líneas).
- Los helpers mantienen la misma funcionalidad que el código original, solo reorganizados para mejor legibilidad.
- `MovementDirectionCalculator` es el helper más complejo debido a la lógica 3D con rotación de cámara.
- `CombatInputProcessor` depende de `InputActionChecker` para verificar acciones.
- Para modificaciones futuras, trabajar en el helper específico en lugar del sistema completo.
