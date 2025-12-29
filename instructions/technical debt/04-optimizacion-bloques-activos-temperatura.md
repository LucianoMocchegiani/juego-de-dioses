# Technical Debt: Optimización de Bloques Activos para Actualización de Temperatura

**Fecha**: 2025-12-28  
**Ticket Relacionado**: JDG-041  
**Prioridad**: Media  
**Estado**: Pendiente

## Contexto

Durante la implementación del sistema de conservación de calor (JDG-041), se creó un background task que actualiza la temperatura de partículas periódicamente. Actualmente, el sistema actualiza **todas las partículas de todos los bloques**, lo cual es ineficiente cuando hay muchos bloques sin jugadores activos.

## Situación Actual

**Implementación actual**: Actualiza todas las partículas de todos los bloques

```python
# backend/src/api/routes/celestial.py
async def update_particle_temperatures_periodically():
    # ...
    async with get_connection() as conn:
        # Obtener todos los bloques únicos
        bloques = await conn.fetch(
            """
            SELECT DISTINCT bloque_id
            FROM juego_dioses.particulas
            WHERE extraida = false
            """
        )
        
        for bloque_row in bloques:
            bloque_id = str(bloque_row['bloque_id'])
            # Actualizar todas las partículas del bloque
            # ...
```

**Problemas identificados:**

1. **Performance:**
   - ❌ Actualiza partículas de bloques sin jugadores (desperdicio de recursos)
   - ❌ Calcula temperatura ambiental para partículas que nadie está viendo
   - ❌ Actualiza BD con temperaturas que no se usan

2. **Escalabilidad:**
   - ❌ Con muchos bloques, el tiempo de ejecución crece linealmente
   - ❌ Más bloques = más tiempo de procesamiento
   - ❌ Puede causar delays en el background task

3. **Lógica de negocio:**
   - ⚠️ No tiene sentido actualizar bloques sin jugadores
   - ⚠️ Los bloques "dormidos" no necesitan actualización continua
   - ⚠️ Solo deberían actualizarse cuando hay actividad

## Propuesta: Solo Actualizar Bloques Activos

**Definición de "Bloque Activo":**
- Bloque con al menos un jugador presente
- Bloque que ha sido visitado recientemente (últimos X minutos)
- Bloque con eventos activos (futuro: incendios, erupciones, etc.)

**Implementación sugerida:**

```python
async def update_particle_temperatures_periodically():
    """
    Actualizar temperatura de partículas periódicamente.
    
    Solo actualiza partículas de bloques activos (con jugadores o actividad reciente).
    """
    global _particle_temperature_update_task
    
    update_interval = CELESTIAL_CONFIG.get('PARTICLE_TEMPERATURE_UPDATE_INTERVAL', 300)
    
    while True:
        try:
            await asyncio.sleep(update_interval)
            
            celestial_service = get_celestial_service()
            
            async with get_connection() as conn:
                # Obtener solo bloques activos
                bloques_activos = await conn.fetch(
                    """
                    SELECT DISTINCT p.bloque_id
                    FROM juego_dioses.particulas p
                    INNER JOIN juego_dioses.characters c ON c.bloque_id = p.bloque_id
                    WHERE p.extraida = false
                      AND c.activo = true
                      AND c.ultima_actividad > NOW() - INTERVAL '10 minutes'
                    """
                )
                
                # Si no hay bloques activos, no hacer nada
                if not bloques_activos:
                    continue
                
                for bloque_row in bloques_activos:
                    bloque_id = str(bloque_row['bloque_id'])
                    # ... resto del código igual ...
```

**Alternativa: Usar WorldBloqueManager**

Si `WorldBloqueManager` ya tiene un sistema de tracking de bloques activos:

```python
from src.services import WorldBloqueManager

async def update_particle_temperatures_periodically():
    # ...
    bloque_manager = WorldBloqueManager.get_instance()  # Si es singleton
    bloques_activos = bloque_manager.get_active_blocks()  # Método a implementar
    
    for bloque_id in bloques_activos:
        # Actualizar partículas del bloque
        # ...
```

## Ventajas de la Optimización

1. **Performance:**
   - ✅ Solo actualiza bloques con jugadores
   - ✅ Reduce carga de CPU significativamente
   - ✅ Reduce escrituras a BD innecesarias

2. **Escalabilidad:**
   - ✅ Tiempo de ejecución proporcional a bloques activos (no totales)
   - ✅ Soporta muchos bloques sin impacto en performance
   - ✅ Mejor uso de recursos del servidor

3. **Lógica de negocio:**
   - ✅ Solo actualiza lo que realmente se necesita
   - ✅ Bloques "dormidos" se actualizan cuando se visitan
   - ✅ Más realista (solo hay actividad donde hay jugadores)

## Desventajas

1. **Complejidad:**
   - ⚠️ Requiere tracking de bloques activos
   - ⚠️ Necesita definir qué es "activo" (jugadores, tiempo, eventos)
   - ⚠️ Puede requerir cambios en `WorldBloqueManager` o `CharacterService`

2. **Bloques "dormidos":**
   - ⚠️ Partículas en bloques sin jugadores no se actualizan
   - ⚠️ Cuando un jugador entra a un bloque "dormido", las temperaturas pueden estar desactualizadas
   - ⚠️ Mitigación: Actualizar al entrar al bloque (on-demand)

## Acciones Recomendadas

### Corto Plazo

1. **Mantener implementación actual:**
   - Funciona correctamente para MVP
   - No bloquea desarrollo
   - Suficiente para pocos bloques

### Medio Plazo

1. **Implementar tracking de bloques activos:**
   - Agregar campo `ultima_actividad` a `WorldBloque` o tabla `bloques`
   - Actualizar cuando un jugador entra/sale del bloque
   - O usar `characters.ultima_actividad` para determinar bloques activos

2. **Modificar background task:**
   - Filtrar solo bloques activos
   - Agregar logging para monitorear cuántos bloques se actualizan

### Largo Plazo

1. **Sistema de eventos:**
   - Actualizar bloques con eventos activos (incendios, erupciones)
   - Priorizar bloques con más jugadores
   - Sistema de "wake up" para bloques cuando se visitan

## Impacto en Código

**Archivos afectados:**
- `backend/src/api/routes/celestial.py` - Modificar query de bloques
- `backend/src/services/world_bloque.py` - Potencialmente agregar tracking de actividad
- `backend/src/services/world_bloque_manager.py` - Potencialmente agregar método `get_active_blocks()`

**Compatibilidad:**
- ✅ No rompe código existente
- ✅ Cambio interno del background task
- ✅ Transparente para APIs y frontend

## Referencias

- `backend/src/api/routes/celestial.py` (línea 99-109) - Implementación actual
- `backend/src/services/world_bloque.py` - Potencial tracking de actividad
- `instructions/tasks/JDG-041-action-plan_2025-12-28_11-48-02.md` - Plan de implementación

## Notas Adicionales

- **Prioridad Media:** No es crítico para MVP, pero importante para escalabilidad
- **Impacto:** Mejora significativa en performance con muchos bloques
- **Riesgo:** Bajo (cambio interno, no afecta APIs)
- **Esfuerzo:** Medio (requiere tracking de actividad)

## Ejemplo de Mejora Esperada

**Antes (sin optimización):**
```
Mundo con 100 bloques, 5 con jugadores:
- Actualiza 100 bloques × 50 partículas = 5000 actualizaciones
- Tiempo: ~30 segundos
```

**Después (con optimización):**
```
Mundo con 100 bloques, 5 con jugadores:
- Actualiza 5 bloques × 50 partículas = 250 actualizaciones
- Tiempo: ~1.5 segundos (20x más rápido)
```

