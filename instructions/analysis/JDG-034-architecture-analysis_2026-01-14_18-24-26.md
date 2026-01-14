# Análisis de Arquitectura - Bloqueo de Movimiento WASD Durante Animaciones de Habilidades (JDG-034)

## Situación Actual

### Frontend

**Estructura actual:**

```
frontend/src/ecs/
├── systems/
│   ├── input-system.js          # Calcula moveDirection siempre, sin verificar activeAction
│   ├── physics-system.js        # Aplica aceleración normal siempre, excepto acciones con hasMovement
│   ├── combat-system.js         # Maneja activeAction y previene nuevos inputs durante animación
│   └── animation-mixer-system.js # Detecta fin de animación y llama combat.endAction()
├── components/
│   ├── input.js                 # Almacena moveDirection calculado
│   ├── physics.js               # Almacena aceleración y velocidad
│   └── combat.js                # Almacena activeAction y estado de combate
└── config/
    └── combat-actions-config.js  # Define hasMovement para cada acción
```

**Flujo actual de movimiento:**

1. **InputSystem.update()** (prioridad 0):
   - Lee teclas WASD del InputManager
   - Calcula `input.moveDirection` basado en teclas presionadas
   - NO verifica si hay `combat.activeAction` activa
   - Aplica aceleración a `physics.acceleration` basado en `moveDirection`

2. **CombatSystem.update()** (prioridad 1):
   - Verifica si hay `combat.activeAction` activa
   - Si hay acción activa, NO procesa nuevos inputs (previene nuevas acciones)
   - Pero NO bloquea el movimiento WASD

3. **PhysicsSystem.updatePhysics()** (prioridad 1):
   - Aplica movimiento de acciones de combate si `combat.activeAction` existe y `hasMovement: true`
   - Aplica aceleración normal basada en `input.moveDirection` (líneas 244-249)
   - NO verifica si hay acción activa sin movimiento antes de aplicar aceleración normal

**Problemas identificados:**

1. **InputSystem no considera acciones activas**: 
   - Calcula `moveDirection` siempre, independientemente de si hay una acción de combate activa
   - Aplica aceleración a física siempre que hay input WASD, incluso durante animaciones

2. **PhysicsSystem aplica movimiento normal durante acciones**:
   - Aplica aceleración normal basada en `input.moveDirection` incluso cuando hay `combat.activeAction` activa
   - Solo verifica `hasMovement: true` para aplicar movimiento de la acción, pero no bloquea movimiento normal

3. **Falta de coordinación entre sistemas**:
   - InputSystem y PhysicsSystem no consultan el estado de `combat.activeAction` antes de procesar movimiento
   - No hay verificación centralizada de si el movimiento debe estar bloqueado

4. **Inconsistencia con diseño de combate**:
   - Las acciones con `preventInterruption` están diseñadas para no poder ser interrumpidas
   - Pero el movimiento permite evadir o reposicionarse, lo cual es una forma de interrupción

### Base de Datos

No aplica - este es un cambio puramente de frontend.

## Necesidades Futuras

### Requisitos de la Solución

1. **Bloqueo condicional de movimiento**: El movimiento debe bloquearse solo cuando:
   - Hay `combat.activeAction` activa
   - La acción NO tiene `hasMovement: true`

2. **Preservar movimiento de acciones**: Las acciones con `hasMovement: true` (como dodge) deben seguir funcionando correctamente

3. **Liberación inmediata**: El bloqueo debe liberarse inmediatamente cuando la animación termina (`combat.activeAction` es null)

4. **No romper funcionalidad existente**: No debe afectar movimiento normal cuando no hay acciones activas

5. **Performance**: La verificación debe ser eficiente y no afectar el rendimiento

## Arquitectura Propuesta

### Solución: Verificación Condicional en InputSystem y PhysicsSystem

**Principio**: Ambos sistemas deben verificar el estado de `combat.activeAction` antes de procesar movimiento normal.

### Flujo Propuesto

