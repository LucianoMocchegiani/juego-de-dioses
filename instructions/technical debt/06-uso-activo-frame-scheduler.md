# Technical Debt: Uso Activo de Frame Scheduler en Sistemas

**Fecha**: 2026-01-07  
**Ticket Relacionado**: JDG-049  
**Prioridad**: Baja  
**Estado**: Pendiente (sistema creado, uso opcional pendiente)

## Contexto

Durante la implementación de las optimizaciones avanzadas (JDG-049), se creó el sistema `FrameScheduler` para distribuir trabajo pesado a lo largo de múltiples frames, evitando sobrecarga en un solo frame. El sistema está completamente funcional e integrado en el `ECSManager`, pero los sistemas individuales aún no lo están usando activamente para distribuir su carga de trabajo.

## Situación Actual

**Implementación actual**: Sistema `FrameScheduler` creado e integrado pero sin uso activo

**Archivos creados:**
- `frontend/src/core/optimizations/frame-scheduler.js` - Sistema completo y funcional
- Integrado en `ECSManager` y disponible globalmente

**Integración actual:**
```javascript
// app.js - FrameScheduler inicializado
this.frameScheduler = new FrameScheduler();

// ecs/manager.js - FrameScheduler conectado
this.ecs.setFrameScheduler(this.frameScheduler);

// Estado: Disponible pero sin uso activo
```

**Sistemas que podrían beneficiarse:**
- `CollisionSystem` - Verificación de colisiones
- `PhysicsSystem` - Cálculos de física
- `AnimationMixerSystem` - Actualización de animaciones (parcialmente con LOD)
- `RenderSystem` - Actualización de posiciones/rotaciones

## Problema Identificado

**Trabajo no distribuido:**

1. **Todos los sistemas actualizan todas las entidades cada frame:**
   - CollisionSystem verifica colisiones de todas las entidades cada frame
   - PhysicsSystem actualiza física de todas las entidades cada frame
   - RenderSystem actualiza posiciones de todas las entidades cada frame

2. **Impacto en FPS:**
   - Con muchas entidades (50+), un frame puede tener trabajo excesivo
   - Picos de CPU causan stutters
   - FPS inconsistente

3. **Oportunidad de optimización:**
   - Entidades lejanas no necesitan actualización cada frame
   - Física puede calcularse menos frecuentemente para entidades estáticas
   - Colisiones pueden verificarse cada 2-3 frames para entidades lejanas

## Propuesta de Implementación

### Estrategia 1: Frame Scheduling Basado en Distancia

**Enfoque:** Usar distancia a la cámara para determinar frecuencia de actualización

**Frecuencias sugeridas:**
- **Cerca (0-20 unidades):** Cada frame (frecuencia 1)
- **Media (20-50 unidades):** Cada 2 frames (frecuencia 2)
- **Lejos (50+ unidades):** Cada 3-4 frames (frecuencia 3-4)

**Implementación sugerida:**
```javascript
// En cada sistema que quiera usar frame scheduling
update(deltaTime) {
    const entities = this.getEntities();
    const frameScheduler = this.ecs.getFrameScheduler();
    
    if (!frameScheduler) {
        // Fallback: procesar todas las entidades
        this.processAllEntities(entities);
        return;
    }
    
    // Obtener entidades que deben actualizarse este frame
    const entitiesToUpdate = frameScheduler.getEntitiesToUpdate();
    
    // Solo procesar entidades programadas
    for (const entityId of entities) {
        if (entitiesToUpdate.has(entityId)) {
            this.processEntity(entityId);
        }
    }
    
    // Registrar/actualizar frecuencias basadas en distancia
    this.updateSchedulingFrequencies(entities, frameScheduler);
}

updateSchedulingFrequencies(entities, frameScheduler) {
    const camera = this.getCamera();
    
    for (const entityId of entities) {
        const position = this.ecs.getComponent(entityId, 'Position');
        const render = this.ecs.getComponent(entityId, 'Render');
        
        if (!position || !render || !render.mesh) continue;
        
        const distance = render.mesh.position.distanceTo(camera.position);
        let frequency = 1;
        
        if (distance > 50) {
            frequency = 4; // Muy lejos: cada 4 frames
        } else if (distance > 20) {
            frequency = 2; // Lejos: cada 2 frames
        }
        // Cerca: frequency = 1 (cada frame)
        
        // Registrar o actualizar frecuencia
        const oldFrequency = this.entityFrequencies?.get(entityId) || 1;
        if (oldFrequency !== frequency) {
            frameScheduler.updateFrequency(entityId, oldFrequency, frequency);
            this.entityFrequencies.set(entityId, frequency);
        }
    }
}
```

