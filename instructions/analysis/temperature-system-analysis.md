# Análisis del Sistema de Temperatura - Comparación con el Mundo Real

**Fecha:** 2025-12-26  
**Objetivo:** Analizar cómo funciona actualmente el sistema de temperatura y cómo debería relacionarse con eventos reales del mundo (agua, fuego, incendios).

---

## 📊 Estado Actual del Sistema

### 1. Cálculo de Temperatura del Bloque

**Ubicación:** `backend/src/services/world_bloque.py` → `calcular_temperatura()`

**Proceso actual:**
1. Calcula temperatura en el **centro del bloque** (40x40x40 celdas)
2. Usa `calculate_cell_temperature()` que integra:
   - **Temperatura solar** (latitud + posición del sol)
   - **Modificador por altitud** (-6.5°C cada 1000 unidades)
   - **Modificador por proximidad al agua** (busca agua en radio de 10 celdas)
   - **Modificador por albedo** (tipo de superficie)

**Problema identificado:**
- ❌ **NO considera la temperatura real del agua** (solo proximidad)
- ❌ **NO considera partículas de fuego/lava** (no existe en el sistema)
- ❌ **NO hay propagación de calor** entre partículas
- ❌ **Temperatura del bloque es estática** (no cambia con eventos)

---

## 🌍 Comparación con el Mundo Real

### Caso 1: Agua Cercana

**Mundo Real:**
- El agua tiene **temperatura propia** (puede estar fría o caliente)
- El agua **modera la temperatura** del aire cercano
- Agua fría (5°C) → enfría el aire cercano
- Agua caliente (40°C) → calienta el aire cercano
- El efecto depende de la **diferencia de temperatura** y la **distancia**

**Sistema Actual:**
```python
# get_water_modifier() - líneas 87-146
# ❌ Solo busca proximidad (distancia)
# ❌ NO lee la temperatura del agua
# ❌ Aplica modificador fijo de ±5°C
# ❌ No considera si el agua está caliente o fría
```

**Lo que falta:**
- Leer `particula.temperatura` de las partículas de agua cercanas
- Calcular diferencia de temperatura: `temp_agua - temp_ambiente`
- Aplicar propagación de calor basada en `conductividad_termica`
- Considerar `inercia_termica` del agua (cambia temperatura lentamente)

---

### Caso 2: Incendio en un Bosque

**Mundo Real:**
- Un incendio **genera calor intenso** (500-1000°C)
- El calor se **propaga** a partículas cercanas (madera, hojas, aire)
- La temperatura del aire **aumenta significativamente** cerca del fuego
- El fuego puede **propagarse** si hay material combustible cerca
- El calor se disipa con la distancia (ley del cuadrado inverso)

**Sistema Actual:**
- ❌ **NO existe partícula de fuego** en el sistema
- ❌ **NO hay propagación de calor** entre partículas
- ❌ **NO hay eventos de incendio** que modifiquen temperatura
- ❌ El bloque tiene temperatura fija (no cambia con eventos)

**Lo que falta:**
- Partículas de tipo `fuego` o `energia_fuego` con temperatura alta (500-1000°C)
- Sistema de propagación de calor usando `conductividad_termica`
- Eventos de incendio que crean partículas de fuego
- Modificador de temperatura por partículas de fuego cercanas

---

### Caso 3: Lava

**Mundo Real:**
- La lava tiene temperatura muy alta (700-1200°C)
- Calienta el aire y las rocas cercanas
- Puede derretir materiales (punto de fusión)
- El calor se propaga por conducción

**Sistema Actual:**
- ✅ Existe partícula `lava` en seed data
- ❌ **NO se usa su temperatura** en el cálculo
- ❌ **NO propaga calor** a partículas cercanas
- ❌ La lava tiene temperatura por defecto (20°C) en BD

---

## 🔍 Análisis Detallado del Código Actual

### Función: `get_water_modifier()`

