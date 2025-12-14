# Análisis: ¿Necesitamos `lightAttack` o podemos usar solo `attack`?

## Fecha
2025-12-13

## Problema Identificado

Existe una inconsistencia y duplicación innecesaria:

1. **Duplicación en constantes**: `ACTION_IDS` y `INPUT_ACTION_NAMES` tienen casi todos los mismos valores, excepto:
   - `ACTION_IDS.LIGHT_ATTACK = 'lightAttack'`
   - `INPUT_ACTION_NAMES.ATTACK = 'attack'`

2. **Bug potencial en combos**: `combo-system.js` pasa `'lightAttack'` al `ComboManager`, pero `combo-config.js` espera `'attack'` en los pasos de combo.

## Análisis de Uso Actual

### 1. `COMBAT_ACTIONS.lightAttack`

```javascript
lightAttack: {
    id: 'lightAttack',                    // ← Key en objeto COMBAT_ACTIONS
    inputAction: 'attack',                // ← Nombre en INPUT_MAP
    animationStateId: 'attack',           // ← ID en ANIMATION_STATES
    attackType: 'light',
}
```

**Uso del `id` ('lightAttack'):**
- Key en `COMBAT_ACTIONS` (usado con `Object.entries()` → `actionId`)
- Almacenado en `combat.activeAction`
- Usado para cooldowns: `combat.actionCooldowns.set(actionId, ...)`
- Usado para comparaciones: `actionId === COMBAT_CONSTANTS.ACTION_IDS.DODGE`
- Usado en `combo-system.js`: `inputType = COMBAT_CONSTANTS.ACTION_IDS.LIGHT_ATTACK`

**Uso del `inputAction` ('attack'):**
- Nombre de acción en `INPUT_MAP` 
- Usado en `checkActionInput()` switch para detectar `input.wantsToAttack`
- Usado en `combo-config.js`: `{ input: 'attack', ... }`

### 2. `ANIMATION_STATES` usa `'attack'`

```javascript
{
    id: 'attack',           // ← ID del estado de animación
    conditions: [
        { type: 'combat', property: 'attackType', operator: 'equals', value: 'light' }
    ],
}
```

El estado de animación se identifica por `attackType: 'light'`, no por el nombre del estado.

### 3. `COMBO_CHAINS` usa `'attack'`

```javascript
steps: [
    { input: 'attack', animation: 'left_slash', timing: 500 },
    { input: 'attack', animation: 'attack', timing: 400 },
]
```

Los combos esperan `input: 'attack'`, NO `'lightAttack'`.

### 4. Bug en `combo-system.js`

**Problema actual:**
```javascript
if (input.wantsToAttack) {
    inputType = COMBAT_CONSTANTS.ACTION_IDS.LIGHT_ATTACK; // ← 'lightAttack'
}
// ...
comboManager.processInput(inputType, ...); // ← Pasa 'lightAttack'
```

**Pero `ComboManager` espera:**
```javascript
if (firstStep.input === inputType) { // ← Compara con 'attack' de combo-config
    return combo;
}
```

**Resultado:** Los combos NUNCA se activan porque `'lightAttack' !== 'attack'`.

## ¿Por Qué Existe Esta Diferencia?

**Razón histórica probable:**
- Originalmente había solo `'attack'` como acción
- Cuando se implementó el sistema de combate con tipos (light, heavy, charged, special), se agregó `'lightAttack'` para distinguirlo
- Pero `INPUT_MAP` y `combo-config.js` mantuvieron `'attack'` por compatibilidad
- Esto creó una inconsistencia donde el `id` es `'lightAttack'` pero el `inputAction` es `'attack'`

## ¿Necesitamos Distinguir `attack` vs `lightAttack`?

### Argumentos para mantener `lightAttack`:
1. **Claridad semántica**: Indica explícitamente que es un "ataque ligero"
2. **Extensibilidad futura**: Si hubiera múltiples tipos de ataque ligero (light1, light2), ya está diferenciado
3. **Consistencia con otros tipos**: `heavyAttack`, `chargedAttack`, `specialAttack` todos tienen nombres específicos

### Argumentos para usar solo `attack`:
1. **Simplicidad**: Solo hay un tipo de ataque básico
2. **Corrige el bug de combos**: Los combos ya esperan `'attack'`
3. **Menos duplicación**: Eliminaría la necesidad de `INPUT_ACTION_NAMES` (casi todos son iguales a `ACTION_IDS`)
4. **Coherencia con INPUT_MAP**: `INPUT_MAP` ya usa `'attack'`
5. **El `attackType: 'light'` ya diferencia el tipo**: El tipo se diferencia por `attackType`, no por el nombre del `id`

