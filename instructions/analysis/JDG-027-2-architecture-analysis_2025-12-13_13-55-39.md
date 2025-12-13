# Análisis de Arquitectura - Loop Infinito en Animaciones de Combate (Parry y Dodge) (JDG-027)

## Situación Actual

### Problema Identificado

**Síntoma:** Las animaciones de `parry` y `dodge` quedan en loop infinito, pero la animación de `attack` funciona correctamente.

### Análisis del Flujo Actual

#### 1. Flujo de Ejecución de Sistemas (Orden de Prioridad)

```
Frame N:
1. InputSystem (priority 0)
   - Detecta input: wantsToDodge = true o wantsToParry = true
   
2. PhysicsSystem (priority 1)
   - Aplica movimiento si corresponde

3. CombatSystem (priority 1.4)
   - Para parry/dodge: setea activeAction = 'parry'/'dodge'
   - setea defenseType = 'parry'/'dodge'
   - setea combatAnimation = 'roll_dodge'/'sword_parry_backward'
   
4. ComboSystem (priority 1.5)
   - (no relevante para este caso)

5. AnimationStateSystem (priority 2) ⚠️ PROBLEMA AQUÍ
   - Evalúa condiciones usando StateRegistry.determineActiveState()
   - Verifica: combat.defenseType === 'parry' (condición en animation-config.js)
   - Si es true: activa estado 'parry' y setea animation.combatAnimationName
   
6. AnimationMixerSystem (priority 2.5) ⚠️ PROBLEMA AQUÍ
   - Reproduce animación usando animation.combatAnimationName
   - Detecta cuando animación termina (progress >= 1.0)
   - Limpia: activeAction = null, defenseType = null, combatAnimation = null
   
Frame N+1 (cuando animación termina):
1. InputSystem (priority 0)
   - (input puede seguir presionado o no)
   
2. AnimationStateSystem (priority 2) ⚠️ SE EJECUTA ANTES
   - Evalúa condiciones ANTES que AnimationMixerSystem limpie
   - Todavía ve defenseType con valor (parry/dodge)
   - StateRegistry determina que debe activar estado 'parry'/'dodge'
   - Reactiva animation.combatAnimationName
   
3. AnimationMixerSystem (priority 2.5) ⚠️ SE EJECUTA DESPUÉS
   - Intenta limpiar, pero ya es tarde
   - animation.combatAnimationName ya fue reactivado
   - La animación se reproduce de nuevo → LOOP INFINITO
```

#### 2. Diferencia Crítica: Attack vs Parry/Dodge

**Attack funciona porque:**
- NO pasa por `COMBAT_ACTIONS` (está en código legacy, línea 79-86 de combat-system.js)
- NO usa `activeAction` del CombatComponent
- NO usa `combatAction` en AnimationMixerSystem
- Usa `attackAction` separado
- Cuando termina: solo limpia `attackType` y `combatAnimation`
- `AnimationStateSystem` evalúa condición: `combat.attackType === 'light'`
- Si `attackType` es null → NO activa estado de attack
- ✅ Funciona correctamente

**Parry/Dodge NO funcionan porque:**
- SÍ pasan por `COMBAT_ACTIONS` (usando nuevo sistema)
- SÍ usan `activeAction` del CombatComponent
- SÍ usan `combatAction` en AnimationMixerSystem
- Cuando terminan: limpian `activeAction = null` y `defenseType = null`
- PERO `AnimationStateSystem` (priority 2) se ejecuta ANTES que `AnimationMixerSystem` (priority 2.5)
- En el frame siguiente, `AnimationStateSystem` evalúa condición: `combat.defenseType === 'parry'`
- Si `defenseType` todavía tiene valor (por timing) → Reactiva estado
- ❌ Loop infinito

#### 3. Condiciones en animation-config.js

```javascript
// Parry
{
    id: 'parry',
    conditions: [
        { type: 'combat', property: 'defenseType', operator: 'equals', value: 'parry' }
    ]
}

// Dodge
{
    id: 'dodge',
    conditions: [
        { type: 'combat', property: 'defenseType', operator: 'equals', value: 'dodge' }
    ]
}
```

**Problema:** Estas condiciones NO verifican `activeAction`. Solo verifican `defenseType`.