```python
# Líneas 87-146 de temperature_service.py

# ❌ PROBLEMA 1: Solo busca proximidad
particulas_cercanas = await get_particulas_vecinas(...)
for particula in particulas_cercanas:
    tipo_nombre = particula.get('tipo_nombre', '').lower()
    if tipo_nombre in ['agua', 'oceano', 'agua_sucia']:
        # ❌ PROBLEMA 2: NO lee particula.temperatura
        # ❌ PROBLEMA 3: Solo calcula distancia
        distancia = calcular_distancia(...)
        
# ❌ PROBLEMA 4: Modificador fijo (±5°C)
return factor * 5.0  # No considera temperatura real del agua
```

**Lo que debería hacer:**
```python
# ✅ Leer temperatura del agua
temp_agua = particula.get('temperatura', 20.0)

# ✅ Calcular diferencia de temperatura
diferencia = temp_agua - temp_ambiente

# ✅ Aplicar propagación de calor (ley del cuadrado inverso)
factor_distancia = 1.0 / (1.0 + distancia ** 2)
modificador = diferencia * factor_distancia * conductividad_termica_agua
```

---

### Función: `calculate_cell_temperature()`

```python
# Líneas 188-253 de temperature_service.py

# ✅ Calcula temperatura solar
temp_solar = calculate_solar_temperature(...)

# ✅ Modificador por altitud
mod_altitud = get_altitude_modifier(...)

# ⚠️ Modificador por agua (incompleto)
mod_agua = await get_water_modifier(...)  # Solo proximidad, no temperatura

# ✅ Modificador por albedo
mod_albedo = await get_albedo_modifier(...)

# ❌ PROBLEMA: NO busca partículas de fuego/lava
# ❌ PROBLEMA: NO considera temperatura de partículas individuales
# ❌ PROBLEMA: NO hay propagación de calor

temperatura_final = temp_solar + mod_altitud + mod_agua + mod_albedo
```

**Lo que falta:**
```python
# ✅ Buscar partículas de fuego/lava cercanas
mod_fuego = await get_fire_modifier(...)

# ✅ Considerar temperatura de partículas individuales
mod_particulas = await get_particle_temperature_modifier(...)

# ✅ Propagación de calor
temperatura_final = temp_solar + mod_altitud + mod_agua + mod_albedo + mod_fuego + mod_particulas
```

---

## 🎯 Propuesta de Sistema Híbrido

### Arquitectura Propuesta

**1. Temperatura Base del Bloque (Ambiental)**
- Calculada como ahora (solar + altitud + albedo)
- Representa temperatura del aire/ambiente
- Se actualiza periódicamente (cada X minutos)

**2. Temperatura de Partículas Individuales**
- Cada partícula tiene `temperatura` en BD
- Puede diferir de la temperatura base del bloque
- Ejemplos:
  - Fuego: 500-1000°C
  - Lava: 700-1200°C
  - Agua caliente: 40-80°C
  - Hielo: -10 a 0°C

**3. Propagación de Calor**
- Sistema que propaga calor entre partículas cercanas
- Usa `conductividad_termica` (velocidad de propagación)
- Usa `inercia_termica` (resistencia al cambio)
- Ley del cuadrado inverso para distancia

**4. Modificadores Dinámicos**
- **Fuego cercano:** Aumenta temperatura del bloque
- **Agua caliente/fría:** Modifica temperatura según diferencia
- **Lava:** Aumenta temperatura significativamente
- **Hielo:** Disminuye temperatura

---

## 📋 Cambios Necesarios

### 1. Modificar `get_water_modifier()`

**Actual:**
- Solo busca proximidad
- Modificador fijo ±5°C

**Propuesto:**
- Leer `particula.temperatura` del agua
- Calcular diferencia de temperatura
- Aplicar propagación de calor basada en distancia y `conductividad_termica`

### 2. Crear `get_fire_modifier()`

**Nuevo:**
- Buscar partículas de tipo `fuego`, `energia_fuego`, `lava`
- Leer temperatura de estas partículas
- Calcular efecto de calor (ley del cuadrado inverso)
- Aplicar según `conductividad_termica` del aire/material

### 3. Crear Sistema de Propagación de Calor

