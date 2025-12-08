# Análisis de Arquitectura - Agrupaciones para Personajes con Modelos 3D

## Fecha
2025-12-06

## Ticket
JDG-012 - Sistema de Modelos 3D para Personajes

## Contexto

Con la implementación de modelos 3D para personajes, estos ya no se crean como partículas físicas en el mapa. En su lugar, se renderizan como meshes 3D dinámicos en el frontend. Esto plantea la pregunta: **¿Tiene sentido seguir usando la tabla `agrupaciones` para personajes?**

## Situación Actual

### Agrupaciones: Diseño Original

La tabla `agrupaciones` fue diseñada para:

1. **Agrupar partículas físicas** en el mapa
   - Árboles: múltiples partículas de madera y hojas
   - Animales: múltiples partículas de carne, hueso, piel
   - Estructuras: múltiples partículas de materiales diversos

2. **Sistema de núcleo** (para seres vivos)
   - `tiene_nucleo`: Si es ser vivo con núcleo crítico
   - `nucleo_conectado`: Si el núcleo mantiene conexión con el cuerpo
   - `ultima_verificacion_nucleo`: Última verificación de conectividad
   - Partículas marcadas con `es_nucleo = true`

3. **Gestión de entidades estáticas**
   - Salud general (`salud`)
   - Estado activo/inactivo (`activa`)
   - Posición aproximada (centro de la agrupación)

4. **Relación con partículas**
   - `particulas.agrupacion_id` → FK a `agrupaciones.id`
   - Permite contar partículas: `COUNT(p.id) WHERE p.agrupacion_id = a.id`

### Personajes: Implementación Actual

Los personajes (bípedos) ahora:

1. **NO tienen partículas físicas**
   - `BipedBuilder.create_at_position()` retorna lista vacía
   - No se crean partículas en el mapa
   - Solo se crea registro en `agrupaciones`

2. **Solo tienen metadata**
   - `posicion_x/y/z`: Posición del personaje
   - `geometria_agrupacion`: Fallback para renderizado con primitivas
   - `modelo_3d`: Modelo 3D principal (GLTF/GLB)
   - `nombre`, `tipo`, `especie`: Metadata básica

