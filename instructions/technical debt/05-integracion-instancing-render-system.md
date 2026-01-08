# Technical Debt: Integración Completa de Instancing en Render System

**Fecha**: 2026-01-07  
**Ticket Relacionado**: JDG-049  
**Prioridad**: Media  
**Estado**: Pendiente (sistema creado, integración pendiente)

## Contexto

Durante la implementación de las optimizaciones avanzadas (JDG-049), se creó el sistema `InstancingManager` para agrupar entidades similares en `InstancedMesh` de Three.js, lo cual reduce significativamente los draw calls (50-70% de reducción esperada). Sin embargo, la integración completa en el `RenderSystem` no se completó debido a la complejidad y necesidad de refactorización mayor.

## Situación Actual

**Implementación actual**: Sistema `InstancingManager` creado pero no integrado en `RenderSystem`

**Archivos creados:**
- `frontend/src/core/optimizations/instancing-manager.js` - Sistema completo y funcional
- Inicializado en `app.js` pero no utilizado

**Archivos pendientes de modificación:**
- `frontend/src/ecs/systems/render-system.js` - Requiere refactorización mayor

**Estado del sistema:**
```javascript
// app.js - InstancingManager inicializado pero sin uso
if (!this.instancingManager && this.scene) {
    this.instancingManager = new InstancingManager(this.scene.scene);
}
```

## Problema Identificado

**Complejidad de integración:**

1. **RenderSystem actual:**
   - Cada entidad tiene su propio mesh individual
   - Se actualiza directamente `mesh.position` y `mesh.rotation`
   - No hay agrupación por geometry/material

2. **Instancing requiere:**
   - Agrupar entidades por geometry/material antes de renderizar
   - Mantener mapping `entityId -> instanceIndex`
   - Actualizar matrices de instancia en lugar de posiciones individuales
   - Gestionar ciclo de vida (agregar/remover entidades de instancias)

3. **Conflictos potenciales:**
   - Entidades que cambian de material/geometry dinámicamente
   - Entidades que se mueven entre instancias
   - Compatibilidad con sistemas existentes (LOD, Frustum Culling)

## Propuesta de Implementación

### Opción 1: Refactorización Completa de RenderSystem

**Enfoque:** Modificar `RenderSystem` para usar instancing como método principal

**Ventajas:**
- Máxima eficiencia de draw calls
- Todas las entidades se benefician
- Código centralizado

**Desventajas:**
- Refactorización mayor (alto riesgo)
- Requiere testing extensivo
- Puede romper funcionalidad existente
- Complejidad alta para casos edge

**Implementación sugerida:**
```javascript
// render-system.js
update(deltaTime) {
    const entities = this.getEntities();
    
    // Agrupar entidades por mesh/material
    const entityGroups = this.groupEntitiesByMesh(entities);
    
    // Para cada grupo, actualizar instancias
    for (const [meshKey, entityIds] of entityGroups.entries()) {
        const instancedMesh = this.instancingManager.getOrCreateInstanceGroup(...);
        
        for (const entityId of entityIds) {
            const render = this.ecs.getComponent(entityId, 'Render');
            const position = this.ecs.getComponent(entityId, 'Position');
            
            // Obtener o crear índice de instancia
            let instanceIndex = this.instancingManager.getInstanceIndex(meshKey, entityId);
            if (instanceIndex === null) {
                instanceIndex = this.instancingManager.addEntity(entityId, meshKey, ...);
            }
            
            // Calcular matriz de transformación
            const matrix = new THREE.Matrix4();
            matrix.compose(position, rotation, scale);
            
            // Actualizar matriz de instancia
            this.instancingManager.updateInstanceTransform(meshKey, entityId, matrix);
        }
    }
    
    // Marcar instancias como actualizadas
    this.instancingManager.markAllInstancesUpdated();
}
```

### Opción 2: Sistema Dual (Instancing Opcional)

**Enfoque:** Mantener sistema actual, agregar instancing como opción opt-in

**Ventajas:**
- Bajo riesgo (no rompe funcionalidad existente)
- Entidades pueden optar por instancing
- Migración gradual posible

**Desventajas:**
- No todas las entidades se benefician automáticamente
- Requiere marcar entidades como "instanciables"
- Complejidad adicional (dos caminos de renderizado)

**Implementación sugerida:**
```javascript
// RenderComponent - agregar flag
class RenderComponent {
    constructor(options) {
        // ...
        this.useInstancing = options.useInstancing || false; // Opt-in
    }
}

// render-system.js - renderizar según flag
update(deltaTime) {
    const entities = this.getEntities();
    const instancingEntities = [];
    const regularEntities = [];
    
    // Separar entidades
    for (const entityId of entities) {
        const render = this.ecs.getComponent(entityId, 'Render');
        if (render.useInstancing) {
            instancingEntities.push(entityId);
        } else {
            regularEntities.push(entityId);
        }
    }
    
    // Renderizar instancias
    this.renderInstances(instancingEntities);
    
    // Renderizar entidades regulares (código actual)
    this.renderRegular(regularEntities);
}
```