**Nuevo servicio:** `heat_propagation_service.py`
- Propaga calor entre partículas cercanas
- Actualiza `particula.temperatura` en BD
- Considera `conductividad_termica` e `inercia_termica`
- Se ejecuta periódicamente (cada X segundos)

### 4. Modificar `calculate_cell_temperature()`

**Agregar:**
- Modificador por fuego/lava cercano
- Modificador por temperatura de partículas individuales
- Considerar temperatura actual del bloque vs. temperatura base

---

## 🔥 Ejemplo: Incendio en un Bosque

### Escenario Real

1. **Jugador crea fuego** (partícula `fuego` con temperatura 800°C)
2. **Fuego calienta partículas cercanas:**
   - Madera cercana: 20°C → 150°C (puede iniciar nuevo fuego)
   - Hojas cercanas: 20°C → 200°C (se queman)
   - Aire cercano: 20°C → 50°C
3. **Temperatura del bloque aumenta:**
   - Bloque base: 20°C
   - Con fuego cercano: 20°C + 30°C (modificador) = 50°C
4. **Fuego se propaga:**
   - Si madera > punto_combustion → crea nuevo fuego
   - Sistema de propagación automática

### Implementación Propuesta

```python
# 1. Buscar partículas de fuego en el bloque
fuegos = await buscar_particulas_tipo(bloque_id, ['fuego', 'energia_fuego', 'lava'])

# 2. Calcular modificador de temperatura por fuego
mod_fuego = 0.0
for fuego in fuegos:
    temp_fuego = fuego['temperatura']  # 800°C
    distancia = calcular_distancia(centro_bloque, fuego)
    # Ley del cuadrado inverso
    factor = 1.0 / (1.0 + distancia ** 2)
    # Conductividad del aire
    mod_fuego += (temp_fuego - temp_base) * factor * 0.1  # 10% de propagación

# 3. Aplicar al cálculo de temperatura
temperatura_final = temp_solar + mod_altitud + mod_agua + mod_albedo + mod_fuego
```

---

## 💧 Ejemplo: Agua Caliente

### Escenario Real

1. **Agua caliente** (partícula `agua` con temperatura 60°C)
2. **Calienta partículas cercanas:**
   - Aire: 20°C → 25°C
   - Piedra: 20°C → 30°C (alta conductividad)
   - Madera: 20°C → 22°C (baja conductividad)
3. **Temperatura del bloque aumenta:**
   - Bloque base: 20°C
   - Con agua caliente: 20°C + 5°C = 25°C

### Implementación Propuesta

```python
# get_water_modifier() mejorado
for particula in particulas_agua:
    temp_agua = particula['temperatura']  # 60°C (no siempre 20°C)
    temp_ambiente = temp_solar + mod_altitud  # 20°C
    
    diferencia = temp_agua - temp_ambiente  # 40°C
    distancia = calcular_distancia(...)
    
    # Propagación de calor (agua tiene alta inercia_termica)
    factor = 1.0 / (1.0 + distancia ** 2)
    conductividad = tipo_agua['conductividad_termica']  # 0.6 (agua)
    
    modificador += diferencia * factor * conductividad
```

---

## 📊 Comparación: Actual vs. Propuesto

| Aspecto | Sistema Actual | Sistema Propuesto |
|---------|----------------|-------------------|
| **Temperatura del agua** | ❌ No se considera | ✅ Se lee de BD |
| **Fuego/Incendio** | ❌ No existe | ✅ Partículas de fuego |
| **Propagación de calor** | ❌ No hay | ✅ Sistema completo |
| **Temperatura por partícula** | ✅ Existe en BD | ✅ Se usa activamente |
| **Eventos dinámicos** | ❌ No afectan temperatura | ✅ Afectan temperatura |
| **Realismo** | ⚠️ Básico | ✅ Alto |

---

## 🎯 Preguntas para Discutir

1. **¿Queremos propagación de calor en tiempo real?**
   - Opción A: Sistema completo (más realista, más complejo)
   - Opción B: Solo modificadores (más simple, menos realista)

