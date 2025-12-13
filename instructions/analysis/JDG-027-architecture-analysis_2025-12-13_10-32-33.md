# Análisis de Arquitectura - Sistema de Dodge Estilo Dark Souls (JDG-027)

## Situación Actual

### Frontend - Sistema de Combate

**Estructura actual:**
```
frontend/src/
├── config/
│   ├── animation-config.js      # Configuración de estados de animación
│   ├── input-map-config.js      # Mapeo de teclas a acciones
│   └── combo-config.js          # Configuración de combos
├── ecs/
│   ├── components/
│   │   ├── combat.js            # CombatComponent (isAttacking, attackType, defenseType, etc.)
│   │   ├── input.js             # InputComponent (wantsToDodge, etc.)
│   │   └── physics.js           # PhysicsComponent (velocity, acceleration, etc.)
│   ├── systems/
│   │   ├── combat-system.js     # Procesa intenciones de combate
│   │   ├── input-system.js      # Procesa inputs y setea wantsToDodge
│   │   ├── physics-system.js    # Aplica movimiento de dodge
│   │   └── animation-mixer-system.js  # Reproduce animaciones
│   └── animation/
│       └── states/
│           └── animation-state.js  # Clase AnimationState
└── systems/
    └── input-manager.js          # Detecta eventos de teclado
```

**Problemas identificados:**

1. **Falta de Configuración Centralizada**:
   - El cooldown de dodge no existe actualmente
   - La velocidad de dodge está hardcodeada en `physics-system.js` (20 celdas/segundo)
   - La duración de i-frames (si se implementa) no está configurada
   - No hay configuración para distinguir entre diferentes tipos de dodge (roll vs stand)

2. **Estado de Dodge No Persistente**:
   - `defenseType: 'dodge'` se resetea cada frame en `combat.reset()`
   - No hay forma de trackear si el jugador está actualmente haciendo dodge
   - La animación puede interrumpirse antes de terminar

3. **Sincronización entre Sistemas**:
   - `InputSystem` setea `wantsToDodge = true`
   - `CombatSystem` procesa y setea `defenseType = 'dodge'`
   - `PhysicsSystem` aplica movimiento y resetea `wantsToDodge = false`
   - `AnimationMixerSystem` reproduce animación, pero no hay comunicación de cuando termina
   - No hay sistema para detectar cuando la animación de dodge termina y resetear el estado

4. **Falta de Cooldown y Protección**:
   - No hay cooldown para evitar spam de dodge
   - No hay protección contra interrupciones durante el dodge
   - No hay i-frames (invencibilidad durante dodge)

5. **Arquitectura no Escalable**:
   - Si queremos agregar más tipos de dodge o acciones similares, habría que modificar múltiples sistemas
   - No hay separación clara entre "acción iniciada" y "acción en progreso"
   - La lógica de cooldown estaría hardcodeada en el sistema en lugar de estar en configuración

## Necesidades Futuras

### Categorías de Acciones de Combate

1. **Acciones con Animación y Cooldown** (estado actual):
   - Dodge (roll_dodge)
   - Special Attack (sword_judgment)
   - Heavy Attack (heavy_hammer_swing)
   - Charged Attack (charged_axe_chop)
   - Requisitos: Cooldown, protección contra interrupciones, estado persistente durante animación

2. **Acciones con Movimiento Asociado** (nuevo):
   - Dodge con impulso de movimiento
   - Dash/Charge (futuro)
   - Backstep (futuro)
   - Requisitos: Velocidad configurable, dirección basada en input o cámara

3. **Acciones con I-Frames** (futuro):
   - Dodge con invencibilidad
   - Parry con window específico
   - Requisitos: Sistema de i-frames, detección de colisiones/damage

### Requisitos de Escalabilidad