```
1. InputSystem.update():
   ├── Obtener combat component
   ├── Si combat.activeAction existe:
   │   ├── Obtener actionConfig de COMBAT_ACTIONS[combat.activeAction]
   │   ├── Si actionConfig.hasMovement === false o no existe:
   │   │   └── NO calcular moveDirection (dejarlo en 0)
   │   └── Si actionConfig.hasMovement === true:
   │       └── Calcular moveDirection normalmente (para dodge, etc.)
   └── Si NO hay activeAction:
       └── Calcular moveDirection normalmente

2. PhysicsSystem.updatePhysics():
   ├── Obtener combat component
   ├── Si combat.activeAction existe:
   │   ├── Obtener actionConfig de COMBAT_ACTIONS[combat.activeAction]
   │   ├── Si actionConfig.hasMovement === false o no existe:
   │   │   └── NO aplicar aceleración normal basada en input.moveDirection
   │   └── Si actionConfig.hasMovement === true:
   │       └── Aplicar movimiento según configuración de acción (ya implementado)
   └── Si NO hay activeAction:
       └── Aplicar aceleración normal basada en input.moveDirection
```

### Cambios en InputSystem

**Ubicación**: `frontend/src/ecs/systems/input-system.js`

**Cambio propuesto**:

```javascript
update(_deltaTime) {
    const entities = this.getEntities();

    for (const entityId of entities) {
        const input = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.INPUT);
        const physics = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.PHYSICS);
        const combat = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.COMBAT);

        if (!input || !physics) continue;

        // ... código existente de limpieza y actualización de teclas ...

        // Verificar si hay acción activa que bloquea movimiento
        let shouldBlockMovement = false;
        if (combat && combat.activeAction) {
            const actionConfig = COMBAT_ACTIONS[combat.activeAction];
            // Bloquear movimiento si la acción NO tiene hasMovement: true
            if (!actionConfig || !actionConfig.hasMovement) {
                shouldBlockMovement = true;
            }
        }

        // Calcular dirección de movimiento solo si no está bloqueado
        if (!shouldBlockMovement) {
            // ... código existente de cálculo de moveDirection ...
        } else {
            // Bloquear movimiento: dejar moveDirection en 0
            input.moveDirection.x = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;
            input.moveDirection.y = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;
            if (!physics.isFlying) {
                input.moveDirection.z = ANIMATION_CONSTANTS.INPUT.DIRECTION.NONE;
            } else {
                input.moveDirection.z = 0;
            }
        }

        // ... resto del código existente ...
    }
}
```

### Cambios en PhysicsSystem

**Ubicación**: `frontend/src/ecs/systems/physics-system.js`

**Cambio propuesto**:

```javascript
updatePhysics(timestep) {
    const entities = this.getEntities();
    
    for (const entityId of entities) {
        const physics = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.PHYSICS);
        const position = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.POSITION);
        const input = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.INPUT);
        const combat = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.COMBAT);
        
        if (!physics || !position) continue;
        
        // ... código existente de salto y vuelo ...
        
        // Aplicar movimiento de acciones de combate (ya existe)
        if (input && combat && combat.activeAction) {
            const actionConfig = COMBAT_ACTIONS[combat.activeAction];
            
            if (actionConfig && actionConfig.hasMovement) {
                // ... código existente de movimiento de acción ...
            }
        }
        
        // Verificar si debemos bloquear movimiento normal
        let shouldBlockNormalMovement = false;
        if (combat && combat.activeAction) {
            const actionConfig = COMBAT_ACTIONS[combat.activeAction];
            // Bloquear movimiento normal si la acción NO tiene hasMovement: true
            if (!actionConfig || !actionConfig.hasMovement) {
                shouldBlockNormalMovement = true;
            }
        }
        
        // ... código existente de gravedad ...
        
        // Aplicar aceleración normal solo si no está bloqueado
        if (!shouldBlockNormalMovement) {
            // Aplicar movimiento a física (código existente líneas 233-249)
            if (physics.isFlying) {
                if (input.moveDirection.x !== 0 || input.moveDirection.y !== 0 || input.moveDirection.z !== 0) {
                    const speed = physics.flySpeed;
                    physics.acceleration.x = input.moveDirection.x * speed;
                    physics.acceleration.y = input.moveDirection.y * speed;
                    physics.acceleration.z = input.moveDirection.z * speed;
                }
            } else if (input && (input.moveDirection.x !== 0 || input.moveDirection.y !== 0)) {
                const speed = input.isRunning ? ANIMATION_CONSTANTS.INPUT.RUN_SPEED : ANIMATION_CONSTANTS.INPUT.WALK_SPEED;
                physics.acceleration.x = input.moveDirection.x * speed;
                physics.acceleration.y = input.moveDirection.y * speed;
            }
        }
        // Si está bloqueado, no aplicar aceleración normal (ya está reseteada arriba)
        
        // ... resto del código existente (gravedad, fricción, límites, posición) ...
    }
}
```

