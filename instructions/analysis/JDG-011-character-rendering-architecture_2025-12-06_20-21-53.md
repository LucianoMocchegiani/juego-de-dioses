# Análisis de Arquitectura - Renderizado de Personajes: Partículas vs Mesh (JDG-011)

## Situación Actual

### Problema Identificado

**Síntoma:** El personaje tiene dos representaciones que se separan:
1. **Partículas en BD** (bloques fijos) - Se renderizan como voxels individuales
2. **Mesh del personaje** (esfera + cilindros) - Se mueve con el ECS

**Causa raíz:** 
- Las partículas del personaje están almacenadas en la BD en posiciones fijas
- El mesh se mueve según `PositionComponent` del ECS
- Cuando el personaje se mueve, solo se actualiza `PositionComponent`, pero las partículas en BD NO se mueven
- Resultado: El mesh se desplaza pero las partículas quedan en su posición original

### Backend

**Estructura actual:**
```
backend/src/database/
├── templates/bipedos/        # Templates de bípedos
├── builders/biped_builder.py # Crea partículas Y agrupación con geometria_agrupacion
└── creators/entity_creator.py # Factory que crea entidades
```

**Cómo funciona actualmente:**
1. `BipedBuilder.create_at_position()` crea partículas físicas en la BD (19 partículas para un humano)
2. `BipedBuilder.create_agrupacion()` crea agrupación con `geometria_agrupacion` (JSON con definición de geometría)
3. Las partículas tienen `agrupacion_id` y `propiedades.parte_entidad` (cabeza, torso, etc.)

**Problema:**
- Las partículas son estáticas en la BD
- No hay mecanismo para mover partículas cuando el personaje se mueve
- Cada movimiento requeriría actualizar 19 partículas en la BD (ineficiente)

### Frontend

**Estructura actual:**
```
frontend/src/
├── ecs/factories/player-factory.js # Crea mesh desde geometria_agrupacion
├── renderers/particle-renderer.js  # Renderiza partículas de BD como bloques
└── ecs/systems/render-system.js   # Mueve mesh según PositionComponent
```

**Cómo funciona actualmente:**
1. `PlayerFactory` carga `geometria_agrupacion` desde API
2. `buildMeshFromGeometry()` crea mesh Three.js (esfera + cilindros) desde la geometría
3. `RenderSystem` mueve el mesh según `PositionComponent`
4. `ParticleRenderer` renderiza TODAS las partículas de BD, incluyendo las del personaje

**Problema:**
- Las partículas del personaje se renderizan como bloques individuales (voxels)
- El mesh del personaje se renderiza por separado
- Dos representaciones del mismo objeto que se desincronizan

### Base de Datos

**Estructura actual:**
```sql
agrupaciones (
    id UUID,
    tipo TEXT,  -- 'biped' para personajes
    geometria_agrupacion JSONB,  -- Definición de geometría
    posicion_x INT,  -- Posición base
    posicion_y INT,
    posicion_z INT
)

particulas (
    id UUID,
    agrupacion_id UUID,  -- FK a agrupaciones
    celda_x INT,  -- Posición fija
    celda_y INT,
    celda_z INT,
    propiedades JSONB  -- { "parte_entidad": "cabeza" }
)
```

**Problema:**
- Las partículas tienen posiciones fijas (`celda_x, celda_y, celda_z`)
- No hay forma de mover todas las partículas de una agrupación eficientemente
- Actualizar 19 partículas por cada movimiento es costoso

## Comparación con Otras Entidades

### Árboles (Entidades Estáticas)

**Cómo funcionan:**
1. `TreeBuilder` crea partículas físicas en la BD (tronco, hojas, raíces)
2. `TreeBuilder` crea agrupación con `geometria_agrupacion` (opcional, para renderizado mejorado)
3. Las partículas se renderizan como bloques individuales usando `ParticleRenderer`
4. **Los árboles NO se mueven** - Son estáticos

**Ventajas:**
- Simple y consistente
- Las partículas representan la realidad física del árbol
- No hay desincronización porque no hay movimiento

**Desventajas:**
- No aplica a personajes (que se mueven)

### Personajes (Entidades Dinámicas)

**Problema actual:**
1. `BipedBuilder` crea partículas físicas en la BD (igual que árboles)
2. `BipedBuilder` crea agrupación con `geometria_agrupacion`
3. El mesh se mueve con ECS, pero las partículas NO
4. **Resultado: Desincronización**