2. **¿Cómo manejar incendios?**
   - Opción A: Sistema automático de propagación
   - Opción B: Solo cuando el jugador crea fuego manualmente

3. **¿Frecuencia de actualización?**
   - Temperatura del bloque: ¿Cada cuánto se recalcula?
   - Propagación de calor: ¿Cada cuánto se propaga?

4. **¿Prioridad de implementación?**
   - Fase 1: Leer temperatura del agua
   - Fase 2: Modificador por fuego/lava
   - Fase 3: Sistema de propagación completo

---

## 💧 Análisis: ¿Cómo Obtiene el Agua su Temperatura?

### En el Mundo Real

**Fuentes de calor para el agua:**
1. **Radiación solar** (principal)
   - El sol calienta el agua directamente
   - El agua absorbe radiación según su `albedo` (agua: ~0.1, absorbe 90%)
   - Proceso lento pero constante

2. **Conducción desde el ambiente**
   - Contacto con aire caliente/frío
   - Contacto con materiales calientes (lava, rocas calientes)
   - Contacto con materiales fríos (hielo, nieve)

3. **Convección** (en líquidos)
   - El agua caliente sube, el agua fría baja
   - Mezcla y equilibra temperatura

**Propiedades del agua:**
- **Alta inercia térmica** (calor específico ~4.0)
  - Cambia temperatura **muy lentamente**
  - Conserva temperatura mejor que el aire
  - Requiere mucha energía para cambiar 1°C

- **Moderador de temperatura**
  - Agua caliente → calienta el aire cercano
  - Agua fría → enfría el aire cercano
  - Efecto más pronunciado que el aire

### Propuesta para el Juego

**Sistema de Absorción y Conservación:**

1. **El agua absorbe temperatura del ambiente:**
   ```python
   # Cada X minutos (ej: cada 5 minutos de juego)
   temp_ambiente = calcular_temperatura_ambiental(celda_x, celda_y, celda_z)
   temp_agua_actual = particula.temperatura
   
   # Calcular diferencia
   diferencia = temp_ambiente - temp_agua_actual
   
   # El agua cambia temperatura lentamente (alta inercia_termica)
   inercia_agua = tipo_agua.inercia_termica  # ~4.0
   factor_cambio = 1.0 / inercia_agua  # 0.25 (cambia 25% de la diferencia)
   
   # Nueva temperatura del agua
   nueva_temp_agua = temp_agua_actual + (diferencia * factor_cambio)
   ```

2. **El agua conserva temperatura:**
   - Si el ambiente cambia rápidamente (día/noche), el agua cambia lentamente
   - Si el ambiente es estable, el agua se equilibra con el ambiente
   - El agua "memoriza" la temperatura del día anterior

3. **El agua afecta el ambiente:**
   - Agua caliente → calienta aire cercano
   - Agua fría → enfría aire cercano
   - Efecto moderador (reduce extremos)

**Ejemplo práctico:**

```
Día (12:00 PM):
- Temperatura ambiente: 30°C
- Agua: 20°C → 22°C (absorbe calor lentamente)

Noche (12:00 AM):
- Temperatura ambiente: 10°C
- Agua: 22°C → 20°C (pierde calor lentamente)
- El agua aún está más caliente que el aire (conserva calor del día)

Día siguiente (12:00 PM):
- Temperatura ambiente: 30°C
- Agua: 20°C → 25°C (se calienta más rápido porque ya estaba a 20°C)
```

---

## 📝 Conclusión

El sistema actual es **básico** y no considera eventos dinámicos del mundo. Para hacerlo más realista, necesitamos:

1. ✅ Leer temperatura de partículas individuales (agua, fuego, lava)
2. ✅ Crear modificadores dinámicos (fuego, lava)
3. ✅ Sistema de propagación de calor (opcional pero recomendado)
4. ✅ Actualizar temperatura del bloque cuando hay eventos
5. ✅ **Sistema de absorción de temperatura para el agua** (absorbe del ambiente y conserva)

**Propuesta de implementación:**