## Patrones de Diseño a Usar

### 1. Guard Clause Pattern
- **Descripción**: Verificar condiciones temprano y retornar/saltar si no se cumplen
- **Cómo se aplica**: Verificar `combat.activeAction` y `hasMovement` antes de procesar movimiento
- **Beneficios**: Código más claro, reduce anidación, fácil de entender

### 2. Configuration Pattern (ya existe)
- **Descripción**: Usar configuración externa para controlar comportamiento
- **Cómo se aplica**: `COMBAT_ACTIONS[actionId].hasMovement` determina si se permite movimiento
- **Beneficios**: Fácil agregar nuevas acciones, fácil cambiar comportamiento sin tocar código

### 3. Separation of Concerns
- **Descripción**: Cada sistema tiene responsabilidades claras
- **Cómo se aplica**: 
  - InputSystem: Calcula dirección de movimiento
  - PhysicsSystem: Aplica física y movimiento
  - CombatSystem: Maneja lógica de combate
- **Beneficios**: Mantenibilidad, testabilidad, claridad

## Beneficios de la Nueva Arquitectura

1. **Consistencia con diseño de combate**: Las acciones con `preventInterruption` ahora realmente previenen interrupciones, incluyendo movimiento
2. **Balance mejorado**: Los jugadores no pueden reposicionarse durante habilidades que requieren compromiso
3. **Inmersión mejorada**: El comportamiento visual coincide con la mecánica de juego
4. **Extensibilidad**: Fácil agregar nuevas acciones con diferentes comportamientos de movimiento
5. **Mantenibilidad**: Lógica clara y centralizada en configuración
6. **Performance**: Verificación simple y eficiente, sin impacto significativo

## Migración Propuesta

### Fase 1: Modificar InputSystem

**Paso 1**: Agregar verificación de `combat.activeAction` en `InputSystem.update()`
- Obtener componente `Combat` del ECS
- Verificar si `combat.activeAction` existe
- Si existe, obtener `actionConfig` de `COMBAT_ACTIONS`
- Si `actionConfig.hasMovement === false` o no existe, bloquear cálculo de `moveDirection`

**Paso 2**: Modificar cálculo de `moveDirection`
- Envolver cálculo de `moveDirection` en condición `if (!shouldBlockMovement)`
- Si está bloqueado, establecer `moveDirection` a 0

**Paso 3**: Verificar que acciones con `hasMovement: true` siguen funcionando
- Probar dodge y verificar que movimiento funciona correctamente

### Fase 2: Modificar PhysicsSystem

**Paso 1**: Agregar verificación de `combat.activeAction` en `PhysicsSystem.updatePhysics()`
- Obtener componente `Combat` del ECS
- Verificar si `combat.activeAction` existe
- Si existe y `actionConfig.hasMovement === false` o no existe, bloquear aceleración normal

**Paso 2**: Modificar aplicación de aceleración normal
- Envolver aplicación de aceleración normal en condición `if (!shouldBlockNormalMovement)`
- Mantener movimiento de acciones con `hasMovement: true` funcionando

**Paso 3**: Verificar que movimiento normal funciona cuando no hay acciones activas
- Probar movimiento normal sin acciones activas

### Fase 3: Testing y Verificación

**Paso 1**: Probar todas las acciones de combate
- Ataque básico: verificar que bloquea movimiento
- Habilidades especiales: verificar que bloquean movimiento
- Parry: verificar que bloquea movimiento
- Dodge: verificar que permite movimiento

**Paso 2**: Probar transiciones
- Verificar que movimiento vuelve a funcionar cuando animación termina
- Verificar que bloqueo se aplica inmediatamente cuando acción se activa

**Paso 3**: Probar casos edge
- Transiciones entre acciones
- Cancelación de acciones
- Combos

## Consideraciones Técnicas

### Frontend