## Enfoques Posibles

### Enfoque 1: Personajes como Partículas (Sincronización BD)

**Descripción:**
- Mantener partículas en BD (como ahora)
- Cuando el personaje se mueve, actualizar todas sus partículas en BD
- El mesh se sincroniza con las partículas

**Implementación:**
1. Crear endpoint `PUT /characters/{id}/position` que:
   - Calcula offset de movimiento
   - Actualiza todas las partículas de la agrupación
   - Actualiza posición de la agrupación
2. En frontend, llamar a este endpoint cuando `PositionComponent` cambia (con throttling)

**Ventajas:**
- Consistencia: El personaje existe físicamente en el mundo
- Las partículas representan la realidad física
- Compatible con sistema de colisiones basado en partículas
- Otros jugadores/NPCs pueden ver el personaje como partículas

**Desventajas:**
- **Alto costo de BD**: Actualizar 19 partículas por cada movimiento
- **Latencia**: Cada movimiento requiere llamada a API
- **Complejidad**: Necesita sincronización bidireccional
- **Conflictos**: Si dos clientes mueven el mismo personaje simultáneamente

**Rendimiento estimado:**
- Movimiento típico: 60 FPS = 60 actualizaciones/segundo
- Con throttling (1 vez/segundo): 1 actualización/segundo
- Cada actualización: UPDATE de 19 partículas = ~19 queries SQL
- **Total: ~19 queries SQL por segundo por personaje**

### Enfoque 2: Personajes Solo como Mesh (Sin Partículas en BD)

**Descripción:**
- NO crear partículas físicas para personajes
- Solo crear agrupación con `geometria_agrupacion`
- El personaje existe solo como mesh en el frontend
- Guardar solo la posición del personaje (no las partículas)

**Implementación:**
1. Modificar `BipedBuilder` para que NO cree partículas (o crear partículas "fantasma" invisibles)
2. Modificar `PlayerFactory` para crear mesh desde `geometria_agrupacion`
3. Guardar posición del personaje en `agrupaciones.posicion_x/y/z`
4. Actualizar solo la posición de la agrupación cuando se mueve

**Ventajas:**
- **Bajo costo de BD**: Solo 1 UPDATE por movimiento (posición de agrupación)
- **Sin latencia**: El movimiento es instantáneo (solo frontend)
- **Simple**: No necesita sincronizar múltiples partículas
- **Rendimiento**: Mucho mejor que Enfoque 1

**Desventajas:**
- **Inconsistencia**: El personaje no existe físicamente en el mundo de partículas
- **Colisiones**: Necesita sistema de colisiones diferente (no basado en partículas)
- **Visibilidad**: Otros jugadores no verían el personaje como partículas
- **Física**: No puede interactuar con partículas del mundo (ej: pisar hierba, romper bloques)

**Rendimiento estimado:**
- Movimiento: 0 queries SQL (solo frontend)
- Actualización de posición (throttled): 1 UPDATE por segundo
- **Total: ~1 query SQL por segundo por personaje**

### Enfoque 3: Híbrido - Partículas "Fantasma" + Mesh

**Descripción:**
- Crear partículas en BD pero marcarlas como "no renderizables"
- El mesh se renderiza desde `geometria_agrupacion`
- Las partículas existen para física/colisiones pero no se renderizan
- Actualizar partículas solo cuando es necesario (throttled)

**Implementación:**
1. Agregar campo `renderizable: false` a partículas de personajes
2. Filtrar partículas no renderizables en `ParticleRenderer`
3. Usar partículas para colisiones/física
4. Actualizar partículas con throttling (ej: cada 0.5 segundos)

**Ventajas:**
- **Balance**: Partículas para física, mesh para renderizado
- **Rendimiento**: Menos actualizaciones que Enfoque 1
- **Consistencia**: El personaje existe físicamente

**Desventajas:**
- **Complejidad**: Dos sistemas (partículas + mesh)
- **Sincronización**: Aún necesita sincronizar partículas
- **Confusión**: Partículas que no se ven pero existen

### Enfoque 4: Solo Mesh + Sistema de Colisiones Separado

**Descripción:**
- NO crear partículas para personajes
- Solo mesh desde `geometria_agrupacion`
- Sistema de colisiones basado en bounding boxes/spheres
- Guardar solo posición del personaje

