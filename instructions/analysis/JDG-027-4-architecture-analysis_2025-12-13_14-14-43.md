# Análisis de Arquitectura - Migración de Attack al Sistema de COMBAT_ACTIONS (JDG-029)

## Situación Actual

### Estado Actual de Attack

**Attack actualmente tiene una implementación híbrida:**

1. **Ya está en COMBAT_ACTIONS:**
   ```javascript
   // combat-actions-config.js
   lightAttack: {
       id: 'lightAttack',
       inputAction: 'attack',
       animationStateId: 'attack',
       attackType: 'light',
       cooldown: 0.0,
       // ...
   }
   ```

2. **CombatSystem lo procesa parcialmente:**
   ```javascript
   // combat-system.js (línea 89-95)
   if (input.wantsToAttack) {
       const lightAttackConfig = COMBAT_ACTIONS['lightAttack'];
       if (lightAttackConfig && !combat.isOnCooldown('lightAttack')) {
           combat.startAction('lightAttack');  // ✅ Usa nuevo sistema
           this.applyActionConfig(combat, lightAttackConfig);
           combat.actionCooldowns.set('lightAttack', lightAttackConfig.cooldown);
       }
   }
   ```

3. **PERO AnimationMixerSystem lo maneja como legacy:**
   ```javascript
   // animation-mixer-system.js (línea 274-293)
   if (isOneShot) {
       // Verificar si es acción de combate
       if (combat && combat.activeAction) {
           isCombatAction = true;  // ✅ Attack con activeAction = 'lightAttack' debería entrar aquí
       }
       
       if (isCombatAction) {
           mesh.userData.combatAction = action;  // ✅ Debería usar esto
       } else {
           mesh.userData.attackAction = action;  // ❌ Usa código legacy
           mesh.userData.isAttacking = true;
       }
   }
   
   // Y luego tiene código separado para limpiar attackAction (línea 452-476)
   if (mesh.userData.attackAction && !mesh.userData.combatAction) {
       // Limpieza legacy...
   }
   ```

### Problema Identificado

**Attack está en una situación híbrida:**

1. ✅ **CombatSystem** ya lo procesa usando el nuevo sistema (`activeAction = 'lightAttack'`)
2. ✅ **AnimationMixerSystem** DEBERÍA detectarlo como `combatAction` (porque `activeAction` existe)
3. ❌ **PERO** hay código legacy separado que todavía maneja `attackAction`
4. ❌ **Esto crea duplicación** y potencial inconsistencia

### Por Qué Attack Funciona (Comparado con Parry/Dodge)

**Attack funciona porque:**

1. Cuando `CombatSystem` procesa `wantsToAttack`:
   - Setea `activeAction = 'lightAttack'`
   - Setea `attackType = 'light'`
   - Setea `combatAnimation = 'attack'`

2. `AnimationMixerSystem` detecta que hay `activeAction`:
   - Usa `mesh.userData.combatAction` (nuevo sistema)
   - NO usa `mesh.userData.attackAction` (legacy)

3. Cuando la animación termina:
   - Limpia `activeAction = null`
   - Limpia `attackType = null`
   - `AnimationStateSystem` no reactiva porque `attackType` es null

**PERO hay código legacy que nunca se ejecuta** si `activeAction` existe. Este código legacy es redundante y debería eliminarse.

## Análisis de Código Legacy vs Nuevo Sistema

### Código Legacy (attackAction)

**Ubicación:** `animation-mixer-system.js` línea 452-476

**Características:**
- Usa `mesh.userData.attackAction` separado
- No usa `activeAction` del CombatComponent
- Limpieza manual de `attackType` y `combatAnimation`
- No pasa por `COMBAT_ACTIONS`

**Cuándo se ejecuta:**
- Solo si NO hay `combatAction` activo
- Solo si hay `attackAction` (que solo se setea si NO hay `activeAction`)

**Problema:** Este código es **redundante** porque si `activeAction = 'lightAttack'`, nunca se ejecutará esta ruta.

### Código Nuevo (combatAction)

**Ubicación:** `animation-mixer-system.js` línea 350-442

**Características:**
- Usa `mesh.userData.combatAction`
- Usa `activeAction` del CombatComponent
- Limpieza usando `combat.endAction()`
- Pasa por `COMBAT_ACTIONS`

