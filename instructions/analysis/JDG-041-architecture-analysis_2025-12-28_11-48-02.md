# Análisis de Arquitectura - Sistema de Temperatura Dinámico con Conservación de Calor (JDG-041)

## Situación Actual

### Backend

**Estructura actual:**
```
backend/src/
├── services/
│   ├── temperature_service.py      # Calcula temperatura ambiental
│   ├── world_bloque.py              # Calcula temperatura del bloque
│   ├── celestial_time_service.py   # Tiempo celestial (sol/luna)
│   └── particula_service.py        # Servicios de partículas
├── api/routes/
│   └── celestial.py                 # Endpoints de temperatura
└── models/
    └── schemas.py                   # Schemas Pydantic
```

**Problemas identificados:**

1. **Temperatura del agua no se considera:**
   - `get_water_modifier()` solo busca proximidad (distancia)
   - NO lee `particula.temperatura` de las partículas de agua
   - Aplica modificador fijo de ±5°C sin considerar temperatura real
   - No diferencia entre agua caliente (60°C) y agua fría (5°C)

2. **No hay sistema de actualización de temperatura de partículas:**
   - Las partículas tienen `temperatura` en BD (default 20°C)
   - No hay servicio que actualice esta temperatura periódicamente
   - El agua no absorbe temperatura del ambiente (sol, aire)
   - El agua no conserva temperatura (alta inercia térmica)

3. **No considera cambios de estado:**
   - Cuando agua → hielo, el sistema no adapta el comportamiento
   - Hielo tiene propiedades diferentes (albedo, inercia_termica)
   - No hay sistema genérico para partículas con `inercia_termica`

4. **No considera partículas especiales:**
   - Fuego/lava no afectan temperatura del bloque
   - No hay modificador por fuego cercano
   - No hay propagación de calor entre partículas

### Frontend

**Estructura actual:**
```
frontend/src/
├── interfaces/
│   └── debug-panel.js    # Muestra temperatura (F3)
└── api/endpoints/
    └── celestial.js      # Cliente API para temperatura
```

**Problemas identificados:**

1. **Llamadas excesivas:**
   - Actualmente limitado a 1 por minuto (optimización reciente)
   - No hay cacheo inteligente por posición

### Base de Datos

**Estructura actual:**
```sql
-- Tabla particulas
CREATE TABLE particulas (
    ...
    temperatura DECIMAL(10,2) DEFAULT 20.0,  -- Existe pero no se actualiza
    ...
);

-- Tabla tipos_particulas
CREATE TABLE tipos_particulas (
    ...
    inercia_termica DECIMAL(3,2) DEFAULT 1.0,  -- Existe pero no se usa
    conductividad_termica DECIMAL(3,2) DEFAULT 1.0,  -- Existe pero no se usa
    albedo DECIMAL(3,2) DEFAULT 0.2,  -- Se usa para modificador ambiental
    ...
);

-- Tabla transiciones_particulas
CREATE TABLE transiciones_particulas (
    ...
    condicion_temperatura VARCHAR(10),  -- Existe para cambios de estado
    valor_temperatura DECIMAL(10,2),
    ...
);
```

**Problemas identificados:**

1. **Campos infrautilizados:**
   - `particula.temperatura` existe pero no se actualiza dinámicamente
   - `inercia_termica` existe pero no se usa para actualización de temperatura
   - `conductividad_termica` existe pero no se usa para propagación

2. **No hay sistema de actualización:**
   - No hay background tasks que actualicen temperatura de partículas
   - No hay triggers o eventos que actualicen temperatura

## Necesidades Futuras

### Categorías de Funcionalidades

1. **Sistema de Conservación de Calor** (Fase 1 - Actual):
   - Partículas con `inercia_termica > 0` absorben temperatura del ambiente
   - Agua, hielo, lava conservan temperatura según sus propiedades
   - Sistema genérico que funciona para cualquier tipo de partícula

2. **Sistema de Propagación de Calor** (Fase 2 - Futuro):
   - Propagación de calor entre partículas cercanas
   - Usa `conductividad_termica` para velocidad de propagación
   - Sistema de incendios y eventos dinámicos

3. **Modificadores Dinámicos** (Fase 2 - Futuro):
   - Fuego/lava afectan temperatura del bloque
   - Partículas especiales con temperatura propia
   - Eventos que modifican temperatura (incendios, erupciones)

### Requisitos de Escalabilidad

1. **Fácil agregar nuevos tipos de partículas:**
   - Sistema genérico basado en `inercia_termica`
   - No requiere código específico por tipo
   - Funciona automáticamente con nuevos tipos