**Implementación:**
1. Modificar `BipedBuilder` para NO crear partículas
2. Crear solo agrupación con `geometria_agrupacion`
3. Sistema de colisiones basado en geometría del mesh
4. Actualizar solo posición de agrupación

**Ventajas:**
- **Máximo rendimiento**: Cero queries SQL para movimiento
- **Simple**: Un solo sistema (mesh)
- **Escalable**: Fácil agregar más personajes

**Desventajas:**
- **Física limitada**: No puede interactuar con partículas del mundo
- **Colisiones**: Necesita sistema de colisiones diferente
- **Inconsistencia**: Personaje no existe en mundo de partículas

## Recomendación: Enfoque 2 (Personajes Solo como Mesh)

### Justificación

1. **Rendimiento**: 
   - Personajes se mueven constantemente (60 FPS)
   - Actualizar 19 partículas por movimiento es prohibitivo
   - Solo actualizar posición (1 campo) es mucho más eficiente

2. **Simplicidad**:
   - Un solo sistema de renderizado (mesh)
   - No necesita sincronización compleja
   - Menos código, menos bugs

3. **Escalabilidad**:
   - Múltiples personajes no saturan la BD
   - Fácil agregar NPCs
   - Preparado para multijugador

4. **Separación de responsabilidades**:
   - **Partículas en BD**: Terreno, objetos estáticos (árboles, rocas)
   - **Meshes en Frontend**: Entidades dinámicas (personajes, NPCs, proyectiles)

### Arquitectura Propuesta

#### Backend

**Modificar `BipedBuilder`:**
```python
class BipedBuilder(BaseBuilder):
    async def create_at_position(
        self,
        conn: asyncpg.Connection,
        dimension_id: UUID,
        x: int,
        y: int,
        z: int,
        # ... otros parámetros
    ) -> List[Tuple]:
        """
        Crear bípedo en posición específica
        
        OPCIÓN A: NO crear partículas, solo retornar lista vacía
        OPCIÓN B: Crear partículas "fantasma" (invisibles, solo para referencia)
        """
        # OPCIÓN A: No crear partículas
        return []  # Personaje no tiene partículas físicas
        
        # OPCIÓN B: Crear partículas fantasma (opcional, para colisiones)
        # particles = []
        # ... crear partículas pero marcarlas como no renderizables
        # return particles
```

**Mantener `create_agrupacion()`:**
- Sigue creando agrupación con `geometria_agrupacion`
- Guarda posición en `agrupaciones.posicion_x/y/z`

#### Frontend

**Modificar `PlayerFactory`:**
- Ya funciona correctamente: crea mesh desde `geometria_agrupacion`
- No necesita cambios

**Filtrar partículas de personajes:**
- Ya implementado: filtrar partículas con `agrupacion_id` de tipo "biped"
- Mantener este filtro

**Sistema de colisiones:**
- Actual: Basado en partículas sólidas
- Nuevo: Basado en bounding box/sphere del mesh
- O mantener colisiones con partículas del terreno (no del personaje)

#### Base de Datos

**No requiere cambios:**
- Las agrupaciones ya tienen `posicion_x/y/z`
- Las partículas pueden existir o no (según opción elegida)

**Si elegimos OPCIÓN A (sin partículas):**
- Las partículas simplemente no se crean
- La agrupación existe con `geometria_agrupacion`
- Solo se actualiza `posicion_x/y/z` cuando el personaje se mueve

**Si elegimos OPCIÓN B (partículas fantasma):**
- Crear partículas pero con `propiedades.renderizable = false`
- Filtrar en `ParticleRenderer` partículas no renderizables
- Usar para colisiones pero no para renderizado

## Comparación de Enfoques

| Aspecto | Enfoque 1 (Partículas) | Enfoque 2 (Solo Mesh) | Enfoque 3 (Híbrido) | Enfoque 4 (Mesh + Colisiones) |
|---------|------------------------|----------------------|---------------------|-------------------------------|
| **Queries SQL/movimiento** | ~19 | 0 (solo frontend) | ~19 (throttled) | 0 |
| **Latencia** | Alta (llamada API) | Baja (solo frontend) | Media (throttled) | Baja |
| **Consistencia física** | ✅ Alta | ❌ Baja | ✅ Media | ❌ Baja |
| **Rendimiento** | ❌ Bajo | ✅ Alto | ⚠️ Medio | ✅ Alto |
| **Simplicidad** | ❌ Complejo | ✅ Simple | ⚠️ Medio | ✅ Simple |
| **Colisiones** | ✅ Con partículas | ⚠️ Necesita nuevo sistema | ✅ Con partículas | ⚠️ Necesita nuevo sistema |
| **Escalabilidad** | ❌ Limitada | ✅ Alta | ⚠️ Media | ✅ Alta |