**Cuándo se ejecuta:**
- Cuando hay `combatAction` activo
- Cuando hay `activeAction` en CombatComponent

**Estado actual:** ✅ Ya se ejecuta para attack cuando `activeAction = 'lightAttack'`

## Necesidades Futuras

### Requisitos

1. **Eliminar código legacy duplicado** de `attackAction`
2. **Unificar manejo de animaciones de combate** en una sola ruta
3. **Mantener funcionalidad existente** (attack debe seguir funcionando)
4. **Simplificar código** eliminando duplicación

## Arquitectura Propuesta

### Solución: Eliminación Completa de Código Legacy

**Estrategia:**

1. **Verificar que attack ya funciona con nuevo sistema**
   - Confirmar que `activeAction = 'lightAttack'` se setea correctamente
   - Confirmar que `combatAction` se usa en lugar de `attackAction`

2. **Eliminar código legacy redundante**
   - Remover lógica de `attackAction` en `AnimationMixerSystem`
   - Remover check de `isCombatAction` (siempre será true para acciones del nuevo sistema)
   - Unificar limpieza de animaciones en una sola ruta

3. **Mover attack al loop principal de COMBAT_ACTIONS**
   - Actualmente está fuera del loop (línea 89-95)
   - Moverlo dentro del loop para consistencia

### Cambios Propuestos

#### Cambio 1: Mover attack dentro del loop de COMBAT_ACTIONS

**Antes:**
```javascript
// Procesar acciones según configuración (en orden de prioridad)
for (const [actionId, actionConfig] of Object.entries(COMBAT_ACTIONS)) {
    // ... procesa dodge, parry, etc.
}

// Ataque Normal (fuera del loop)
if (input.wantsToAttack) {
    const lightAttackConfig = COMBAT_ACTIONS['lightAttack'];
    if (lightAttackConfig && !combat.isOnCooldown('lightAttack')) {
        combat.startAction('lightAttack');
        this.applyActionConfig(combat, lightAttackConfig);
        combat.actionCooldowns.set('lightAttack', lightAttackConfig.cooldown);
    }
}
```

**Después:**
```javascript
// Procesar acciones según configuración (en orden de prioridad)
// NOTA: El orden en COMBAT_ACTIONS importa para prioridad
for (const [actionId, actionConfig] of Object.entries(COMBAT_ACTIONS)) {
    const wantsAction = this.checkActionInput(input, actionConfig.inputAction);
    const canExecute = this.canExecuteAction(entityId, actionConfig, weapon, weaponType);
    
    if (wantsAction && canExecute && !combat.isOnCooldown(actionId)) {
        combat.startAction(actionId);
        this.applyActionConfig(combat, actionConfig);
        combat.actionCooldowns.set(actionId, actionConfig.cooldown);
        
        // Resetear flags de input si es necesario
        if (actionId === 'dodge') {
            input.wantsToDodge = false;
        }
        
        return; // Una acción por frame
    }
}
// Attack ahora está dentro del loop automáticamente
```

**Beneficio:** Consistencia total, todas las acciones usan el mismo flujo.

#### Cambio 2: Eliminar lógica de attackAction en AnimationMixerSystem

**Código a eliminar (línea 452-476):**
```javascript
// Verificar si la animación de ataque normal terminó (no es acción de combate)
if (mesh.userData.attackAction && !mesh.userData.combatAction) {
    const attackAction = mesh.userData.attackAction;
    // ... limpieza legacy
}
```

**Razón:** Este código nunca se ejecuta porque:
- Si `activeAction = 'lightAttack'`, se usa `combatAction`
- Si no hay `activeAction`, no hay attack activo
- El código legacy es redundante

#### Cambio 3: Simplificar detección de isCombatAction

**Antes:**
```javascript
if (isOneShot) {
    // Verificar si es acción de combate
    const entityId = mesh.userData.entityId;
    let isCombatAction = false;
    if (entityId) {
        const combat = this.ecs.getComponent(entityId, 'Combat');
        if (combat && combat.activeAction) {
            isCombatAction = true;
        }
    }
    
    if (isCombatAction) {
        mesh.userData.combatAction = action;
    } else {
        mesh.userData.attackAction = action;  // ❌ Legacy, nunca debería ejecutarse
        mesh.userData.isAttacking = true;
    }
}
```