1. **Fácil agregar nuevas acciones**: Configuración declarativa en lugar de código hardcodeado
2. **Reutilización de código**: Sistema genérico para acciones con animación + movimiento + cooldown
3. **Separación de responsabilidades**: Configuración separada de lógica de sistemas
4. **Extensibilidad**: Fácil agregar nuevos tipos de acciones (dash, backstep, etc.)
5. **Mantenibilidad**: Cambiar valores (cooldown, velocidad) sin tocar código

## Arquitectura Propuesta

### Estructura de Configuración

```
frontend/src/config/
├── animation-config.js          # Estados de animación (ya existe)
├── input-map-config.js          # Mapeo de teclas (ya existe)
└── combat-actions-config.js     # NUEVO: Configuración de acciones de combate
```

### Nueva Configuración: `combat-actions-config.js`

```javascript
export const COMBAT_ACTIONS = {
    dodge: {
        id: 'dodge',
        inputAction: 'dodge',  // Referencia a INPUT_MAP
        animation: 'roll_dodge',
        animationState: 'dodge',  // Referencia a ANIMATION_STATES
        defenseType: 'dodge',
        
        // Cooldown
        cooldown: 0.5,  // segundos
        
        // Movimiento
        hasMovement: true,
        movementSpeed: 20,  // celdas/segundo
        movementType: 'directional',  // 'directional' | 'forward' | 'backward' | 'none'
        useMovementInput: true,  // Si true, usa input.moveDirection, si false, usa cámara
        
        // Protección
        preventInterruption: true,
        canCancel: false,
        isOneShot: true,
        
        // I-Frames (para futuro)
        hasIFrames: false,
        iFrameStart: 0.0,  // porcentaje de la animación (0.0 = inicio)
        iFrameEnd: 0.3,    // porcentaje de la animación (0.3 = 30% del total)
    },
    
    specialAttack: {
        id: 'specialAttack',
        inputAction: 'specialAttack',
        animation: 'sword_judgment',
        animationState: 'special_attack',
        attackType: 'special',
        
        // Cooldown
        cooldown: 2.0,  // segundos
        
        // Movimiento
        hasMovement: false,
        
        // Protección
        preventInterruption: true,
        canCancel: false,
        isOneShot: true,
        
        // I-Frames
        hasIFrames: false,
    },
    
    // ... más acciones
};
```

### Componente de Combate Mejorado

**Archivo:** `frontend/src/ecs/components/combat.js`

```javascript
export class CombatComponent {
    constructor() {
        // ... propiedades existentes ...
        
        /**
         * Acción de combate actualmente en progreso
         * @type {string|null} ID de la acción (ej: 'dodge', 'specialAttack')
         */
        this.activeAction = null;
        
        /**
         * Timestamp de cuando se inició la acción actual
         * @type {number|null} Timestamp en milisegundos
         */
        this.actionStartTime = null;
        
        /**
         * Cooldowns por acción
         * @type {Map<string, number>} Map<actionId, cooldownRemaining>
         */
        this.actionCooldowns = new Map();
        
        /**
         * Si la acción actual tiene i-frames activos
         * @type {boolean}
         */
        this.hasIFrames = false;
    }
    
    /**
     * Iniciar una acción de combate
     */
    startAction(actionId) {
        this.activeAction = actionId;
        this.actionStartTime = performance.now();
        // El sistema se encargará de setear defenseType/attackType según la configuración
    }
    
    /**
     * Finalizar la acción actual
     */
    endAction() {
        this.activeAction = null;
        this.actionStartTime = null;
        this.hasIFrames = false;
    }
    
    /**
     * Verificar si una acción está en cooldown
     */
    isOnCooldown(actionId) {
        const remaining = this.actionCooldowns.get(actionId) || 0;
        return remaining > 0;
    }
    
    /**
     * Actualizar cooldowns
     */
    updateCooldowns(deltaTime) {
        for (const [actionId, remaining] of this.actionCooldowns.entries()) {
            const newRemaining = remaining - deltaTime;
            if (newRemaining <= 0) {
                this.actionCooldowns.delete(actionId);
            } else {
                this.actionCooldowns.set(actionId, newRemaining);
            }
        }
    }
}
```

