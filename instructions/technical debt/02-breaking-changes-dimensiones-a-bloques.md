# Breaking Changes: dimensiones → bloques

**Fecha**: 2025-12-24  
**Ticket**: JDG-038  
**Prioridad**: 🔴 **ALTA** - El frontend NO funcionará hasta que se corrijan estos cambios

## Resumen

Se renombró la tabla `dimensiones` a `bloques` y el campo `dimension_id` a `bloque_id` en las tablas relacionadas. Sin embargo, **el código del backend y frontend todavía usa las referencias antiguas**, lo que causará errores.

## Estado Actual

✅ **Completado**:
- Schema de base de datos actualizado (`01-init-schema.sql`)
- Modelos Pydantic nuevos creados (`particula_schemas.py`)
- Servicios nuevos creados (`world_bloque.py`, `world_bloque_manager.py`, `particula_service.py`)

❌ **Pendiente**:
- Rutas de API todavía usan `dimensiones`
- Seeds todavía usan `dimension_id`
- Frontend todavía usa endpoints `/dimensions`
- Modelos Pydantic antiguos todavía tienen `dimension_id`

## Archivos que Necesitan Actualización

### Backend - Rutas de API

#### 1. `backend/src/api/routes/dimensions.py`
**Problema**: Consulta `juego_dioses.dimensiones` que ya no existe.

**Cambios necesarios**:
```python
# ❌ ANTES
FROM juego_dioses.dimensiones

# ✅ DESPUÉS
FROM juego_dioses.bloques
```

**Líneas afectadas**: 34, 81

#### 2. `backend/src/api/routes/particles.py`
**Problema**: Usa `dimension_id` en parámetros y consultas.

**Cambios necesarios**:
- Cambiar parámetro `dimension_id` → `bloque_id` (o mantener por compatibilidad de API)
- Cambiar consultas SQL: `p.dimension_id` → `p.bloque_id`
- Cambiar consultas SQL: `WHERE dimension_id = $1` → `WHERE bloque_id = $1`

#### 3. `backend/src/api/routes/agrupaciones.py`
**Problema**: Usa `dimension_id` y consulta `juego_dioses.dimensiones`.

**Cambios necesarios**:
- Línea 22: `FROM juego_dioses.dimensiones` → `FROM juego_dioses.bloques`
- Línea 33: `a.dimension_id` → `a.bloque_id`
- Línea 52: `WHERE a.dimension_id = $1` → `WHERE a.bloque_id = $1`

#### 4. `backend/src/api/routes/characters.py`
**Problema**: Usa `dimension_id` en parámetros y consultas.

**Cambios necesarios**:
- Cambiar todas las referencias a `dimension_id` en consultas SQL
- Verificar que las consultas usen `bloque_id` en lugar de `dimension_id`

### Backend - Seeds

#### 5. `backend/src/database/seed_terrain_test_1.py`
**Problema**: Usa `dimension_id` en todas las consultas e inserciones.

**Cambios necesarios**:
- Cambiar `INSERT INTO juego_dioses.dimensiones` → `INSERT INTO juego_dioses.bloques`
- Cambiar todas las referencias `dimension_id` → `bloque_id` en variables y consultas
- Cambiar `ON CONFLICT (dimension_id, ...)` → `ON CONFLICT (bloque_id, ...)`

#### 6. `backend/src/database/seed_terrain_test_2.py`
**Problema**: Mismo que seed_terrain_test_1.py

**Cambios necesarios**: Igual que seed_terrain_test_1.py

#### 7. `backend/src/database/seed_character_with_model.py`
**Problema**: Usa `dimension_id` en consultas.

**Cambios necesarios**:
- Cambiar `SELECT id FROM juego_dioses.dimensiones` → `SELECT id FROM juego_dioses.bloques`
- Cambiar todas las referencias `dimension_id` → `bloque_id`

### Backend - Otros Archivos

#### 8. `backend/src/main.py`
**Problema**: Verifica existencia de dimensiones en seeds.

**Cambios necesarios**:
- Línea 59: `FROM juego_dioses.dimensiones` → `FROM juego_dioses.bloques`
- Línea 70: `FROM juego_dioses.dimensiones` → `FROM juego_dioses.bloques`

#### 9. `backend/src/database/creators/entity_creator.py`
**Problema**: Usa `dimension_id` como parámetro.

**Cambios necesarios**:
- Cambiar `dimension_id: UUID` → `bloque_id: UUID` en `__init__`
- Cambiar `self.dimension_id` → `self.bloque_id`
- Actualizar todas las consultas que usen `self.dimension_id`