**Después:**
```javascript
if (isOneShot) {
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = false;
    
    // Verificar si es acción de combate (del nuevo sistema)
    const entityId = mesh.userData.entityId;
    let isCombatAction = false;
    if (entityId) {
        const combat = this.ecs.getComponent(entityId, 'Combat');
        if (combat && combat.activeAction) {
            isCombatAction = true;
        }
    }
    
    if (isCombatAction) {
        // Todas las acciones de combate usan combatAction ahora
        mesh.userData.combatAction = action;
    } else {
        // Solo para animaciones one-shot que NO son de combate
        // (por ahora, ninguna, pero útil para futuras expansiones)
        mesh.userData.isAttacking = true;  // Mantener flag por compatibilidad
    }
}
```

**O más simple:**
```javascript
if (isOneShot) {
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = false;
    
    // Verificar si es acción de combate (del nuevo sistema)
    const entityId = mesh.userData.entityId;
    const combat = entityId ? this.ecs.getComponent(entityId, 'Combat') : null;
    
    if (combat && combat.activeAction) {
        // Acción del nuevo sistema (attack, parry, dodge, etc.)
        mesh.userData.combatAction = action;
    } else {
        // Animación one-shot que NO es de combate
        // (útil para futuras expansiones como habilidades especiales)
        mesh.userData.isAttacking = true;
    }
}
```

**Beneficio:** Código más limpio, elimina lógica duplicada.

#### Cambio 4: Asegurar orden correcto en COMBAT_ACTIONS

**Problema potencial:** El orden de iteración en `Object.entries()` puede no coincidir con prioridades.

**Solución:** Verificar que el orden en `COMBAT_ACTIONS` sea correcto o usar un array ordenado.

**Opción A: Mantener orden manual**
```javascript
export const COMBAT_ACTIONS = {
    // Orden de prioridad (mayor a menor)
    parry: { ... },
    dodge: { ... },
    specialAttack: { ... },
    heavyAttack: { ... },
    chargedAttack: { ... },
    lightAttack: { ... },  // Menor prioridad, al final
};
```

**Opción B: Usar array ordenado**
```javascript
export const COMBAT_ACTIONS_ORDER = ['parry', 'dodge', 'specialAttack', 'heavyAttack', 'chargedAttack', 'lightAttack'];

export const COMBAT_ACTIONS = {
    parry: { ... },
    // ...
};

// En combat-system.js
for (const actionId of COMBAT_ACTIONS_ORDER) {
    const actionConfig = COMBAT_ACTIONS[actionId];
    // ...
}
```

**Recomendación:** Opción A (orden manual) es más simple y suficiente para el número actual de acciones.

## Beneficios de la Migración

### 1. Código Unificado

**Antes:**
- Attack: Ruta legacy separada
- Parry/Dodge: Ruta nueva
- Duplicación de lógica de limpieza

**Después:**
- Todas las acciones: Ruta única
- Lógica de limpieza centralizada
- Menos código, más mantenible

### 2. Consistencia

- Todas las acciones usan `activeAction`
- Todas usan `combatAction` en AnimationMixerSystem
- Todas pasan por `COMBAT_ACTIONS`

### 3. Extensibilidad

- Agregar nuevas acciones es trivial (solo configuración)
- No requiere código nuevo en AnimationMixerSystem
- Consistente con el resto del sistema

### 4. Menos Bugs

- Elimina código legacy que puede causar inconsistencias
- Una sola fuente de verdad para limpieza de animaciones
- Más fácil de debuggear

## Migración Propuesta

### Fase 1: Verificación Pre-Migración

**Objetivo:** Confirmar que attack ya funciona con el nuevo sistema.

**Pasos:**
1. Agregar logs temporales para verificar que `activeAction = 'lightAttack'` se setea
2. Verificar que `combatAction` se usa en lugar de `attackAction`
3. Confirmar que el código legacy nunca se ejecuta

**Criterio de éxito:**
- Attack funciona correctamente
- `combatAction` se usa, no `attackAction`
- Código legacy es redundante

### Fase 2: Mover attack dentro del loop

