# Flujo Completo de Animación y Combate

## Orden de Ejecución de Sistemas (por Prioridad)

Los sistemas se ejecutan en este orden cada frame:

```
Priority 0    → InputSystem
Priority 1    → PhysicsSystem
Priority 1.4  → CombatSystem
Priority 1.5  → ComboSystem
Priority 2    → AnimationStateSystem
Priority 2.5  → AnimationMixerSystem
Priority 3    → RenderSystem
```

---

## FLUJO COMPLETO: Ejemplo con DODGE (tecla E)

### FRAME N: Usuario presiona E

#### 1️⃣ InputSystem (Priority 0)
**Archivo:** `input-system.js`

**Qué hace:**
- Detecta que se presionó la tecla `KeyE` usando `inputManager.isKeyDown('KeyE')`
- Setea `input.wantsToDodge = true`
- Este flag se resetea a `false` automáticamente al final del frame (línea 214)

**Resultado:**
```
InputComponent:
  wantsToDodge: true
```

---

#### 2️⃣ PhysicsSystem (Priority 1)
**Archivo:** `physics-system.js`

**Qué hace:**
- NO procesa dodge todavía (aún no hay `activeAction`)
- Procesa movimiento normal, gravedad, etc.

**Resultado:**
- No cambia nada relacionado con dodge

---

#### 3️⃣ CombatSystem (Priority 1.4) ⚠️ CLAVE
**Archivo:** `combat-system.js`

**Qué hace:**

1. **Verifica si hay combo activo:**
   ```javascript
   if (combo && combo.activeComboId) {
       continue; // Si hay combo, no procesar acciones individuales
   }
   ```

2. **Actualiza cooldowns:**
   ```javascript
   combat.updateCooldowns(deltaTime);
   ```

3. **Verifica si hay acción activa:**
   ```javascript
   // Si hay activeAction (excepto parry que puede reactivarse), no procesar
   if (combat.activeAction && !(wasParry && parryStillWanted)) {
       continue; // Ya hay una acción en progreso
   }
   ```

4. **Resetea flags de combate:**
   ```javascript
   combat.reset(); // Limpia attackType, pero NO defenseType si hay activeAction
   ```

5. **Itera COMBAT_ACTIONS:**
   ```javascript
   for (const [actionId, actionConfig] of Object.entries(COMBAT_ACTIONS)) {
       const wantsAction = this.checkActionInput(input, 'dodge');
       // → Retorna: input.wantsToDodge === true
       
       const canExecute = this.canExecuteAction(...);
       // → Retorna: true (dodge no requiere arma)
       
       if (wantsAction && canExecute && !combat.isOnCooldown('dodge')) {
           // ✅ TODAS LAS CONDICIONES SE CUMPLEN
           
           combat.startAction('dodge');
           // → Setea: combat.activeAction = 'dodge'
           // → Setea: combat.actionStartTime = performance.now()
           
           this.applyActionConfig(combat, COMBAT_ACTIONS['dodge']);
           // → Busca ANIMATION_STATES[id='dodge']
           // → Setea: combat.defenseType = 'dodge'
           // → Setea: combat.combatAnimation = 'roll_dodge'
           
           combat.actionCooldowns.set('dodge', 0.5);
           // → Setea cooldown de 0.5 segundos
           
           input.wantsToDodge = false;
           // → Resetea el flag para evitar reactivación
           
           return; // Una acción por frame
       }
   }
   ```

**Resultado:**
```
CombatComponent:
  activeAction: 'dodge'
  actionStartTime: <timestamp>
  defenseType: 'dodge'
  combatAnimation: 'roll_dodge'
  actionCooldowns: Map { 'dodge' => 0.5 }
  
InputComponent:
  wantsToDodge: false (reseteado)
```

---

#### 4️⃣ ComboSystem (Priority 1.5)
**Archivo:** `combo-system.js`

**Qué hace:**
- Verifica si hay combo activo
- NO procesa nada relacionado con dodge (dodge no es parte de combos)

**Resultado:**
- No cambia nada

---

#### 5️⃣ AnimationStateSystem (Priority 2) ⚠️ CLAVE
**Archivo:** `animation-state-system.js`

