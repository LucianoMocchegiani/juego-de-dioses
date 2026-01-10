# Análisis de Arquitectura - Sistema de Ambiente y Natación (JDG-024)

## Situación Actual

### Frontend

**Estructura actual:**

```
frontend/src/
├── ecs/
│   ├── components/
│   │   ├── physics.js          # PhysicsComponent (sin isInWater)
│   │   ├── position.js
│   │   ├── input.js
│   │   └── ...
│   ├── systems/
│   │   ├── collision-system.js # Solo detecta partículas 'solido'
│   │   ├── animation-state-system.js
│   │   └── ...
│   ├── conditions/
│   │   ├── base-condition.js
│   │   ├── physics-condition.js
│   │   ├── input-condition.js
│   │   ├── movement-condition.js
│   │   ├── condition-factory.js # No incluye tipo 'water'
│   │   └── index.js
│   └── states/
│       └── state-registry.js
└── config/
    ├── animation-config.js     # No tiene estados swim/swim_idle
    └── animation-constants.js  # No tiene CONDITION_TYPES.WATER
```

**Problemas identificados:**

1. **Falta de detección de agua**: El `CollisionSystem` solo detecta partículas con `estado_nombre === 'solido'` para colisiones. No hay detección de partículas líquidas (agua, lava, pantano, etc.).

2. **Falta de componente o propiedad para ambiente**: No existe `EnvironmentComponent` ni propiedad `isInWater` en `PhysicsComponent` para rastrear el estado ambiental de la entidad.

3. **Falta de condición WaterCondition**: El sistema de condiciones tiene tipos `INPUT`, `PHYSICS`, `MOVEMENT`, `COMBO`, `COMBAT`, pero no tiene tipo `WATER` o `ENVIRONMENT` para evaluar condiciones ambientales.

4. **Estados de animación de natación no configurados**: Las animaciones `swimming_to_edge`, `swim_idle`, y `swim_forward` existen en `ANIMATION_FILES`, pero no hay estados `swim` y `swim_idle` en `ANIMATION_STATES`.

5. **Contexto de evaluación incompleto**: El `AnimationStateSystem` crea un contexto con `input`, `physics`, `combo`, `combat`, pero no incluye información ambiental (si está en agua, lava, etc.).

### Backend

**Estructura actual:**

```
backend/src/
├── api/routes/
│   └── particles.py        # Retorna partículas con tipo_nombre y estado_nombre
└── models/
    └── schemas.py          # ParticleResponse incluye tipo_nombre y estado_nombre
```

**Problemas identificados:**

1. **No hay problemas identificados en backend**: El backend ya provee la información necesaria (`tipo_nombre` y `estado_nombre`) en las respuestas de partículas. No se requieren cambios.

### Base de Datos

**Estructura actual:**

```
database/init/
├── 01-init-schema.sql    # Define tipos_particulas y estados_materia
└── 02-seed-data.sql      # Incluye tipos: 'agua', 'agua_sucia', 'lava', 'pantano'
```

**Problemas identificados:**

1. **No hay problemas identificados en base de datos**: La base de datos ya tiene los tipos de partículas líquidas definidos ('agua', 'agua_sucia', 'lava', 'pantano') con `tipo_fisico = 'liquido'` y `estado_nombre = 'liquido'`. No se requieren cambios.

## Necesidades Futuras

### Categorías de Entidades/Funcionalidades

1. **Detección de Ambiente Líquido** (nuevo):
   - Agua: `tipo_nombre === 'agua'` o `tipo_nombre === 'agua_sucia'`
   - Lava: `tipo_nombre === 'lava'`
   - Pantano: `tipo_nombre === 'pantano'`
   - Otros líquidos: `estado_nombre === 'liquido'` como fallback genérico
   - Requisitos específicos:
     - Detectar cuando una entidad entra/sale de un líquido
     - Rastrear qué tipo de líquido (agua, lava, etc.) para futuras features (daño por lava, resistencia al agua, etc.)