**Pasos:**
1. Mover código de attack (línea 89-95) dentro del loop de COMBAT_ACTIONS
2. Verificar que el orden de prioridad es correcto
3. Testear que attack sigue funcionando

**Criterio de éxito:**
- Attack se procesa dentro del loop
- Prioridad correcta (después de parry/dodge/special, antes de idle)
- Funcionalidad no cambia

### Fase 3: Eliminar código legacy

**Pasos:**
1. Eliminar lógica de `attackAction` en AnimationMixerSystem (línea 452-476)
2. Simplificar detección de `isCombatAction`
3. Eliminar referencias a `attackAction` si no se usan

**Criterio de éxito:**
- Código legacy eliminado
- Attack sigue funcionando
- No hay regresiones

### Fase 4: Limpieza y Testing

**Pasos:**
1. Eliminar comentarios sobre código legacy
2. Actualizar documentación si es necesario
3. Testing completo de todas las animaciones de combate

**Criterio de éxito:**
- Código limpio sin referencias a legacy
- Todas las animaciones funcionan correctamente
- Documentación actualizada

## Consideraciones Técnicas

### Compatibilidad

**✅ No rompe funcionalidad existente:**
- Attack ya usa el nuevo sistema parcialmente
- Solo eliminamos código redundante
- La funcionalidad no cambia

**✅ Compatible con ComboSystem:**
- ComboSystem tiene prioridad sobre acciones individuales
- Attack sigue funcionando dentro de combos
- No afecta lógica de combos

**✅ Compatible con sistema de animaciones:**
- AnimationStateSystem no cambia
- AnimationMixerSystem solo simplifica
- No afecta otros estados de animación

### Testing

**Tests necesarios:**
1. ✅ Attack básico funciona
2. ✅ Attack en combo funciona
3. ✅ Attack puede interrumpirse (si aplica)
4. ✅ Attack termina correctamente
5. ✅ No hay loops infinitos
6. ✅ Otras acciones no se rompen

### Performance

**Impacto:**
- ✅ Mejor rendimiento (menos código, menos checks)
- ✅ Menos memoria (no mantiene `attackAction` separado)
- ✅ Menos complejidad = menos bugs

## Riesgos y Mitigación

### Riesgo 1: Orden de prioridad incorrecto

**Riesgo:** Si `lightAttack` tiene prioridad muy alta, podría interferir con otras acciones.

**Mitigación:** Verificar que el orden en `COMBAT_ACTIONS` respete prioridades:
- Parry/Dodge: Alta prioridad (defensa)
- Special/Heavy/Charged: Media prioridad (ataques especiales)
- LightAttack: Baja prioridad (ataque básico)

### Riesgo 2: Código legacy todavía se usa en algún caso edge

**Riesgo:** Alguno caso edge todavía usa `attackAction`.

**Mitigación:**
1. Buscar todas las referencias a `attackAction`
2. Verificar que no se usan
3. Si se usan, migrarlas primero
4. Agregar logs antes de eliminar

### Riesgo 3: Regresiones en funcionalidad de attack

**Riesgo:** Cambiar el código podría romper algo.

**Mitigación:**
1. Migración incremental (fase por fase)
2. Testing exhaustivo después de cada fase
3. Revertir si hay problemas

## Conclusión

### ✅ Migración Recomendada

**La migración es beneficiosa porque:**

1. **Elimina código duplicado** y redundante
2. **Unifica todas las acciones** en un solo sistema
3. **Mejora mantenibilidad** y extensibilidad
4. **No rompe funcionalidad** existente
5. **Simplifica el código** sin perder características

### Plan de Acción

1. ✅ Verificar que attack ya funciona con nuevo sistema
2. ✅ Mover attack dentro del loop de COMBAT_ACTIONS
3. ✅ Eliminar código legacy de `attackAction`
4. ✅ Testing completo
5. ✅ Limpieza de código y documentación

### Resultado Esperado

Después de la migración:
- **Código más limpio:** Una sola ruta para todas las acciones de combate
- **Más fácil de mantener:** Cambios futuros solo requieren modificar configuración
- **Más consistente:** Todas las acciones se comportan igual
- **Menos bugs:** Elimina inconsistencias entre rutas legacy y nuevas