**Qué hace:**

1. **Crea contexto:**
   ```javascript
   const context = {
       input,
       physics,
       combo,
       combat // <-- Tiene activeAction='dodge', defenseType='dodge'
   };
   ```

2. **Llama StateRegistry.determineActiveState():**
   ```javascript
   const activeState = this.stateRegistry.determineActiveState(context);
   ```

3. **StateRegistry itera estados por prioridad:**
   ```javascript
   // Itera: ['combo_attack', 'parry', 'dodge', 'heavy_attack', ...]
   
   // Cuando llega a 'dodge':
   const state = states.get('dodge'); // type='combat', priority=12
   
   // ✅ VERIFICACIÓN NUEVA: Si es tipo 'combat'
   if (state.type === 'combat') {
       const combat = context.combat;
       if (!combat || !combat.activeAction) {
           continue; // ❌ NO salta porque activeAction = 'dodge'
       }
   }
   
   // Evalúa condiciones:
   const conditions = [
       { type: 'combat', property: 'defenseType', operator: 'equals', value: 'dodge' }
   ];
   
   // CombatCondition.evaluate():
   // → combat.defenseType === 'dodge' → ✅ TRUE
   
   // Todas las condiciones se cumplen → Retorna estado 'dodge'
   ```

4. **AnimationStateSystem recibe activeState = 'dodge':**
   ```javascript
   if (activeState.type === 'combat') {
       if (combat && combat.activeAction) { // ✅ TRUE (activeAction='dodge')
           if (combat.combatAnimation) { // ✅ TRUE (combatAnimation='roll_dodge')
               animation.currentState = 'dodge';
               animation.combatAnimationName = 'roll_dodge';
           }
       }
   }
   ```

**Resultado:**
```
AnimationComponent:
  currentState: 'dodge'
  combatAnimationName: 'roll_dodge'
```

---

#### 6️⃣ AnimationMixerSystem (Priority 2.5) ⚠️ CLAVE
**Archivo:** `animation-mixer-system.js`

**Qué hace:**

1. **Obtiene nombre de animación:**
   ```javascript
   let animationName = null;
   if (animation.combatAnimationName) {
       animationName = 'roll_dodge'; // ✅ Se usa esta
   }
   ```

2. **Llama playAnimation():**
   ```javascript
   this.playAnimation(mixer, clips, 'roll_dodge', mesh);
   ```

3. **playAnimation() verifica si es one-shot:**
   ```javascript
   const stateConfig = ANIMATION_STATES.find(s => s.id === 'dodge');
   const isOneShot = stateConfig.isOneShot; // ✅ TRUE
   
   if (isOneShot) {
       action.setLoop(THREE.LoopOnce);
       action.clampWhenFinished = false;
       
       // Verificar si es acción de combate
       const combat = this.ecs.getComponent(entityId, 'Combat');
       if (combat && combat.activeAction) { // ✅ TRUE (activeAction='dodge')
           isCombatAction = true;
       }
       
       if (isCombatAction) {
           mesh.userData.combatAction = action; // ✅ Se setea aquí
       }
   }
   ```

4. **Reproduce la animación:**
   ```javascript
   action.fadeIn(0.1);
   action.play();
   ```

**Resultado:**
```
mesh.userData.combatAction: <AnimationAction> // Animación en reproducción
mesh.userData.currentAnimationState: 'dodge'
```

---

### FRAME N+1 hasta N+X: Animación en progreso

#### En cada frame:

**AnimationMixerSystem actualiza:**

1. **Actualiza el mixer:**
   ```javascript
   mixer.update(deltaTime); // Avanza la animación
   ```

2. **Verifica progreso:**
   ```javascript
   if (mesh.userData.combatAction) {
       const action = mesh.userData.combatAction;
       const progress = action.time / action.duration;
       
       // Si progress < 0.95:
       // - NO hace limpieza temprana
       // - Solo actualiza i-frames si corresponde
       
       // Si progress >= 0.95 && progress < 1.0:
       // ✅ LIMPIEZA TEMPRANA (nuevo código)
       if (finishedActionId === 'dodge') {
           combat.defenseType = null; // ✅ Se limpia aquí
           // Pero activeAction todavía = 'dodge'
       }
       
       // Si progress >= 1.0:
       // ✅ ANIMACIÓN TERMINÓ
   }
   ```