2. **Estados de Animación de Natación** (nuevo):
   - Estado `swim`: Activado cuando está en agua + hay movimiento
   - Estado `swim_idle`: Activado cuando está en agua + sin movimiento
   - Prioridad adecuada para que tenga precedencia sobre walk/run
   - Transiciones suaves al entrar/salir del agua

3. **Sistema de Condiciones Ambientales** (nuevo):
   - Condición `WATER` para evaluar si está en agua
   - Extensible para futuras condiciones ambientales (lava, gas tóxico, etc.)

### Requisitos de Escalabilidad

1. **Fácil agregar nuevos tipos de líquidos**: El sistema debe poder detectar nuevos tipos de líquidos sin modificar código core, solo agregando nombres en configuración.

2. **Reutilización de código**: El sistema de detección de ambiente debe ser reutilizable para otros ambientes (aire envenenado, zonas mágicas, etc.).

3. **Separación de responsabilidades**: La detección de ambiente debe estar separada de la física básica, pero integrada con el sistema de colisiones.

4. **Extensibilidad**: El sistema debe permitir agregar efectos adicionales según el tipo de ambiente (velocidad reducida en agua, daño por lava, etc.).

5. **Mantenibilidad**: El código debe seguir el patrón ECS existente y usar el sistema de condiciones para consistencia.

## Arquitectura Propuesta

### Frontend - Estructura Modular

```
frontend/src/
├── ecs/
│   ├── components/
│   │   ├── physics.js              # Agregar isInWater, waterType (opcional)
│   │   └── environment.js          # OPCIÓN B: Nuevo componente (alternativa)
│   ├── systems/
│   │   ├── collision-system.js     # Modificar: Detectar partículas líquidas
│   │   └── animation-state-system.js # Modificar: Incluir ambiente en contexto
│   ├── conditions/
│   │   ├── water-condition.js      # NUEVO: Condición para evaluar agua
│   │   ├── condition-factory.js    # Modificar: Agregar caso 'water'
│   │   └── index.js                # Modificar: Exportar WaterCondition
│   └── states/
│       └── state-registry.js       # Sin cambios
└── config/
    ├── animation-config.js         # Modificar: Agregar estados swim/swim_idle
    └── animation-constants.js      # Modificar: Agregar CONDITION_TYPES.WATER
```

### Jerarquía de Componentes

**Opción A (Recomendada - Menor impacto):**
```
PhysicsComponent
├── velocity, acceleration (existente)
├── isGrounded (existente)
├── isFlying (existente)
└── isInWater (NUEVO)
    └── boolean
```

**Opción B (Alternativa - Más extensible):**
```
PhysicsComponent (sin cambios)
EnvironmentComponent (NUEVO)
├── isInWater
├── waterType ('agua' | 'agua_sucia' | 'lava' | 'pantano' | null)
└── future: isInLava, isInGas, etc.
```

**Decisión:** Usar Opción A inicialmente (agregar `isInWater` a `PhysicsComponent`) porque:
- Menor refactorización
- Consistente con `isGrounded` e `isFlying`
- Suficiente para natación básica
- Puede migrarse a Opción B en el futuro si se necesita más complejidad

### Flujo de Detección de Agua

```
CollisionSystem.update()
├── Para cada entidad:
│   ├── Obtener posición actual
│   ├── Consultar partículas en posición (usando spatialGrid o particles cargadas)
│   ├── Filtrar partículas líquidas:
│   │   ├── Verificar estado_nombre === 'liquido' (genérico)
│   │   └── O verificar tipo_nombre específico ('agua', 'agua_sucia', 'lava', etc.)
│   ├── Si hay partícula líquida en posición:
│   │   ├── physics.isInWater = true
│   │   └── (Opcional) physics.waterType = particle.tipo_nombre
│   └── Si no hay partícula líquida:
│       └── physics.isInWater = false
```