### Sistema de Combate Mejorado

**Archivo:** `frontend/src/ecs/systems/combat-system.js`

```javascript
import { COMBAT_ACTIONS } from '../../config/combat-actions-config.js';

export class CombatSystem extends System {
    update(deltaTime) {
        const entities = this.getEntities();
        
        for (const entityId of entities) {
            const input = this.ecs.getComponent(entityId, 'Input');
            const combat = this.ecs.getComponent(entityId, 'Combat');
            
            if (!input || !combat) continue;
            
            // Actualizar cooldowns
            combat.updateCooldowns(deltaTime);
            
            // Si hay una acción activa, verificar si debe continuar o finalizar
            // (esto se manejará en AnimationMixerSystem cuando termine la animación)
            
            // Si no hay acción activa, procesar nuevos inputs
            if (!combat.activeAction) {
                combat.reset();
                
                // Procesar acciones en orden de prioridad
                for (const [actionId, actionConfig] of Object.entries(COMBAT_ACTIONS)) {
                    // Verificar input
                    const wantsAction = this.checkActionInput(input, actionConfig.inputAction);
                    
                    if (wantsAction && !combat.isOnCooldown(actionId)) {
                        // Iniciar acción
                        combat.startAction(actionId);
                        this.applyActionConfig(combat, actionConfig);
                        
                        // Aplicar cooldown
                        combat.actionCooldowns.set(actionId, actionConfig.cooldown);
                        
                        return; // Una acción por frame
                    }
                }
            }
        }
    }
    
    applyActionConfig(combat, config) {
        // Setear tipo de ataque/defensa
        if (config.defenseType) {
            combat.defenseType = config.defenseType;
        }
        if (config.attackType) {
            combat.attackType = config.attackType;
        }
        
        // Setear animación
        combat.combatAnimation = config.animation;
        
        // Setear flags de protección
        combat.canCancel = config.canCancel;
        combat.isAttacking = config.attackType !== null;
    }
}
```

### Sistema de Física Mejorado

**Archivo:** `frontend/src/ecs/systems/physics-system.js`

```javascript
import { COMBAT_ACTIONS } from '../../config/combat-actions-config.js';

export class PhysicsSystem extends System {
    updatePhysics(timestep) {
        // ... código existente ...
        
        // Aplicar movimiento de acciones de combate
        if (input && combat && combat.activeAction) {
            const actionConfig = COMBAT_ACTIONS[combat.activeAction];
            
            if (actionConfig && actionConfig.hasMovement) {
                const movementSpeed = actionConfig.movementSpeed;
                
                // Calcular dirección según configuración
                let dirX = 0, dirY = 0;
                
                if (actionConfig.useMovementInput && 
                    (input.moveDirection.x !== 0 || input.moveDirection.y !== 0)) {
                    // Usar dirección de input
                    dirX = input.moveDirection.x;
                    dirY = input.moveDirection.y;
                } else {
                    // Usar dirección de cámara (hacia adelante)
                    const render = this.ecs.getComponent(entityId, 'Render');
                    const cameraRotation = render?.rotationY || 0;
                    const cos = Math.cos(cameraRotation);
                    const sin = Math.sin(cameraRotation);
                    dirX = -sin;
                    dirY = -cos;
                }
                
                // Aplicar impulso (solo una vez al inicio de la acción)
                if (!mesh.userData.movementApplied) {
                    physics.velocity.x = dirX * movementSpeed;
                    physics.velocity.y = dirY * movementSpeed;
                    mesh.userData.movementApplied = true;
                }
            }
        }
    }
}
```

### AnimationMixerSystem Mejorado

**Archivo:** `frontend/src/ecs/systems/animation-mixer-system.js`