2. **Reutilización de código:**
   - Función genérica `update_particle_temperature()`
   - Modificador genérico `get_particle_temperature_modifier()`
   - No duplicar lógica para agua/hielo/lava

3. **Separación de responsabilidades:**
   - `temperature_service.py`: Cálculo de temperatura ambiental
   - Nueva función: Actualización de temperatura de partículas
   - `world_bloque.py`: Gestión de bloques y temperatura del bloque

4. **Extensibilidad:**
   - Fácil agregar nuevos tipos de partículas que conservan calor
   - Fácil agregar nuevos modificadores (fuego, lava)
   - Sistema preparado para propagación de calor (Fase 2)

5. **Mantenibilidad:**
   - Código claro y documentado
   - Fácil entender cómo funciona el sistema
   - Fácil debuggear problemas de temperatura

## Arquitectura Propuesta

### Backend - Estructura Modular

```
backend/src/
├── services/
│   ├── temperature_service.py
│   │   ├── calculate_solar_temperature()      # [Existente]
│   │   ├── get_altitude_modifier()            # [Existente]
│   │   ├── get_water_modifier()               # [MEJORAR: leer temperatura]
│   │   ├── get_albedo_modifier()              # [Existente]
│   │   ├── calculate_cell_temperature()       # [Existente]
│   │   ├── update_particle_temperature()       # [NUEVO: genérico]
│   │   └── get_particle_temperature_modifier() # [NUEVO: genérico]
│   ├── world_bloque.py
│   │   ├── calcular_temperatura()             # [Existente]
│   │   └── actualizar_temperaturas_particulas() # [NUEVO: opcional]
│   └── particula_service.py                   # [Existente]
├── api/routes/
│   └── celestial.py
│       ├── get_celestial_state()              # [Existente]
│       ├── calculate_temperature()             # [Existente]
│       └── update_particle_temperatures_task() # [NUEVO: background task]
└── config/
    └── celestial_config.py                     # [Existente]
```

### Jerarquía de Funciones

```
temperature_service.py
├── Funciones de cálculo ambiental (existentes)
│   ├── calculate_solar_temperature()
│   ├── get_altitude_modifier()
│   ├── get_albedo_modifier()
│   └── calculate_cell_temperature()
│
├── Funciones de partículas (nuevas/mejoradas)
│   ├── update_particle_temperature()          # Genérico para cualquier partícula
│   ├── get_particle_temperature_modifier()    # Genérico para cualquier tipo
│   └── get_water_modifier()                    # Mejorado: lee temperatura
│
└── Background tasks (nuevos)
    └── update_particle_temperatures_periodically()  # Actualiza partículas cada X minutos
```

### Frontend - Sin Cambios

```
frontend/src/
├── interfaces/
│   └── debug-panel.js    # [Ya optimizado: 1 llamada/minuto]
└── api/endpoints/
    └── celestial.js      # [Sin cambios]
```

## Patrones de Diseño a Usar

### 1. Strategy Pattern
- **Descripción:** Diferentes algoritmos para actualizar temperatura según tipo de partícula
- **Cómo se aplica:** Función genérica `update_particle_temperature()` que usa `inercia_termica` del tipo
- **Beneficios:** Extensible, fácil agregar nuevos tipos sin modificar código existente

### 2. Template Method Pattern
- **Descripción:** Algoritmo común con pasos específicos por tipo
- **Cómo se aplica:** Proceso genérico de actualización con pasos configurables por `inercia_termica`
- **Beneficios:** Reutilización de código, consistencia

### 3. Background Task Pattern
- **Descripción:** Tareas que se ejecutan periódicamente en segundo plano
- **Cómo se aplica:** Similar a `CelestialTimeService`, actualiza temperatura cada X minutos
- **Beneficios:** No bloquea requests, actualización continua

## Beneficios de la Nueva Arquitectura

1. **Realismo mejorado:**
   - El agua absorbe temperatura del sol/ambiente
   - El agua conserva temperatura (alta inercia térmica)
   - El hielo también funciona (sistema genérico)
   - Temperatura del agua afecta temperatura del bloque

2. **Extensibilidad:**
   - Fácil agregar nuevos tipos (lava, otros líquidos)
   - Sistema genérico basado en propiedades físicas
   - Preparado para Fase 2 (propagación de calor)

3. **Mantenibilidad:**
   - Código claro y documentado
   - Separación de responsabilidades
   - Fácil debuggear problemas

4. **Performance:**
   - Actualización periódica (no en cada request)
   - Solo actualiza partículas de bloques activos
   - Cacheo de temperatura del bloque

## Migración Propuesta

### Fase 1: Sistema de Conservación de Calor (Actual)