### Opción 3: Instancing Solo para Entidades Estáticas/Múltiples

**Enfoque:** Usar instancing solo para entidades que cumplen criterios específicos

**Ventajas:**
- Bajo riesgo
- Beneficio inmediato para casos específicos (árboles, rocas, etc.)
- No afecta entidades dinámicas complejas (jugadores)

**Desventajas:**
- Beneficio limitado (solo entidades estáticas)
- Requiere identificar entidades instanciables
- No resuelve el problema general

**Criterios para instancing:**
- Mismo geometry/material
- No cambian material/geometry dinámicamente
- Posición/rotación actualizables por matriz
- No tienen jerarquías complejas

## Complejidad y Riesgo

**Complejidad:** Alta

**Riesgo:** Medio-Alto

**Razones:**
1. RenderSystem es crítico para el juego
2. Cambios pueden afectar rendering de todas las entidades
3. Requiere testing extensivo con diferentes tipos de entidades
4. Compatibilidad con otros sistemas (LOD, Frustum Culling, etc.)

## Impacto en Otros Sistemas

**Sistemas que pueden verse afectados:**

1. **Frustum Culling:**
   - InstancedMesh necesita frustum culling especial
   - Puede requerir ajustes en `FrustumCuller`

2. **LOD System:**
   - Instancias lejanas podrían necesitar diferente LOD
   - Requiere lógica adicional para manejar LOD por instancia

3. **Weapon Equip System:**
   - Armas equipadas pueden complicar instancing
   - Necesita excluirse de instancing o manejo especial

4. **Animation Mixer System:**
   - Animaciones pueden complicar instancing
   - Instancias animadas requieren manejo diferente

## Acciones Recomendadas

### Corto Plazo (MVP)

1. **Mantener sistema actual:**
   - RenderSystem funciona correctamente
   - InstancingManager está creado y disponible
   - No bloquea desarrollo

### Medio Plazo

1. **Piloto con entidades estáticas:**
   - Identificar entidades que pueden beneficiarse (árboles, rocas, etc.)
   - Implementar instancing solo para estas entidades (Opción 3)
   - Medir impacto real de draw calls ahorrados

2. **Refinar InstancingManager:**
   - Agregar manejo de límite de instancias (máx 1000 por grupo)
   - Implementar cleanup automático
   - Optimizar actualización de matrices

### Largo Plazo

1. **Refactorización completa:**
   - Cuando haya más experiencia con el sistema
   - Con base en métricas del piloto
   - Considerar Opción 1 o 2 según resultados

## Métricas de Éxito

**Para medir cuando se implemente:**

1. **Draw Calls:**
   - Reducción de 50-70% en draw calls con muchas entidades similares
   - Medir antes/después con misma escena

2. **FPS:**
   - Mejora de +20-40 FPS con muchas entidades similares
   - Especialmente en escenas con muchos objetos estáticos

3. **Memoria:**
   - Reducción en uso de memoria por instancias vs meshes individuales
   - Monitorear con Chrome DevTools

## Archivos Relacionados

**Archivos creados:**
- `frontend/src/core/optimizations/instancing-manager.js` - Sistema completo

**Archivos a modificar (cuando se implemente):**
- `frontend/src/ecs/systems/render-system.js` - Integración principal
- `frontend/src/ecs/components/render.js` - Potencialmente agregar flag `useInstancing`
- `frontend/src/core/optimizations/frustum-culling.js` - Ajustes para InstancedMesh si es necesario

**Archivos de referencia:**
- `instructions/tasks/JDG-049-action-plan_2026-01-07_20-12-57.md` - Plan original
- `frontend/src/core/optimizations/README.md` - Documentación del sistema

## Referencias Técnicas

- Three.js InstancedMesh: https://threejs.org/docs/#api/en/objects/InstancedMesh
- Instancing patterns en juegos: Common pattern for static/many similar objects
- Maximum instances per InstancedMesh: 1000-10000 dependiendo de GPU

## Notas Adicionales

- **Prioridad Media:** No es crítico para MVP, pero importante para escalabilidad
- **Impacto Potencial:** Muy alto en draw calls y FPS cuando hay muchas entidades similares
- **Esfuerzo Estimado:** 16-24 horas para integración completa (Opción 1)
- **Esfuerzo Estimado:** 8-12 horas para piloto (Opción 3)
- **Dependencias:** Requiere JDG-049 completado (sistema creado)
- **Bloquea:** Escalabilidad a escenas con muchas entidades similares

## Ejemplo de Beneficio Esperado

**Escena con 100 árboles:**

**Antes (sin instancing):**
- 100 draw calls (uno por árbol)
- FPS: ~30-40

**Después (con instancing):**
- 1 draw call (todos los árboles en un InstancedMesh)
- FPS: ~55-60 (mejora de +20-30 FPS)

**Escalabilidad:**
- 1000 árboles sin instancing: ~5-10 FPS (inviable)
- 1000 árboles con instancing: ~50-60 FPS (10 grupos de 100 instancias)