```javascript
import { COMBAT_ACTIONS } from '../../config/combat-actions-config.js';

export class AnimationMixerSystem extends System {
    update(deltaTime) {
        // ... código existente ...
        
        // Verificar si acciones de combate terminaron
        if (mesh.userData.combatAction) {
            const action = mesh.userData.combatAction;
            const actionDuration = action.getClip().duration;
            
            // Actualizar i-frames si corresponde
            if (mesh.userData.entityId) {
                const combat = this.ecs.getComponent(mesh.userData.entityId, 'Combat');
                if (combat && combat.activeAction) {
                    const actionConfig = COMBAT_ACTIONS[combat.activeAction];
                    if (actionConfig && actionConfig.hasIFrames) {
                        const progress = action.time / actionDuration;
                        combat.hasIFrames = progress >= actionConfig.iFrameStart && 
                                           progress <= actionConfig.iFrameEnd;
                    }
                }
            }
            
            // Cuando la animación termine
            if (!action.isRunning() && action.time >= actionDuration) {
                mesh.userData.combatAction = null;
                mesh.userData.movementApplied = false;
                
                // Finalizar acción en CombatComponent
                const entityId = mesh.userData.entityId;
                if (entityId) {
                    const combat = this.ecs.getComponent(entityId, 'Combat');
                    if (combat) {
                        combat.endAction();
                    }
                }
            }
        }
    }
}
```

## Patrones de Diseño a Usar

### 1. Configuration Pattern
- **Descripción**: Separar datos de configuración (valores, parámetros) de la lógica de código
- **Cómo se aplica**: Todas las acciones de combate están definidas en `combat-actions-config.js` con sus propiedades (cooldown, velocidad, animación, etc.)
- **Beneficios**: Fácil cambiar valores sin tocar código, fácil agregar nuevas acciones

### 2. State Machine Pattern (ya existe, se mejora)
- **Descripción**: Estados claros para acciones: "inactivo", "en progreso", "en cooldown"
- **Cómo se aplica**: `CombatComponent.activeAction` trackea el estado actual, `actionCooldowns` trackea estados de cooldown
- **Beneficios**: Comportamiento predecible, fácil debuggear estados

### 3. Strategy Pattern (implícito)
- **Descripción**: Diferentes estrategias de movimiento según tipo de acción
- **Cómo se aplica**: `movementType` y `useMovementInput` en configuración permiten diferentes comportamientos
- **Beneficios**: Fácil agregar nuevos tipos de movimiento (dash, backstep, etc.)

### 4. Observer Pattern (para futuro)
- **Descripción**: Notificar cuando acciones terminan o i-frames cambian
- **Cómo se aplica**: Sistemas pueden observar cambios en `CombatComponent.activeAction`
- **Beneficios**: Desacoplamiento, fácil agregar listeners para efectos visuales/sonidos

## Beneficios de la Nueva Arquitectura

1. **Configuración Centralizada**: Todos los valores (cooldown, velocidad, animaciones) en un solo lugar
2. **Escalabilidad**: Agregar nuevas acciones solo requiere agregar entrada en `COMBAT_ACTIONS`
3. **Mantenibilidad**: Cambiar valores no requiere tocar código de sistemas
4. **Claridad**: Estado explícito de acciones (`activeAction`, `actionCooldowns`)
5. **Extensibilidad**: Fácil agregar nuevas características (i-frames, diferentes tipos de movimiento)
6. **Testeable**: Configuración separada facilita testing y mocking

## Migración Propuesta

### Fase 1: Crear Configuración de Acciones
- Crear `frontend/src/config/combat-actions-config.js`
- Definir estructura de `COMBAT_ACTIONS`
- Migrar valores hardcodeados (velocidad de dodge, etc.) a configuración
- **Archivos**: `frontend/src/config/combat-actions-config.js` (nuevo)