**Fase 1: Agua conserva temperatura**
- Sistema que actualiza `particula.temperatura` del agua periódicamente
- Absorbe temperatura del ambiente (temperatura del bloque)
- Cambia lentamente según `inercia_termica`
- El agua afecta la temperatura del bloque (modificador dinámico)

**Fase 2: Fuego y eventos**
- Partículas de fuego con temperatura alta
- Modificador de temperatura por fuego cercano
- Sistema de propagación (opcional)

**¿Qué opinas? ¿Empezamos con Fase 1 (agua conserva temperatura)?**

---

## ❄️ Consideración: Cambios de Estado (Agua → Hielo)

### Pregunta Clave

**¿Qué pasa cuando el agua se convierte en hielo?**

### Respuesta: El Sistema Debe Funcionar para Ambos

**Cuando el agua se convierte en hielo:**
1. Cambia `tipo_particula_id` (de 'agua' a 'hielo')
2. Cambia `estado_materia_id` (de 'liquido' a 'solido')
3. Las propiedades físicas cambian:
   - **Albedo**: 0.1 (agua) → 0.8 (hielo) - refleja más luz
   - **Inercia térmica**: ~4.0 (agua) → diferente (hielo) - cambia temperatura más rápido
   - **Tipo físico**: 'liquido' → 'solido'

**El hielo también absorbe temperatura del ambiente:**
- ✅ Absorbe radiación solar (aunque menos por mayor albedo)
- ✅ Absorbe temperatura del aire/materiales cercanos
- ✅ Cambia temperatura según `inercia_termica` del hielo
- ✅ **Enfría el aire cercano** (efecto opuesto al agua caliente)

### Propuesta Actualizada

**Sistema genérico para partículas con `inercia_termica`:**

1. **No solo agua, sino cualquier partícula con `inercia_termica > 0`**
   - Agua (líquido)
   - Hielo (sólido)
   - Lava (líquido)
   - Otros materiales que conservan temperatura

2. **Función genérica: `update_particle_temperature()`**
   ```python
   async def update_particle_temperature(
       particula_id: str,
       temp_ambiente: float,
       tipo_particula: dict  # Con inercia_termica, albedo, etc.
   ):
       temp_actual = particula.temperatura
       diferencia = temp_ambiente - temp_actual
       
       # Factor de cambio según inercia_termica
       inercia = tipo_particula.inercia_termica  # 4.0 para agua, diferente para hielo
       factor_cambio = 1.0 / inercia
       
       nueva_temp = temp_actual + (diferencia * factor_cambio)
       # Actualizar particula.temperatura en BD
   ```

3. **Modificador genérico: `get_particle_temperature_modifier()`**
   ```python
   async def get_particle_temperature_modifier(
       celda_x, celda_y, celda_z,
       bloque_id,
       tipos_particulas: List[str]  # ['agua', 'hielo', 'lava']
   ):
       # Buscar partículas de estos tipos
       # Leer temperatura de cada una
       # Calcular modificador según diferencia de temperatura
       # Agua caliente → calienta
       # Hielo → enfría
   ```

### Ventajas de este Enfoque

1. ✅ **Funciona para agua Y hielo** (y otros materiales)
2. ✅ **Respeta propiedades físicas** (inercia_termica, albedo)
3. ✅ **Funciona con cambios de estado** (agua → hielo → agua)
4. ✅ **Extensible** (fácil agregar otros materiales)

### Ejemplo: Agua → Hielo → Agua

```
Día (30°C):
- Agua: 20°C → 22°C (absorbe calor lentamente, inercia 4.0)

Noche (-5°C):
- Agua: 22°C → 18°C → 15°C → ... → 0°C
- Agua se congela → Hielo (temperatura: 0°C)

Día siguiente (30°C):
- Hielo: 0°C → 2°C → 4°C (absorbe calor más rápido, inercia menor)
- Hielo se derrite → Agua (temperatura: 0°C)
- Agua: 0°C → 5°C → 10°C (absorbe calor lentamente, inercia 4.0)
```

**¿Te parece bien este enfoque genérico?**