## Recomendación Final

**Enfoque 2: Personajes Solo como Mesh**

**Razones:**
1. **Rendimiento crítico**: Los personajes se mueven constantemente
2. **Separación clara**: Partículas = estático, Meshes = dinámico
3. **Simplicidad**: Un solo sistema de renderizado
4. **Escalabilidad**: Preparado para múltiples personajes

**Implementación:**
1. Modificar `BipedBuilder` para NO crear partículas (o crear partículas fantasma)
2. Mantener filtro en frontend para no renderizar partículas de personajes
3. Sistema de colisiones basado en bounding box del mesh
4. Guardar solo posición del personaje en `agrupaciones.posicion_x/y/z`

**Alternativa (si se necesita física con partículas):**
- Enfoque 3 (Híbrido) con throttling agresivo (actualizar partículas cada 1-2 segundos)
- Partículas marcadas como no renderizables
- Usar solo para colisiones/física, no para renderizado

## Migración Propuesta

### Fase 1: Modificar BipedBuilder
- [ ] Opción A: Retornar lista vacía en `create_at_position()` (no crear partículas)
- [ ] Opción B: Crear partículas con `propiedades.renderizable = false`
- [ ] Mantener `create_agrupacion()` sin cambios

### Fase 2: Frontend - Filtrar Partículas
- [ ] Ya implementado: Filtrar partículas de agrupaciones tipo "biped"
- [ ] Verificar que funciona correctamente
- [ ] Si Opción B: Filtrar también por `propiedades.renderizable`

### Fase 3: Sistema de Colisiones
- [ ] Evaluar sistema actual de colisiones
- [ ] Si usa partículas: Adaptar para usar bounding box del mesh
- [ ] O mantener colisiones con terreno (partículas estáticas)

### Fase 4: Actualización de Posición (Opcional)
- [ ] Crear endpoint `PUT /characters/{id}/position` (solo actualiza `posicion_x/y/z`)
- [ ] Llamar con throttling (cada 1-2 segundos) desde frontend
- [ ] Para persistencia entre sesiones

## Consideraciones Técnicas

### Rendimiento

**Enfoque 1 (Partículas):**
- 60 movimientos/segundo × 19 partículas = 1,140 queries SQL/segundo
- Con throttling (1 vez/segundo): 19 queries/segundo
- **Inaceptable para múltiples personajes**

**Enfoque 2 (Solo Mesh):**
- 0 queries SQL para movimiento
- Solo 1 UPDATE/segundo para persistencia (opcional)
- **Aceptable para cientos de personajes**

### Colisiones

**Opción A: Bounding Box/Sphere**
- Calcular bounding box del mesh
- Verificar colisión con partículas sólidas del terreno
- Más preciso que partículas individuales

**Opción B: Mantener colisiones con partículas**
- El personaje colisiona con partículas del terreno
- No necesita partículas propias para colisiones
- Sistema actual funciona

### Persistencia

**Si no hay partículas:**
- Guardar solo posición en `agrupaciones.posicion_x/y/z`
- Al cargar, crear mesh en esa posición
- Simple y eficiente

**Si hay partículas fantasma:**
- Actualizar partículas con throttling
- Más complejo pero mantiene consistencia física

## Conclusión

**Recomendación: Enfoque 2 (Personajes Solo como Mesh)**

El personaje debe renderizarse **solo como mesh en el frontend**, no como partículas en la BD. Las partículas en BD son para:
- **Terreno** (tierra, hierba, agua)
- **Objetos estáticos** (árboles, rocas, estructuras)

Los personajes son **entidades dinámicas** que se mueven constantemente. Renderizarlos como partículas es:
- Ineficiente (demasiadas actualizaciones de BD)
- Complejo (sincronización bidireccional)
- Innecesario (el mesh ya representa el personaje visualmente)

**Separación de responsabilidades:**
- **BD (Partículas)**: Mundo estático y persistente
- **Frontend (Meshes)**: Entidades dinámicas y temporales

Esta arquitectura es:
- ✅ Más eficiente
- ✅ Más simple
- ✅ Más escalable
- ✅ Más mantenible