#### 4. Código Actual en AnimationStateSystem

```javascript
// Línea 71-92
else if (activeState.type === 'combat') {
    // CRÍTICO: Solo activar estado de combate si hay una acción activa
    if (combat && combat.activeAction) {  // ✅ Esto está bien
        if (combat.combatAnimation) {
            animation.currentState = activeState.id;
            animation.combatAnimationName = combat.combatAnimation;
        }
    } else {
        animation.combatAnimationName = null;
    }
}
```

**El código ya verifica `activeAction`**, pero el problema es que `StateRegistry.determineActiveState()` evalúa las condiciones ANTES de llegar a esta verificación.

#### 5. El Problema Real: StateRegistry Evalúa Condiciones Basándose en defenseType

**Flujo del problema:**

```
Frame N (animación terminó):
1. AnimationMixerSystem limpia: activeAction = null, defenseType = null
   
Frame N+1:
1. AnimationStateSystem.determineActiveState() se ejecuta:
   - Itera estados por prioridad (parry tiene priority 12, muy alta)
   - Evalúa condición: combat.defenseType === 'parry'
   - Si defenseType todavía tiene valor (por timing) → Retorna estado 'parry'
   
2. AnimationStateSystem recibe activeState = 'parry'
   - Verifica: if (combat.activeAction) → FALSE (ya fue limpiado)
   - Pero activeState ya fue determinado como 'parry'
   - El estado YA fue activado en determineActiveState()
```

**El problema:** `StateRegistry.determineActiveState()` retorna el estado basándose solo en condiciones (defenseType), sin verificar si hay una `activeAction` en progreso.

## Necesidades Futuras

### Requisitos

1. **Parry debe reactivarse si la tecla sigue presionada** cuando la animación termina
2. **Dodge solo debe activarse una vez** por press de tecla
3. **Attack debe seguir funcionando** como funciona actualmente
4. **No debe haber loops infinitos** en ninguna animación

## Arquitectura Propuesta

### Solución 1: Verificar activeAction en las Condiciones (Recomendada)

**Problema:** Las condiciones en `animation-config.js` solo verifican `defenseType`, no verifican si hay una `activeAction` en progreso.

**Solución:** Agregar condición adicional que verifique `activeAction` O modificar las condiciones existentes para incluir esta verificación.

**Implementación:**

```javascript
// En animation-config.js
{
    id: 'parry',
    conditions: [
        { type: 'combat', property: 'defenseType', operator: 'equals', value: 'parry' },
        { type: 'combat', property: 'activeAction', operator: 'equals', value: 'parry' }
    ]
}
```

**Problema con esta solución:** Requiere que ambas condiciones sean verdaderas, pero `activeAction` puede ser null cuando la animación termina.

### Solución 2: Modificar determineActiveState para Verificar activeAction Primero (Mejor)

**Cambio en StateRegistry o ConditionEvaluator:**

Antes de evaluar condiciones de estados de combate, verificar si `activeAction` es null. Si es null y la acción ya terminó, no activar el estado.

**Implementación:**

```javascript
// En state-registry.js o condition-factory.js
determineActiveState(context) {
    for (const stateId of this.priorityOrder) {
        const state = this.states.get(stateId);
        const conditions = this.getConditions(stateId);
        
        // Si es estado de combate, verificar activeAction primero
        if (state.type === 'combat') {
            const combat = context.combat;
            // Si no hay activeAction, este estado de combate no puede activarse
            // (excepto si la condición específicamente lo permite)
            if (!combat || !combat.activeAction) {
                // Verificar si alguna condición específicamente permite activarse sin activeAction
                // (por ahora, ninguna lo permite)
                continue;
            }
        }
        
        if (state.canActivate(context, conditions)) {
            return state;
        }
    }
    
    return this.states.get('idle') || null;
}
```

**Problema:** Esto podría romper otros estados de combate que no usan `activeAction`.

### Solución 3: Limpiar defenseType ANTES de que la Animación Termine (Más Segura)

**Cambio en AnimationMixerSystem:**

En lugar de limpiar `defenseType` cuando `progress >= 1.0`, limpiarlo antes (por ejemplo, cuando `progress >= 0.9`).

**Implementación:**