---

### FRAME N+X: Animación termina (progress >= 1.0)

#### AnimationMixerSystem detecta fin:

```javascript
const animationFinished = progress >= 1.0 || (!action.isRunning() && action.time >= actionDuration);

if (animationFinished) {
    const finishedActionId = combat.activeAction; // 'dodge'
    
    // ✅ CRÍTICO: Limpiar activeAction PRIMERO
    combat.endAction(); 
    // → activeAction = null
    // → actionStartTime = null
    // → hasIFrames = false
    
    // Limpiar flags
    combat.attackType = null;
    combat.combatAnimation = null;
    combat.isAttacking = false;
    
    // Para dodge:
    combat.defenseType = null; // (ya estaba null desde limpieza temprana)
    anim.currentState = 'idle';
    anim.combatAnimationName = null;
    
    // Limpiar referencia
    mesh.userData.combatAction = null;
    mesh.userData.movementApplied = false;
}
```

**Resultado:**
```
CombatComponent:
  activeAction: null ✅
  defenseType: null ✅
  combatAnimation: null ✅
  
AnimationComponent:
  currentState: 'idle'
  combatAnimationName: null
```

---

### FRAME N+X+1: Frame siguiente (después de que terminó)

#### AnimationStateSystem se ejecuta PRIMERO (Priority 2):

```javascript
// Contexto:
const context = {
    combat: {
        activeAction: null, // ✅ Limpio
        defenseType: null,  // ✅ Limpio
        // ...
    }
};

// StateRegistry.determineActiveState():
for (const stateId of priorityOrder) {
    // Cuando llega a 'dodge':
    if (state.type === 'combat') {
        const combat = context.combat;
        if (!combat || !combat.activeAction) {
            continue; // ✅ SALTA porque activeAction es null
        }
    }
    
    // ❌ NUNCA LLEGA A EVALUAR CONDICIONES
    // Porque ya se saltó el estado
}

// Como ningún estado de combate se activa, retorna 'idle'
return states.get('idle');
```

**Resultado:**
- ✅ NO se reactiva 'dodge'
- ✅ Estado activo es 'idle'
- ✅ NO hay loop infinito

---

## FLUJO COMPLETO: Ejemplo con PARRY (tecla Q - mantener presionado)

### FRAME N: Usuario presiona Q

Similar a dodge, pero:
- `input.wantsToParry = true` (se mantiene mientras la tecla está presionada)
- `combat.activeAction = 'parry'`
- `combat.defenseType = 'parry'`

---

### FRAME N+X: Animación termina (pero Q sigue presionado)

#### AnimationMixerSystem:

```javascript
if (animationFinished) {
    const finishedActionId = 'parry';
    combat.endAction(); // activeAction = null
    
    // Para parry:
    if (!input || !input.wantsToParry) {
        combat.defenseType = null;
    } else {
        // ✅ La tecla sigue presionada
        // → NO limpia defenseType
        // → Mantiene defenseType = 'parry'
    }
}
```

**Resultado:**
```
CombatComponent:
  activeAction: null
  defenseType: 'parry' // ✅ MANTIENE (porque wantsToParry = true)
  
InputComponent:
  wantsToParry: true // ✅ Sigue presionado
```

---

### FRAME N+X+1: Frame siguiente

#### CombatSystem detecta reactivación:

```javascript
// Verifica acciones activas:
if (combat.activeAction) {
    // ❌ activeAction es null, no entra aquí
}

// Itera COMBAT_ACTIONS:
for (const [actionId, actionConfig] of Object.entries(COMBAT_ACTIONS)) {
    // Cuando llega a 'parry':
    const wantsAction = input.wantsToParry; // ✅ TRUE
    const canExecute = ...; // ✅ TRUE
    const isOnCooldown = combat.isOnCooldown('parry'); // ✅ FALSE (cooldown ya terminó)
    
    if (wantsAction && canExecute && !isOnCooldown) {
        // ✅ REACTIVA PARRY
        combat.startAction('parry');
        this.applyActionConfig(combat, COMBAT_ACTIONS['parry']);
        // → defenseType = 'parry' (ya estaba, pero se re-setea)
        return;
    }
}
```