### Flujo de Estados de Animación

```
AnimationStateSystem.update()
├── Crear contexto (input, physics, combo, combat)
├── Agregar ambiente al contexto (physics.isInWater)
├── StateRegistry.determineActiveState(context)
│   ├── Evaluar condiciones de cada estado
│   ├── Estado 'swim' (priority 7.5):
│   │   ├── Condición: { type: 'water', operator: 'isInWater' }
│   │   └── Condición: { type: 'movement', operator: 'hasMovement' }
│   ├── Estado 'swim_idle' (priority 7.5):
│   │   ├── Condición: { type: 'water', operator: 'isInWater' }
│   │   └── Condición: { type: 'movement', operator: 'noMovement' }
│   └── Prioridad swim/swim_idle > walk/run/idle
└── Activar estado seleccionado
```

## Patrones de Diseño a Usar

### 1. Strategy Pattern (Sistema de Condiciones)
- **Descripción del patrón**: Encapsula algoritmos de evaluación en clases separadas que implementan una interfaz común.
- **Cómo se aplica en el proyecto**: `BaseCondition` es la interfaz, `WaterCondition`, `PhysicsCondition`, `InputCondition`, etc. son estrategias específicas.
- **Beneficios**: 
  - Fácil agregar nuevas condiciones (solo crear nueva clase e integrarla en factory)
  - Cada condición es independiente y testeable
  - Consistente con el patrón existente

### 2. Factory Pattern (ConditionFactory)
- **Descripción del patrón**: Crea objetos sin especificar la clase exacta del objeto que se creará.
- **Cómo se aplica en el proyecto**: `ConditionFactory.create()` crea instancias de condiciones basándose en `type` de la configuración.
- **Beneficios**:
  - Centraliza la lógica de creación de condiciones
  - Facilita agregar nuevos tipos (solo agregar caso en switch)
  - Desacopla el código que usa condiciones de las clases concretas

### 3. State Pattern (State Registry)
- **Descripción del patrón**: Permite que un objeto altere su comportamiento cuando su estado interno cambia.
- **Cómo se aplica en el proyecto**: `StateRegistry` maneja la transición entre estados de animación (`idle`, `walk`, `run`, `swim`, etc.).
- **Beneficios**:
  - Estados claramente definidos con prioridades y condiciones
  - Transiciones controladas
  - Fácil agregar nuevos estados sin modificar lógica existente

### 4. Component Pattern (ECS)
- **Descripción del patrón**: Separar datos (componentes) de lógica (sistemas).
- **Cómo se aplica en el proyecto**: `PhysicsComponent` almacena `isInWater`, `CollisionSystem` actualiza el valor, `AnimationStateSystem` lo lee.
- **Beneficios**:
  - Separación clara de responsabilidades
  - Componentes reutilizables
  - Sistemas pueden trabajar independientemente

## Beneficios de la Nueva Arquitectura

1. **Extensibilidad**: El sistema puede detectar diferentes tipos de líquidos y ambientes sin cambios en código core, solo agregando tipos en configuración.

2. **Consistencia**: Usa el mismo patrón de condiciones que el resto del sistema de animaciones, manteniendo el código coherente.

3. **Mantenibilidad**: El código sigue los patrones ECS existentes, facilitando el mantenimiento y la comprensión.

4. **Reutilización**: El sistema de detección de ambiente puede reutilizarse para otros ambientes (lava, gas, etc.) en el futuro.

5. **Performance**: La detección se integra en el `CollisionSystem` existente que ya consulta partículas, minimizando queries adicionales.

6. **Escalabilidad**: Puede extenderse fácilmente para agregar efectos ambientales (velocidad reducida en agua, daño por lava, resistencia, etc.).

## Migración Propuesta

### Fase 1: Detección de Agua en CollisionSystem