```javascript
// En animation-mixer-system.js
const animationFinished = progress >= 1.0 || (!action.isRunning() && action.time >= actionDuration);
const shouldCleanup = progress >= 0.95; // Limpiar antes de que termine completamente

if (shouldCleanup) {
    // Limpiar defenseType ANTES de que termine
    combat.defenseType = null; // Para parry/dodge
    // Pero mantener activeAction hasta que termine completamente
}

if (animationFinished) {
    combat.endAction(); // Limpia activeAction
    // Resto de limpieza...
}
```

**Problema:** Esto podría causar que la animación se corte antes de tiempo visualmente.

### Solución 4: Cambiar Orden de Ejecución (NO Recomendada)

Cambiar prioridades para que `AnimationMixerSystem` se ejecute ANTES que `AnimationStateSystem`.

**Problema:** Esto rompería el flujo lógico esperado (determinar estado antes de reproducir animación).

### Solución 5: Agregar Flag de "Animación Terminando" (Recomendada)

Agregar un flag `isFinishing` en `CombatComponent` que indique que la animación está terminando pero aún no ha terminado completamente.

**Implementación:**

```javascript
// En combat.js
this.isFinishing = false;

// En animation-mixer-system.js
if (progress >= 0.95) {
    combat.isFinishing = true;
    // Limpiar defenseType para que AnimationStateSystem no reactive
    combat.defenseType = null;
}

if (progress >= 1.0 || animationFinished) {
    combat.isFinishing = false;
    combat.endAction();
}

// En animation-state-system.js o state-registry.js
if (state.type === 'combat') {
    const combat = context.combat;
    // No activar si está terminando o no hay activeAction
    if (!combat || (!combat.activeAction && !combat.isFinishing)) {
        continue;
    }
}
```

## Solución Recomendada: Combinación de Solución 2 y 3

**Implementar ambas:**

1. **Verificar `activeAction` en `StateRegistry`** antes de evaluar condiciones de estados de combate
2. **Limpiar `defenseType` antes de que termine la animación** (progreso >= 0.95) para asegurar que `AnimationStateSystem` no lo vea

Esto proporciona doble protección contra loops infinitos.

## Beneficios de la Solución Propuesta

1. **Elimina loops infinitos**: Doble verificación previene reactivación
2. **Mantiene funcionalidad de parry**: Puede reactivarse si la tecla sigue presionada (CombatSystem lo maneja)
3. **Mantiene funcionalidad de dodge**: Solo se activa una vez por press
4. **No rompe attack**: Attack sigue funcionando como antes
5. **Escalable**: Funciona para cualquier nueva acción de combate

## Migración Propuesta

### Fase 1: Modificar StateRegistry
- Agregar verificación de `activeAction` antes de evaluar condiciones de estados de combate
- Testear que parry y dodge no entren en loop

### Fase 2: Limpieza Temprana de defenseType
- Limpiar `defenseType` cuando progreso >= 0.95
- Testear que las animaciones no se corten visualmente

### Fase 3: Testing Completo
- Verificar todas las animaciones de combate
- Verificar que parry puede reactivarse si la tecla sigue presionada
- Verificar que dodge solo se activa una vez

## Consideraciones Técnicas

### Timing y Orden de Ejecución

- Los sistemas se ejecutan en orden de prioridad
- `AnimationStateSystem` (2) se ejecuta antes que `AnimationMixerSystem` (2.5)
- Esto causa que las condiciones se evalúen antes de que se limpien los flags
- La solución debe tener en cuenta este orden

### Compatibilidad

- La solución debe mantener compatibilidad con el sistema actual de attack
- No debe romper otras animaciones de combate
- Debe funcionar con el sistema de combos existente

### Performance

- Las verificaciones adicionales tienen costo mínimo (O(1))
- No afecta el rendimiento general

## Conclusión

El problema es un **race condition de timing** entre `AnimationStateSystem` y `AnimationMixerSystem`. La solución recomendada combina:

1. **Verificación de `activeAction` en StateRegistry** antes de evaluar condiciones de estados de combate
2. **Limpieza temprana de `defenseType`** (progreso >= 0.95) para asegurar que `AnimationStateSystem` no lo vea cuando la animación está terminando

Esto proporciona protección doble contra loops infinitos mientras mantiene la funcionalidad deseada de parry (reactivación) y dodge (una sola activación).