**Resultado:**
- ✅ Parry se reactiva porque la tecla sigue presionada
- ✅ Nueva animación de parry se reproduce
- ✅ Este es el comportamiento deseado (mantener presionado para parry continuo)

---

## Problema del Loop Infinito (ANTES de la solución)

### ¿Qué causaba el loop?

**Frame N (animación termina):**
1. `AnimationMixerSystem` limpia `activeAction = null` y `defenseType = null`

**Frame N+1 (siguiente frame):**
1. `AnimationStateSystem` (Priority 2) se ejecuta ANTES que `AnimationMixerSystem` (Priority 2.5)
2. `StateRegistry` evalúa condiciones:
   ```javascript
   // ❌ ANTES: NO verificaba activeAction
   if (combat.defenseType === 'dodge') { // Puede tener valor residual
       return state 'dodge'; // ❌ Reactiva el estado
   }
   ```
3. `AnimationStateSystem` activa `animation.combatAnimationName = 'roll_dodge'`
4. `AnimationMixerSystem` reproduce la animación de nuevo
5. **LOOP INFINITO** 🔄

---

## Solución Implementada

### 1️⃣ Verificación en StateRegistry

```javascript
if (state.type === 'combat') {
    if (!combat || !combat.activeAction) {
        continue; // ✅ SKIP si no hay activeAction
    }
}
```

**Efecto:** Si `activeAction` es null, nunca se evalúan las condiciones, evitando reactivación.

### 2️⃣ Limpieza Temprana en AnimationMixerSystem

```javascript
if (progress >= 0.95 && progress < 1.0) {
    if (finishedActionId === 'dodge') {
        combat.defenseType = null; // ✅ Limpia antes de que termine
    }
}
```

**Efecto:** `defenseType` se limpia al 95%, proporcionando ventana de seguridad antes del fin de animación.

---

## Puntos Críticos del Flujo

### 1. Orden de Ejecución es CRÍTICO

```
Priority 2    → AnimationStateSystem (determina qué animación debe reproducirse)
Priority 2.5  → AnimationMixerSystem (reproduce la animación y detecta cuando termina)
```

**Si AnimationStateSystem ve flags con valores residuales, puede reactivar el estado.**

### 2. activeAction es la Fuente de Verdad

- `activeAction` indica si hay una acción en progreso
- `defenseType`/`attackType` son propiedades derivadas que pueden tener valores residuales
- **SIEMPRE verificar `activeAction` antes de evaluar condiciones de combate**

### 3. Limpieza debe ser Atómica

- Limpiar `activeAction` PRIMERO
- Luego limpiar propiedades derivadas
- Esto previene race conditions entre sistemas

### 4. Parry vs Dodge

- **Parry:** Mantener presionado → puede reactivarse si la tecla sigue presionada
- **Dodge:** Presión única → solo se activa una vez por press

---

## Estado Actual del Problema

Si parry y dodge siguen en loop después de la solución, posibles causas:

1. **`activeAction` no se está limpiando correctamente**
   - Verificar que `combat.endAction()` se llama cuando la animación termina

2. **Limpieza temprana no se está ejecutando**
   - Verificar que `progress >= 0.95` se cumple

3. **Otro sistema está seteando `defenseType` después de la limpieza**
   - Buscar todas las referencias a `defenseType =`

4. **La verificación en StateRegistry no se está ejecutando**
   - Agregar logs para verificar

5. **Hay múltiples entidades y estamos viendo la entidad incorrecta**
   - Verificar que se está procesando la entidad correcta

---

## Próximos Pasos para Debugging

1. Agregar logs detallados en cada paso crítico
2. Verificar que `activeAction` se limpia correctamente
3. Verificar que `defenseType` se limpia en limpieza temprana
4. Verificar que StateRegistry está saltando estados de combate sin `activeAction`