### Estrategia 2: Frame Scheduling Basado en Tipo de Entidad

**Enfoque:** Diferentes frecuencias según tipo de entidad

**Frecuencias sugeridas:**
- **Jugador:** Cada frame (frecuencia 1) - siempre crítico
- **NPCs cercanos:** Cada frame (frecuencia 1)
- **NPCs lejanos:** Cada 2-3 frames (frecuencia 2-3)
- **Entidades estáticas (árboles, rocas):** Cada 4-5 frames (frecuencia 4-5)
- **Partículas/efectos:** Cada 2 frames (frecuencia 2)

**Implementación sugerida:**
```javascript
// Sistema determina frecuencia según tipo
getUpdateFrequency(entityId) {
    const entityType = this.getEntityType(entityId);
    
    switch (entityType) {
        case 'player':
            return 1; // Cada frame
        case 'npc':
            return this.getNPCDistanceFrequency(entityId);
        case 'static':
            return 4; // Cada 4 frames
        case 'particle':
            return 2; // Cada 2 frames
        default:
            return 1;
    }
}
```

### Estrategia 3: Frame Scheduling Híbrido (Distancia + Tipo)

**Enfoque:** Combinar distancia y tipo de entidad

**Ventajas:**
- Máxima flexibilidad
- Optimización granular
- Mejor distribución de carga

**Desventajas:**
- Mayor complejidad
- Requiere más lógica de decisión

## Sistemas a Modificar

### 1. CollisionSystem

**Beneficio esperado:** +3-5 FPS con muchas entidades

**Implementación:**
```javascript
update(deltaTime) {
    const entities = this.getEntities();
    const frameScheduler = this.ecs.getFrameScheduler();
    
    let entitiesToProcess = entities;
    if (frameScheduler) {
        // Solo verificar colisiones para entidades programadas
        const scheduled = frameScheduler.getEntitiesToUpdate();
        entitiesToProcess = Array.from(entities).filter(id => scheduled.has(id));
        
        // Actualizar frecuencias basadas en distancia
        this.updateCollisionFrequencies(entities, frameScheduler);
    }
    
    for (const entityId of entitiesToProcess) {
        // ... lógica de colisiones existente ...
    }
}
```

### 2. PhysicsSystem

**Beneficio esperado:** +5-10 FPS con muchas entidades físicas

**Implementación:**
```javascript
update(deltaTime) {
    const entities = this.getEntities();
    const frameScheduler = this.ecs.getFrameScheduler();
    
    let entitiesToProcess = entities;
    if (frameScheduler) {
        const scheduled = frameScheduler.getEntitiesToUpdate();
        entitiesToProcess = Array.from(entities).filter(id => scheduled.has(id));
        
        // Entidades estáticas pueden actualizarse menos frecuentemente
        this.updatePhysicsFrequencies(entities, frameScheduler);
    }
    
    for (const entityId of entitiesToProcess) {
        // ... lógica de física existente ...
    }
}
```

### 3. RenderSystem

**Beneficio esperado:** +2-5 FPS con muchas entidades

**Nota:** RenderSystem ya tiene Frustum Culling, pero frame scheduling puede ayudar adicionalmente para entidades lejanas que pasan el frustum culling.

### 4. AnimationMixerSystem

**Nota:** Ya tiene LOD que reduce frecuencia de animaciones, pero puede combinarse con frame scheduling para mayor eficiencia.

## Complejidad y Riesgo

**Complejidad:** Media

**Riesgo:** Bajo-Medio

**Razones:**
1. FrameScheduler ya está creado y funcional
2. Los cambios son opcionales (fallback a comportamiento actual)
3. Puede implementarse gradualmente sistema por sistema
4. Bajo riesgo de romper funcionalidad existente

**Consideraciones:**
- Algunas actualizaciones pueden parecer "laggy" si frecuencia es muy baja
- Requiere testing para encontrar frecuencias óptimas
- Puede afectar visualmente si no se implementa correctamente

## Acciones Recomendadas

### Corto Plazo (MVP)

1. **Mantener sistema actual:**
   - FrameScheduler está creado y disponible
   - Sistemas funcionan correctamente sin él
   - No bloquea desarrollo

### Medio Plazo