**Pasos:**
1. Modificar `CollisionSystem.updateLoadedCells()` o crear método similar `updateLoadedLiquidCells()` para filtrar partículas líquidas.
2. Agregar método `detectWater(position)` que consulta partículas en posición y retorna si hay líquido.
3. En `CollisionSystem.update()`, después de procesar colisiones sólidas, llamar `detectWater()` para cada entidad.
4. Actualizar `physics.isInWater` basándose en el resultado.
5. Agregar `isInWater: false` en constructor de `PhysicsComponent`.

**Archivos a modificar:**
- `frontend/src/ecs/components/physics.js`
- `frontend/src/ecs/systems/collision-system.js`

**Consideraciones:**
- Usar partículas ya cargadas si están disponibles (optimización)
- Si no hay partículas cargadas, puede usar `collisionDetector` o consultar directamente
- Definir constantes para tipos de líquidos en `ANIMATION_CONSTANTS`

### Fase 2: Crear WaterCondition

**Pasos:**
1. Crear `frontend/src/ecs/conditions/water-condition.js` que extienda `BaseCondition`.
2. Implementar `evaluate(context)` que verifica `context.physics.isInWater`.
3. Agregar `CONDITION_TYPES.WATER = 'water'` en `animation-constants.js`.
4. Modificar `ConditionFactory` para incluir caso `'water'` → `new WaterCondition()`.
5. Exportar `WaterCondition` en `index.js`.

**Archivos a crear:**
- `frontend/src/ecs/conditions/water-condition.js`

**Archivos a modificar:**
- `frontend/src/config/animation-constants.js`
- `frontend/src/ecs/conditions/condition-factory.js`
- `frontend/src/ecs/conditions/index.js`

**Consideraciones:**
- Seguir el mismo patrón que `PhysicsCondition` para consistencia
- El operador `isInWater` puede ser un booleano simple (true/false)

### Fase 3: Configurar Estados de Natación

**Pasos:**
1. Agregar estados `swim` y `swim_idle` en `ANIMATION_STATES` de `animation-config.js`.
2. Configurar prioridades (7.5, mayor que walk/run pero menor que combate).
3. Configurar condiciones usando tipo `'water'`.
4. Configurar animaciones: `swim` → `swim_forward` o `swimming_to_edge`, `swim_idle` → `swim_idle`.
5. Agregar transiciones apropiadas.

**Archivos a modificar:**
- `frontend/src/config/animation-config.js`

**Consideraciones:**
- Prioridad debe ser mayor que `walk` (4) y `run` (5) pero menor que `jump` (9) y `combat` (10-12)
- Usar animación `swim_forward` para movimiento, `swim_idle` para quieto
- Las animaciones ya existen en `ANIMATION_FILES`, solo falta configurar estados

### Fase 4: Integrar en AnimationStateSystem

**Pasos:**
1. Verificar que `physics` ya está en el contexto (ya está incluido).
2. El `WaterCondition` ya puede acceder a `context.physics.isInWater`.
3. No se requieren cambios adicionales, el sistema ya soporta el patrón.

**Archivos a revisar:**
- `frontend/src/ecs/systems/animation-state-system.js` (verificar que no requiere cambios)

**Consideraciones:**
- El contexto ya incluye `physics`, por lo que `WaterCondition` funcionará sin modificaciones
- Si en el futuro se necesita más información ambiental, puede agregarse al contexto

### Fase 5: Testing y Ajustes

**Escenarios de prueba:**
1. Entrar al agua: Caminar hacia partículas de agua → `isInWater = true` → activar `swim` o `swim_idle`.
2. Nadar: Moverse en agua → activar `swim` con animación de natación.
3. Flotar: Quedarse quieto en agua → activar `swim_idle`.
4. Salir del agua: Caminar fuera → `isInWater = false` → volver a `walk`/`run`/`idle`.
5. Diferentes tipos de líquidos: Verificar que detecta agua, agua_sucia, lava, pantano.