### Fase 2: Mejorar CombatComponent
- Agregar propiedades: `activeAction`, `actionStartTime`, `actionCooldowns`, `hasIFrames`
- Agregar métodos: `startAction()`, `endAction()`, `isOnCooldown()`, `updateCooldowns()`
- **Archivos**: `frontend/src/ecs/components/combat.js` (modificar)

### Fase 3: Refactorizar CombatSystem
- Importar `COMBAT_ACTIONS`
- Cambiar lógica para usar configuración en lugar de código hardcodeado
- Implementar sistema de cooldowns
- **Archivos**: `frontend/src/ecs/systems/combat-system.js` (modificar)

### Fase 4: Refactorizar PhysicsSystem
- Importar `COMBAT_ACTIONS`
- Cambiar lógica de movimiento para usar configuración
- Manejar `movementApplied` flag para aplicar impulso solo una vez
- **Archivos**: `frontend/src/ecs/systems/physics-system.js` (modificar)

### Fase 5: Mejorar AnimationMixerSystem
- Detectar cuando animaciones de combate terminan
- Actualizar i-frames si corresponde
- Llamar `combat.endAction()` cuando termine
- **Archivos**: `frontend/src/ecs/systems/animation-mixer-system.js` (modificar)

### Fase 6: Testing y Ajustes
- Probar dodge con cooldown
- Verificar que animación no se interrumpe
- Verificar que movimiento funciona correctamente
- Ajustar valores de configuración según feedback

## Consideraciones Técnicas

### Frontend

1. **Compatibilidad**: Los cambios son compatibles con el sistema ECS existente, solo se agregan propiedades y métodos
2. **Performance**: El sistema de cooldowns es eficiente (Map lookup es O(1))
3. **Extensibilidad**: La configuración permite agregar nuevas acciones sin modificar sistemas
4. **Testing**: La configuración separada facilita testing unitario

### Configuración

1. **Validación**: Considerar validar configuración al inicio para detectar errores temprano
2. **Hot Reload**: Si se implementa hot reload, la configuración debería recargarse automáticamente
3. **Defaults**: Definir valores por defecto para propiedades opcionales

### I-Frames (Futuro)

1. **Sistema de Damage**: Necesitará integrarse con sistema de daño cuando se implemente
2. **Visual Feedback**: Considerar efectos visuales durante i-frames (opcional)
3. **Colisiones**: El sistema de colisiones necesitará verificar `combat.hasIFrames`

## Ejemplo de Uso Futuro

```javascript
// Agregar nuevo tipo de dodge (backstep) solo requiere configuración:

// En combat-actions-config.js:
export const COMBAT_ACTIONS = {
    // ... acciones existentes ...
    
    backstep: {
        id: 'backstep',
        inputAction: 'backstep',  // Definido en input-map-config.js
        animation: 'backstep',
        animationState: 'backstep',
        defenseType: 'dodge',
        cooldown: 0.3,
        hasMovement: true,
        movementSpeed: 15,
        movementType: 'backward',  // Nuevo tipo
        useMovementInput: false,   // Siempre hacia atrás
        preventInterruption: true,
        canCancel: false,
        isOneShot: true,
        hasIFrames: true,
        iFrameStart: 0.0,
        iFrameEnd: 0.2,
    },
};

// No se requiere modificar ningún sistema, todo funciona automáticamente!
```

## Conclusión

La nueva arquitectura propuesta separa la configuración de la lógica, permitiendo que el sistema de dodge (y futuras acciones de combate) sea:
- **Configurable**: Valores en archivo de configuración, no hardcodeados
- **Escalable**: Fácil agregar nuevas acciones
- **Mantenible**: Cambios de valores no requieren modificar código
- **Extensible**: Preparado para features futuras (i-frames, diferentes tipos de movimiento)

La migración puede hacerse de forma incremental, fase por fase, sin romper funcionalidad existente. Cada fase puede probarse y ajustarse antes de continuar con la siguiente.