#### 10. `backend/src/database/builders/*.py`
**Problema**: Todos los builders usan `dimension_id`.

**Cambios necesarios**:
- Cambiar parámetro `dimension_id` → `bloque_id` en todas las funciones
- Actualizar todas las consultas SQL

#### 11. `backend/src/database/utils/terrain_utils.py`
**Problema**: Usa `dimension_id` en parámetros y consultas.

**Cambios necesarios**:
- Cambiar `dimension_id: UUID` → `bloque_id: UUID` en funciones
- Actualizar consultas SQL

### Backend - Modelos Pydantic

#### 12. `backend/src/models/schemas.py`
**Problema**: Modelos antiguos todavía tienen `dimension_id`.

**Opciones**:
- **Opción A**: Mantener `dimension_id` en modelos de respuesta por compatibilidad de API, pero mapear desde `bloque_id` en la BD
- **Opción B**: Cambiar `dimension_id` → `bloque_id` en todos los modelos (requiere cambios en frontend)

**Recomendación**: Opción A para mantener compatibilidad temporal.

### Frontend

#### 13. `frontend/src/api/endpoints/dimensions.js`
**Estado**: ✅ Puede mantenerse igual (solo cambia el nombre interno en backend)

**Nota**: Los endpoints `/dimensions` pueden seguir funcionando si el backend mapea correctamente.

#### 14. `frontend/src/terrain/api/dimensions-client.js`
**Estado**: ✅ Puede mantenerse igual

#### 15. Otros archivos del frontend
**Estado**: ✅ Probablemente no necesitan cambios si el backend mantiene compatibilidad de API

## Estrategia de Migración

### Opción 1: Compatibilidad Temporal (Recomendado para desarrollo)

1. **Mantener endpoints `/dimensions`** en el backend
2. **Mapear internamente**: `dimension_id` (API) → `bloque_id` (BD)
3. **Actualizar consultas SQL** para usar `bloques` y `bloque_id`
4. **Actualizar seeds** para usar `bloques` y `bloque_id`

**Ventajas**:
- Frontend sigue funcionando sin cambios
- Migración gradual
- Menos riesgo de romper cosas

**Desventajas**:
- Doble mantenimiento temporal
- Confusión entre `dimension_id` (API) y `bloque_id` (BD)

### Opción 2: Migración Completa

1. **Cambiar endpoints** `/dimensions` → `/bloques`
2. **Actualizar frontend** para usar `/bloques`
3. **Actualizar todos los modelos** para usar `bloque_id`
4. **Actualizar todas las consultas**

**Ventajas**:
- Consistencia total
- Sin confusión de nombres

**Desventajas**:
- Requiere cambios en frontend
- Más trabajo inicial
- Mayor riesgo de romper cosas

## Plan de Acción Recomendado

### Fase 1: Backend - Consultas SQL (Crítico)
1. ✅ Actualizar `dimensions.py` para consultar `bloques`
2. ✅ Actualizar `particles.py` para usar `bloque_id` en consultas
3. ✅ Actualizar `agrupaciones.py` para usar `bloque_id`
4. ✅ Actualizar `characters.py` para usar `bloque_id`
5. ✅ Actualizar `main.py` para verificar `bloques`

### Fase 2: Backend - Seeds (Crítico)
6. ✅ Actualizar `seed_terrain_test_1.py`
7. ✅ Actualizar `seed_terrain_test_2.py`
8. ✅ Actualizar `seed_character_with_model.py`

### Fase 3: Backend - Utilidades
9. ✅ Actualizar `entity_creator.py`
10. ✅ Actualizar `terrain_utils.py`
11. ✅ Actualizar builders

### Fase 4: Modelos (Opcional - Compatibilidad)
12. ⚠️ Decidir si mantener `dimension_id` en modelos de respuesta o cambiar a `bloque_id`

## Testing

Después de los cambios, verificar:
1. ✅ Backend inicia sin errores
2. ✅ Endpoints `/dimensions` funcionan
3. ✅ Seeds se ejecutan correctamente
4. ✅ Frontend puede cargar dimensiones
5. ✅ Frontend puede cargar partículas
6. ✅ Frontend puede cargar agrupaciones
7. ✅ Frontend puede cargar personajes

## Notas

- **⚠️ IMPORTANTE**: No probar Docker hasta completar al menos Fase 1 y Fase 2
- Los nuevos servicios (`world_bloque.py`, etc.) ya usan `bloque_id` correctamente
- Los nuevos modelos (`particula_schemas.py`) ya usan `bloque_id` correctamente
- Solo el código legacy necesita actualización