**Ajustes potenciales:**
- Ajustar umbral de detección (¿detectar en misma celda Z o Z-1?).
- Agregar debounce/throttle para evitar flickering si hay múltiples partículas.
- Considerar velocidad de movimiento en agua (reducción futura).

## Consideraciones Técnicas

### Frontend

1. **Renderizado**: No se requieren cambios en el sistema de renderizado. Las animaciones ya existen y se activarán automáticamente cuando cambien los estados.

2. **Optimización**: 
   - Usar `spatialGrid` si está disponible para queries eficientes de partículas líquidas.
   - Cachear resultados de detección de agua si la entidad no se ha movido significativamente.
   - Reutilizar queries de colisión para también detectar líquidos (misma área).

3. **Extensibilidad**: 
   - El sistema puede extenderse fácilmente para detectar otros ambientes (lava para daño, gas para efectos).
   - Puede agregarse `waterType` en el futuro si se necesita comportamiento diferente por tipo de líquido.
   - Puede agregarse profundidad de agua para efectos adicionales.

### Backend

1. **Compatibilidad**: No se requieren cambios en backend. Las partículas ya incluyen `tipo_nombre` y `estado_nombre`.

2. **Base de datos**: No se requieren cambios. Los tipos de líquidos ya están definidos.

3. **APIs**: No se requieren cambios. El endpoint `/particles` ya retorna la información necesaria.

### Testing

1. **Unit Tests**: Probar `WaterCondition.evaluate()` con diferentes valores de `isInWater`.
2. **Integration Tests**: Probar flujo completo: CollisionSystem detecta agua → PhysicsComponent actualizado → AnimationStateSystem activa estado.
3. **Manual Testing**: Verificar visualmente que las animaciones de natación se activan correctamente.

## Ejemplo de Uso Futuro

```javascript
// Estado de natación configurado en animation-config.js
{
    id: 'swim',
    type: 'movement',
    priority: 7.5,
    conditions: [
        { type: 'water', operator: 'isInWater' },
        { type: 'movement', operator: 'hasMovement' }
    ],
    animation: 'swim_forward',
    transitions: ['swim_idle', 'idle', 'walk']
},
{
    id: 'swim_idle',
    type: 'idle',
    priority: 7.5,
    conditions: [
        { type: 'water', operator: 'isInWater' },
        { type: 'movement', operator: 'noMovement' }
    ],
    animation: 'swim_idle',
    transitions: ['swim', 'idle']
}

// CollisionSystem detecta agua
const liquidParticles = particles.filter(p => 
    p.estado_nombre === 'liquido' || 
    ['agua', 'agua_sucia', 'lava', 'pantano'].includes(p.tipo_nombre)
);

if (liquidParticles.length > 0) {
    physics.isInWater = true;
} else {
    physics.isInWater = false;
}

// WaterCondition evalúa
class WaterCondition extends BaseCondition {
    evaluate(context) {
        const { physics } = context;
        if (!physics) return false;
        
        if (this.config.operator === 'isInWater') {
            return physics.isInWater === true;
        }
        
        return false;
    }
}
```

## Conclusión

El análisis propone una arquitectura escalable y mantenible para implementar el sistema de detección de agua y natación. La solución:

- **Usa patrones existentes**: Sigue el patrón ECS y el sistema de condiciones ya establecido.
- **Minimiza cambios**: Agrega funcionalidad sin romper código existente.
- **Es extensible**: Puede agregar más tipos de ambientes y efectos en el futuro.
- **Es performante**: Reutiliza queries existentes y usa optimizaciones del sistema actual.
- **Es testeable**: Cada componente es independiente y puede probarse por separado.

La implementación se divide en 5 fases claras que permiten verificar el progreso en cada etapa y ajustar según sea necesario. El backend y la base de datos no requieren cambios, lo que minimiza el riesgo y la complejidad del cambio.