## Propuesta de Solución

### Opción A: Cambiar `lightAttack` → `attack` (Recomendada)

**Ventajas:**
- ✅ Corrige el bug de combos automáticamente
- ✅ Elimina duplicación innecesaria
- ✅ Más simple y consistente
- ✅ El `attackType: 'light'` ya diferencia el tipo

**Cambios necesarios:**
1. Renombrar `COMBAT_ACTIONS.lightAttack` → `COMBAT_ACTIONS.attack`
2. Cambiar `id: 'lightAttack'` → `id: 'attack'`
3. Actualizar `COMBAT_CONSTANTS.ACTION_IDS.LIGHT_ATTACK` → `'attack'`
4. Actualizar `combo-system.js`: `inputType = COMBAT_CONSTANTS.INPUT_ACTION_NAMES.ATTACK` (o eliminar `INPUT_ACTION_NAMES`)
5. Buscar y reemplazar todos los usos de `'lightAttack'` por `'attack'`

**Riesgos:**
- ⚠️ Búsqueda exhaustiva necesaria para encontrar todos los usos
- ⚠️ Posibles referencias en logs, debug, o código no visible

### Opción B: Cambiar combos a usar `'lightAttack'`

**Ventajas:**
- ✅ Mantiene la distinción semántica
- ✅ Menos cambios en `COMBAT_ACTIONS`

**Desventajas:**
- ❌ Cambiar todos los combos en `combo-config.js`
- ❌ Menos intuitivo (`'attack'` es más claro que `'lightAttack'`)
- ❌ No resuelve la duplicación de constantes

### Opción C: Mantener ambos, corregir solo el bug

**Cambios:**
- En `combo-system.js`, pasar `'attack'` en lugar de `COMBAT_CONSTANTS.ACTION_IDS.LIGHT_ATTACK`
- Mantener `lightAttack` como `id` en `COMBAT_ACTIONS`
- Mantener ambas constantes

**Desventajas:**
- ❌ No resuelve la duplicación
- ❌ Inconsistencia entre `id` y `inputAction`
- ❌ Más confuso para desarrolladores futuros

## Recomendación

**Elegir Opción A: Cambiar `lightAttack` → `attack`**

**Justificación:**
1. El `attackType: 'light'` ya diferencia el tipo de ataque
2. Simplifica el código y elimina duplicación
3. Corrige el bug de combos
4. Más intuitivo: `'attack'` es más claro que `'lightAttack'`
5. Consistente con `INPUT_MAP` y `combo-config.js`

**Si en el futuro necesitamos múltiples tipos de ataque ligero**, podríamos:
- Usar variantes en `attackType`: `'light1'`, `'light2'`, etc.
- O crear nuevas acciones: `lightAttackQuick`, `lightAttackPower`, etc.

Pero actualmente solo hay un tipo básico de ataque, entonces `'attack'` es suficiente.

## Impacto del Cambio

### Archivos a modificar:

1. **`combat-actions-config.js`**:
   - Cambiar key: `lightAttack: {` → `attack: {`
   - Cambiar `id: 'lightAttack'` → `id: 'attack'`

2. **`combat-constants.js`**:
   - Eliminar `LIGHT_ATTACK: 'lightAttack'` (o cambiar a `'attack'`)
   - Eliminar `INPUT_ACTION_NAMES` (todos iguales a `ACTION_IDS` excepto `ATTACK`)
   - Si se mantiene estructura, `LIGHT_ATTACK` debería ser `ATTACK: 'attack'`

3. **`combo-system.js`**:
   - Cambiar `COMBAT_CONSTANTS.ACTION_IDS.LIGHT_ATTACK` → `COMBAT_CONSTANTS.ACTION_IDS.ATTACK`

4. **Búsqueda global**:
   - Buscar todos los usos de `'lightAttack'` y `LIGHT_ATTACK`
   - Verificar `weapon-animations-config.js` (menciona `lightAttack`)

### Verificación post-cambio:

- ✅ Los combos deben funcionar (ya esperan `'attack'`)
- ✅ El ataque básico debe funcionar igual
- ✅ No deben quedar referencias a `'lightAttack'` hardcodeadas
- ✅ Cooldowns deben seguir funcionando

## Conclusión

**Cambiar `lightAttack` → `attack` es la mejor opción** porque:
- Corrige un bug existente (combos no funcionan)
- Simplifica el código
- Elimina duplicación innecesaria
- Mantiene la funcionalidad existente
- Es más intuitivo y consistente