3. **NO usan sistema de núcleo**
   - `tiene_nucleo = false
   - No hay partículas que verificar
   - No hay conectividad que calcular

4. **Son entidades dinámicas**
   - Se mueven constantemente (input del jugador)
   - Posición cambia frecuentemente
   - No son estáticas como árboles

## Análisis: ¿Tiene Sentido?

### Argumentos a FAVOR de mantener agrupaciones

1. **Unificación de API**
   - Endpoints `/characters` usan `agrupaciones` como base
   - Mismo patrón que árboles y otras entidades
   - Facilita queries genéricas: `SELECT * FROM agrupaciones WHERE tipo = 'biped'`

2. **Metadata compartida**
   - Campos como `nombre`, `tipo`, `especie` son útiles
   - `salud` puede ser útil para personajes (futuro)
   - `activa` puede marcar personajes eliminados/deshabilitados

3. **Geometría y modelos**
   - `geometria_agrupacion` y `modelo_3d` ya están en la tabla
   - Permite fallback de primitivas si no hay modelo
   - Estructura flexible para diferentes tipos de renderizado

4. **Posición centralizada**
   - `posicion_x/y/z` almacena posición del personaje
   - Útil para queries espaciales
   - Permite sincronización con frontend

5. **Extensibilidad futura**
   - Si en el futuro se agregan partículas físicas (ej: sangre, heridas)
   - Si se implementa sistema de salud por partes
   - Si se agrega sistema de inventario asociado

### Argumentos en CONTRA de mantener agrupaciones

1. **Desajuste conceptual**
   - Agrupaciones fueron diseñadas para agrupar partículas
   - Personajes no tienen partículas
   - Campos como `tiene_nucleo`, `nucleo_conectado` no aplican

2. **Campos no utilizados**
   - `tiene_nucleo`: Siempre `false` para personajes
   - `nucleo_conectado`: Siempre `true` (no se verifica)
   - `ultima_verificacion_nucleo`: Siempre `NULL`
   - `particulas_count`: Siempre `0` (hardcodeado en código)

3. **Queries ineficientes**
   - `list_agrupaciones()` hace `LEFT JOIN` con `particulas` para contar
   - Para personajes, siempre retorna `0` (desperdicio)
   - Queries genéricas incluyen campos irrelevantes

4. **Complejidad innecesaria**
   - Personajes son más simples que árboles
   - No necesitan sistema de núcleo
   - No necesitan gestión de múltiples partículas

5. **Separación de responsabilidades**
   - Agrupaciones = entidades estáticas con partículas
   - Personajes = entidades dinámicas sin partículas
   - Mezclar ambos puede causar confusión

## Comparación: Árboles vs Personajes

### Árboles (Caso de uso original)

```sql
-- Árbol tiene:
- 100-500 partículas físicas (tronco, hojas, raíces)
- Sistema de núcleo (raíces críticas)
- Salud general
- Posición estática (no se mueve)
- geometria_agrupacion para renderizado especializado
```

**Uso de agrupaciones:**
- ✅ Agrupa múltiples partículas
- ✅ Sistema de núcleo funcional
- ✅ Gestión de salud
- ✅ Queries eficientes (muchas partículas)

### Personajes (Caso actual)

```sql
-- Personaje tiene:
- 0 partículas físicas
- NO sistema de núcleo
- Posición dinámica (cambia constantemente)
- modelo_3d para renderizado (o geometria_agrupacion como fallback)
```

**Uso de agrupaciones:**
- ❌ NO agrupa partículas (lista vacía)
- ❌ Sistema de núcleo no aplica
- ⚠️ Campos no utilizados
- ⚠️ Queries ineficientes (siempre 0 partículas)

## Opciones de Arquitectura

### Opción 1: Mantener agrupaciones (Actual)

**Ventajas:**
- ✅ Ya implementado
- ✅ Unificación de API
- ✅ Extensibilidad futura
- ✅ No requiere migración

**Desventajas:**
- ⚠️ Campos no utilizados (`tiene_nucleo`, `nucleo_conectado`, etc.)
- ⚠️ Queries ineficientes (LEFT JOIN siempre retorna 0)
- ⚠️ Desajuste conceptual (agrupaciones sin partículas)
- ⚠️ Complejidad innecesaria

**Recomendación:** ✅ **MANTENER** (con mejoras)

### Opción 2: Tabla separada `personajes`

**Estructura propuesta:**
```sql
CREATE TABLE personajes (
    id UUID PRIMARY KEY,
    dimension_id UUID REFERENCES dimensiones(id),
    nombre VARCHAR(255),
    tipo VARCHAR(50),  -- 'humano', 'elfo', etc.
    posicion_x INTEGER,
    posicion_y INTEGER,
    posicion_z INTEGER,
    geometria_agrupacion JSONB,
    modelo_3d JSONB,
    salud DECIMAL(10,4) DEFAULT 100.0,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP,
    modificado_en TIMESTAMP
);
```

**Ventajas:**
- ✅ Separación clara de responsabilidades
- ✅ Campos específicos para personajes
- ✅ Queries más eficientes
- ✅ Sin campos no utilizados

**Desventajas:**
- ❌ Duplicación de estructura (similar a agrupaciones)
- ❌ Requiere migración de datos
- ❌ Dos sistemas paralelos (agrupaciones + personajes)
- ❌ Más complejidad en código (dos tablas que gestionar)

**Recomendación:** ❌ **NO RECOMENDADO** (a menos que haya necesidad específica)

### Opción 3: Tabla genérica `entidades`

**Estructura propuesta:**
```sql
CREATE TABLE entidades (
    id UUID PRIMARY KEY,
    dimension_id UUID REFERENCES dimensiones(id),
    tipo_entidad VARCHAR(50),  -- 'arbol', 'biped', 'animal', 'estructura'
    nombre VARCHAR(255),
    especie VARCHAR(100),
    posicion_x INTEGER,
    posicion_y INTEGER,
    posicion_z INTEGER,
    -- Campos específicos por tipo (JSONB)
    propiedades JSONB,
    -- Campos comunes
    salud DECIMAL(10,4),
    activa BOOLEAN,
    creado_en TIMESTAMP
);
```

**Ventajas:**
- ✅ Unificación completa
- ✅ Flexible (JSONB para propiedades específicas)
- ✅ Escalable (nuevos tipos sin cambios de schema)

**Desventajas:**
- ❌ Cambio arquitectónico grande
- ❌ Requiere migración completa
- ❌ Pérdida de tipos específicos (menos validación)
- ❌ Más complejo de consultar

**Recomendación:** ❌ **NO RECOMENDADO** (cambio demasiado grande)

## Recomendación Final

### Mantener agrupaciones con mejoras

**Razones:**

1. **Ya está implementado y funcionando**
   - No requiere migración
   - Código existente funciona
   - Menos riesgo de romper funcionalidad

2. **Unificación de API es valiosa**
   - Endpoints `/agrupaciones` pueden listar todos los tipos
   - Queries genéricas útiles para administración
   - Patrón consistente en el código

3. **Extensibilidad futura**
   - Si se agregan partículas físicas (sangre, heridas, objetos)
   - Si se implementa sistema de salud por partes
   - Si se agrega inventario asociado

4. **Campos no utilizados no son críticos**
   - `tiene_nucleo = false` es válido (personajes no tienen núcleo)
   - `nucleo_conectado = true` es válido (no aplica)
   - No causan problemas, solo ocupan espacio mínimo

### Mejoras Recomendadas

1. **Optimizar queries para personajes**
   ```sql
   -- En list_agrupaciones(), evitar LEFT JOIN si tipo = 'biped'
   SELECT 
       a.*,
       CASE 
           WHEN a.tipo = 'biped' THEN 0
           ELSE COUNT(p.id)
       END as particulas_count
   FROM agrupaciones a
   LEFT JOIN particulas p ON a.id = p.agrupacion_id AND p.extraida = false
   WHERE a.dimension_id = $1
   GROUP BY a.id
   ```

2. **Documentar campos no utilizados**
   ```sql
   COMMENT ON COLUMN juego_dioses.agrupaciones.tiene_nucleo IS 
   'Solo aplica para entidades con partículas físicas. Personajes (biped) siempre false.';
   ```

3. **Validar en código**
   ```python
   # En BipedBuilder, asegurar que campos de núcleo sean correctos
   if tipo == 'biped':
       tiene_nucleo = False
       nucleo_conectado = True  # No aplica, pero mantener consistencia
   ```

4. **Considerar índices específicos**
   ```sql
   -- Índice para queries de personajes
   CREATE INDEX idx_agrupaciones_biped ON agrupaciones(dimension_id, tipo) 
   WHERE tipo = 'biped';
   ```

## Conclusión

**¿Tiene sentido usar agrupaciones para personajes?**

✅ **SÍ**, con las siguientes consideraciones:

1. **Mantener agrupaciones** para unificación y extensibilidad
2. **Optimizar queries** para evitar JOINs innecesarios con personajes
3. **Documentar** que algunos campos no aplican para personajes
4. **Aceptar** que hay campos no utilizados (no crítico)

**Alternativa futura:**

Si en el futuro los personajes crecen en complejidad y necesitan funcionalidades específicas que no encajan en agrupaciones, entonces considerar tabla separada `personajes`. Pero por ahora, mantener agrupaciones es la opción más pragmática.

## Impacto en el Código

### Cambios Necesarios (Opcionales)

1. **Optimizar `list_agrupaciones()`**
   - Evitar LEFT JOIN para tipo 'biped'
   - Retornar `particulas_count = 0` directamente

2. **Agregar validación en builders**
   - Asegurar que personajes no usen sistema de núcleo
   - Documentar en código

3. **Actualizar documentación**
   - Explicar que agrupaciones sirven para múltiples propósitos
   - Documentar campos no utilizados por tipo

### Sin Cambios Críticos

- El código actual funciona correctamente
- No hay bugs relacionados con campos no utilizados
- La arquitectura es válida aunque no perfecta

## Referencias

- JDG-006: Análisis de Arquitectura - Sistema de Agrupaciones
- JDG-011: Sistema de Personajes desde Base de Datos
- JDG-012: Sistema de Modelos 3D para Personajes