1. **Piloto con un sistema:**
   - Elegir CollisionSystem como prueba
   - Implementar frame scheduling basado en distancia
   - Medir impacto en FPS y calidad visual
   - Ajustar frecuencias según resultados

2. **Refinar algoritmo:**
   - Determinar distancias óptimas para cambios de frecuencia
   - Ajustar frecuencias según tipo de entidad
   - Optimizar cálculo de distancias (usar Spatial Grid)

### Largo Plazo

1. **Expandir a todos los sistemas:**
   - Implementar en PhysicsSystem
   - Implementar en RenderSystem (complementario a Frustum Culling)
   - Combinar con LOD en AnimationMixerSystem

2. **Sistema adaptativo:**
   - Ajustar frecuencias dinámicamente según FPS actual
   - Si FPS baja, aumentar frecuencia de skip
   - Si FPS es alto, reducir frecuencia de skip

## Métricas de Éxito

**Para medir cuando se implemente:**

1. **FPS:**
   - Mejora de +5-10 FPS con muchas entidades
   - FPS más consistente (menos stutters)

2. **Distribución de carga:**
   - Tiempo de frame más consistente
   - Menos picos de CPU

3. **Calidad visual:**
   - Sin degradación perceptible
   - Animaciones y movimientos suaves

## Archivos Relacionados

**Archivos creados:**
- `frontend/src/core/optimizations/frame-scheduler.js` - Sistema completo
- `frontend/src/ecs/manager.js` - Integración en ECSManager

**Archivos a modificar (cuando se implemente):**
- `frontend/src/ecs/systems/collision-system.js` - Prioridad 1 (piloto)
- `frontend/src/ecs/systems/physics-system.js` - Prioridad 2
- `frontend/src/ecs/systems/render-system.js` - Prioridad 3 (complementario)
- `frontend/src/ecs/systems/animation-mixer-system.js` - Prioridad 4 (combinar con LOD)

**Archivos de referencia:**
- `instructions/tasks/JDG-049-action-plan_2026-01-07_20-12-57.md` - Plan original
- `frontend/src/core/optimizations/README.md` - Documentación del sistema
- `frontend/src/core/optimizations/lod-manager.js` - Sistema relacionado (LOD)

## Referencias Técnicas

- Frame scheduling patterns en juegos: Common optimization for many entities
- LOD + Frame Scheduling: Combinación efectiva para entidades lejanas
- Spatial Grid: Puede usarse para optimizar cálculo de distancias

## Notas Adicionales

- **Prioridad Baja:** No es crítico, mejora incremental
- **Impacto Potencial:** +5-10 FPS adicionales cuando hay muchas entidades
- **Esfuerzo Estimado:** 8-12 horas para implementar en un sistema (piloto)
- **Esfuerzo Estimado:** 20-30 horas para implementar en todos los sistemas
- **Dependencias:** Requiere JDG-049 completado (sistema creado), puede usar Spatial Grid (JDG-049)
- **Complementario:** Funciona bien con LOD (JDG-048) y Frustum Culling (JDG-048)

## Ejemplo de Beneficio Esperado

**Escena con 50 entidades (NPCs, objetos, etc.):**

**Antes (sin frame scheduling):**
- Todas las entidades se actualizan cada frame
- 50 actualizaciones de física/frame
- 50 verificaciones de colisión/frame
- FPS: ~40-45

**Después (con frame scheduling - frecuencias variables):**
- 20 entidades cercanas: cada frame
- 20 entidades medias: cada 2 frames
- 10 entidades lejanas: cada 3 frames
- Promedio: ~27 actualizaciones/frame (46% reducción)
- FPS: ~50-55 (mejora de +10 FPS)

## Consideraciones de Implementación

**Al implementar, considerar:**

1. **Balance entre frecuencia y calidad:**
   - Frecuencia muy baja puede causar "stuttering" visual
   - Frecuencia muy alta no proporciona beneficio
   - Probar diferentes valores y ajustar

2. **Casos especiales:**
   - Entidades en combate: siempre frecuencia 1
   - Entidades interactuables: siempre frecuencia 1
   - Entidades estáticas: pueden ser frecuencia 4-5

3. **Compatibilidad con otros sistemas:**
   - Frustum Culling: ya filtra entidades no visibles
   - LOD: ya reduce calidad de entidades lejanas
   - Frame Scheduling: reduce frecuencia de actualización
   - Todos funcionan juntos sin conflictos