**Objetivo:** Hacer que partículas con `inercia_termica` absorban y conserven temperatura del ambiente.

**Pasos:**

1. **Mejorar `get_water_modifier()`:**
   - Leer `particula.temperatura` de partículas de agua/hielo
   - Calcular diferencia de temperatura
   - Aplicar propagación de calor según distancia y `conductividad_termica`

2. **Crear `update_particle_temperature()`:**
   - Función genérica que actualiza temperatura de cualquier partícula
   - Usa `inercia_termica` del tipo de partícula
   - Calcula diferencia con temperatura ambiental
   - Actualiza `particula.temperatura` en BD

3. **Crear `get_particle_temperature_modifier()`:**
   - Función genérica que busca partículas de tipos específicos
   - Lee temperatura de cada una
   - Calcula modificador según diferencia de temperatura
   - Funciona para agua, hielo, lava, etc.

4. **Integrar background task:**
   - Similar a `CelestialTimeService`
   - Actualiza temperatura de partículas cada X minutos
   - Solo partículas de bloques activos

5. **Actualizar `calculate_cell_temperature()`:**
   - Usar `get_particle_temperature_modifier()` en lugar de `get_water_modifier()` mejorado
   - Considerar temperatura de partículas individuales

### Fase 2: Propagación de Calor y Eventos (Futuro)

**Objetivo:** Sistema completo de propagación de calor y eventos dinámicos (fuego, incendios).

**Pasos:**

1. Crear `get_fire_modifier()` para fuego/lava
2. Crear sistema de propagación de calor entre partículas
3. Integrar con sistema de transiciones (agua → hielo)
4. Sistema de eventos (incendios, erupciones)

## Consideraciones Técnicas

### Backend

1. **Compatibilidad:**
   - Mantener compatibilidad con código existente
   - `get_water_modifier()` mejorado mantiene misma firma
   - Nuevas funciones son adicionales

2. **Base de datos:**
   - Actualizar `particula.temperatura` periódicamente
   - Usar UPDATE batch para performance
   - Solo actualizar partículas de bloques activos

3. **APIs:**
   - No hay cambios en endpoints existentes
   - Endpoint de temperatura sigue funcionando igual
   - Frontend no necesita cambios

4. **Performance:**
   - Background task se ejecuta cada 5 minutos (configurable)
   - Solo actualiza partículas de bloques activos
   - UPDATE batch para eficiencia

### Frontend

1. **Renderizado:**
   - Sin cambios en renderizado
   - Temperatura se muestra en F3 (ya optimizado)

2. **Optimización:**
   - Ya limitado a 1 llamada por minuto
   - No requiere más optimizaciones

3. **Extensibilidad:**
   - Preparado para mostrar temperatura de partículas individuales (futuro)

## Ejemplo de Uso Futuro

```python
# En background task (cada 5 minutos)
async def update_particle_temperatures_periodically():
    while True:
        await asyncio.sleep(300)  # 5 minutos
        
        # Obtener bloques activos
        bloques_activos = world_bloque_manager.get_active_blocks()
        
        for bloque in bloques_activos:
            # Calcular temperatura ambiental del bloque
            temp_ambiente = await bloque.calcular_temperatura(celestial_service)
            
            # Obtener partículas con inercia_termica > 0
            particulas = await get_particulas_con_inercia(bloque.bloque_id)
            
            for particula in particulas:
                # Actualizar temperatura según inercia_termica
                await update_particle_temperature(
                    particula_id=particula['id'],
                    temp_ambiente=temp_ambiente,
                    tipo_particula=particula['tipo']
                )

# Al calcular temperatura del bloque
async def calculate_cell_temperature(...):
    # ... código existente ...
    
    # Modificador por partículas (agua, hielo, lava)
    mod_particulas = await get_particle_temperature_modifier(
        celda_x, celda_y, celda_z,
        bloque_id,
        tipos_particulas=['agua', 'hielo', 'lava']
    )
    
    temperatura_final = temp_solar + mod_altitud + mod_agua + mod_albedo + mod_particulas
```

## Conclusión

La arquitectura propuesta mejora significativamente el realismo del sistema de temperatura al:

1. **Hacer que el agua absorba y conserve temperatura** del ambiente (sol, aire)
2. **Funcionar genéricamente** para cualquier partícula con `inercia_termica` (agua, hielo, lava)
3. **Respetar propiedades físicas** (inercia_termica, albedo, conductividad_termica)
4. **Preparar el sistema** para Fase 2 (propagación de calor, fuego, eventos)

El sistema es **extensible, mantenible y realista**, siguiendo principios físicos reales mientras mantiene performance y escalabilidad.