1. **Performance**: 
   - Verificación de `combat.activeAction` es O(1) (acceso directo a componente)
   - Acceso a `COMBAT_ACTIONS` es O(1) (objeto JavaScript)
   - No hay impacto significativo en rendimiento

2. **Compatibilidad**:
   - No rompe código existente
   - Solo agrega verificaciones condicionales
   - Mantiene comportamiento actual cuando no hay acciones activas

3. **Extensibilidad**:
   - Fácil agregar nuevas acciones con diferentes comportamientos
   - Solo requiere configurar `hasMovement` en `combat-actions-config.js`

4. **Orden de ejecución**:
   - InputSystem (prioridad 0) se ejecuta antes que PhysicsSystem (prioridad 1)
   - CombatSystem (prioridad 1) se ejecuta en paralelo con PhysicsSystem
   - El orden actual es correcto: InputSystem calcula dirección, luego PhysicsSystem aplica

5. **Sincronización**:
   - `combat.activeAction` se establece en CombatSystem
   - Se limpia en AnimationMixerSystem cuando animación termina
   - Ambos sistemas (InputSystem y PhysicsSystem) leen el mismo estado

### Dependencias entre Sistemas

```
InputSystem (prioridad 0)
    ↓ calcula moveDirection
    ↓ (puede ser bloqueado por combat.activeAction)
PhysicsSystem (prioridad 1)
    ↓ aplica aceleración basada en moveDirection
    ↓ (puede ser bloqueado por combat.activeAction)
CombatSystem (prioridad 1)
    ↓ establece/limpia combat.activeAction
AnimationMixerSystem (prioridad 2.5)
    ↓ detecta fin de animación
    ↓ llama combat.endAction()
```

## Ejemplo de Uso

### Configuración de Acciones

```javascript
// frontend/src/config/combat-actions-config.js
export const COMBAT_ACTIONS = {
    attack: {
        id: 'attack',
        hasMovement: false,  // Bloquea movimiento WASD
        // ... otras propiedades
    },
    dodge: {
        id: 'dodge',
        hasMovement: true,   // Permite movimiento WASD
        movementSpeed: 20,
        useMovementInput: true,
        // ... otras propiedades
    },
    specialAttack: {
        id: 'specialAttack',
        hasMovement: false,  // Bloquea movimiento WASD
        // ... otras propiedades
    }
};
```

### Comportamiento Resultante

1. **Jugador presiona click izquierdo (ataque)**:
   - `CombatSystem` establece `combat.activeAction = 'attack'`
   - `InputSystem` detecta `hasMovement: false` → bloquea cálculo de `moveDirection`
   - `PhysicsSystem` detecta `hasMovement: false` → no aplica aceleración normal
   - Jugador NO puede moverse con WASD durante animación

2. **Jugador presiona Shift (dodge)**:
   - `CombatSystem` establece `combat.activeAction = 'dodge'`
   - `InputSystem` detecta `hasMovement: true` → calcula `moveDirection` normalmente
   - `PhysicsSystem` detecta `hasMovement: true` → aplica movimiento de dodge según configuración
   - Jugador SÍ puede moverse con WASD durante dodge

3. **Animación termina**:
   - `AnimationMixerSystem` detecta fin de animación
   - Llama `combat.endAction()` → `combat.activeAction = null`
   - `InputSystem` detecta `activeAction === null` → calcula `moveDirection` normalmente
   - `PhysicsSystem` detecta `activeAction === null` → aplica aceleración normal
   - Movimiento normal vuelve a funcionar

## Conclusión

La solución propuesta es **simple, eficiente y no invasiva**. Agrega verificaciones condicionales en dos sistemas (InputSystem y PhysicsSystem) que consultan el estado de `combat.activeAction` y la configuración `hasMovement` antes de procesar movimiento normal.

**Ventajas principales:**
- Mínimos cambios en código existente
- No rompe funcionalidad actual
- Fácil de entender y mantener
- Performance sin impacto significativo
- Extensible para futuras acciones

**Riesgos:**
- Bajo riesgo: Solo agrega verificaciones condicionales
- Requiere testing cuidadoso para asegurar que acciones con `hasMovement: true` siguen funcionando
- Debe verificarse que todas las acciones tienen `hasMovement` configurado correctamente

**Recomendación**: Implementar esta solución ya que es la más directa y mantiene la arquitectura actual sin cambios significativos.
