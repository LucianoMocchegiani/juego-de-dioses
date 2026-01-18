# Helpers de Animación

Esta carpeta contiene helpers especializados para el sistema de animaciones del ECS. Estos helpers extraen responsabilidades específicas del `AnimationMixerSystem` para mejorar legibilidad, mantenibilidad y testabilidad.

## Helpers Disponibles

### `animation-loader.js` - AnimationLoader

**Responsabilidad:** Carga de animaciones desde archivos GLB y gestión de cache.

**Métodos:**
- `loadAnimation(animationFile)` - Carga una animación desde un archivo GLB, usando cache si está disponible.

**Dependencias:**
- Three.js GLTFLoader
- `utils/config.js` (getBackendBaseUrl)
- `debug/logger.js` (debugLogger)

### `animation-resolver.js` - AnimationResolver

**Responsabilidad:** Resolución de nombres de animación según estado, dirección y prioridad (Combo > Combate > Normal).

**Métodos:**
- `getAnimationNameForState(stateId, input)` - Obtiene el nombre de animación para un estado, considerando direcciones (walk, crouch_walk, swim).
- `resolveAnimationName(stateId, combo, combat, input)` - Resuelve el nombre de animación según prioridad: Combo > Combate > Normal.

**Dependencias:**
- `config/animation-config.js` (ANIMATION_FILES, ANIMATION_STATES, ANIMATION_MIXER)
- `debug/logger.js` (debugLogger)

### `animation-player.js` - AnimationPlayer

**Responsabilidad:** Reproducción de animaciones, transiciones (fade in/out), detección de cambios direccionales y lógica de interrupción.

**Métodos:**
- `playAnimation(mixer, clips, state, mesh, stateConfigMap, combo, combat)` - Reproduce una animación según estado.
- `playAnimationByName(entityId, animationName, mixer, clips, mesh)` - Reproduce una animación directamente por nombre (para interfaces de prueba).

**Dependencias:**
- Three.js AnimationMixer
- `config/animation-config.js` (ANIMATION_MIXER)
- `config/animation-constants.js` (ANIMATION_CONSTANTS)
- `config/ecs-constants.js` (ECS_CONSTANTS)
- `config/combat-actions-config.js` (COMBAT_ACTIONS)

### `combat-animation-handler.js` - CombatAnimationHandler

**Responsabilidad:** Gestión de combate durante animaciones (i-frames, cleanup temprano y final).

**Métodos:**
- `updateCombatAction(combat, input, anim, mesh, action)` - Actualiza acciones de combate en progreso (i-frames, early cleanup).
- `cleanupFinishedCombatAction(finishedActionId, combat, input, anim, mesh)` - Limpia estado cuando termina una animación de combate.

**Dependencias:**
- `config/combat-actions-config.js` (COMBAT_ACTIONS)
- `config/combat-constants.js` (COMBAT_CONSTANTS)
- `config/animation-constants.js` (ANIMATION_CONSTANTS)

## Principios de Diseño

1. **Independencia del ECS:** Los helpers reciben componentes como parámetros, NO buscan en el ECS directamente.
2. **Una responsabilidad:** Cada helper maneja una responsabilidad única y clara.
3. **Testabilidad:** Los helpers pueden testearse independientemente sin necesidad del ECS completo.
4. **Reutilización:** Los helpers pueden ser reutilizados por otros sistemas si es necesario.

## Uso

Los helpers son instanciados y usados por el `AnimationMixerSystem`, que actúa como orquestador:

```javascript
// En AnimationMixerSystem
constructor() {
    this.animationLoader = new AnimationLoader();
    this.animationResolver = new AnimationResolver(this.stateConfigMap);
    this.animationPlayer = new AnimationPlayer(this.animationResolver, this.ecs);
    this.combatHandler = new CombatAnimationHandler();
}
```

## Notas

- Esta estructura fue creada como parte de JDG-057 para refactorizar `AnimationMixerSystem` (799 líneas → ~200-300 líneas).
- Los helpers mantienen la misma funcionalidad que el código original, solo reorganizados para mejor legibilidad.
- Para modificaciones futuras, trabajar en el helper específico en lugar del sistema completo.
