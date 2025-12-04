# Acuífero / Napa Subterránea

## Descripción

Un acuífero o napa subterránea es una formación geológica que contiene agua en sus poros o grietas. El agua se almacena y fluye a través de materiales porosos (como tierra o arena) y está contenida por capas impermeables (como roca sólida). Los acuíferos son fundamentales para el ciclo del agua y pueden emerger como manantiales cuando encuentran una salida natural.

**Características principales:**
- Agua almacenada en materiales porosos (tierra, arena)
- Capas impermeables que contienen el agua (roca sólida)
- Nivel freático (superficie del agua subterránea)
- Flujo de agua por gravedad y presión
- Temperatura estable y fresca

**Cuándo usar:**
- Crear sistemas de agua subterránea
- Generar manantiales y fuentes de agua
- Establecer recursos hídricos para ecosistemas
- Crear interacciones entre superficie y subsuelo
- Simular ciclos hidrológicos

## Estructura de Capas

### Nivel Z = 0 (Superficie)
- **Tipo de partícula**: `hierba` o `tierra` (terreno normal)
- **Distribución**: Completa, cubriendo toda el área horizontal
- **Propiedades**:
  - Densidad: 0.3 (hierba) o 1.5 (tierra)
  - Temperatura: 20°C
  - Energía: 0.0
  - Estado de materia: `solido`
- **Notas**: La superficie normal. El agua puede filtrarse desde aquí hacia el acuífero.

### Nivel Z = -1 a Z = -5 (Zona de Infiltración)
- **Tipo de partícula**: `tierra` (material poroso)
- **Distribución**: Completa, capas de suelo poroso
- **Propiedades**:
  - Densidad: 1.5
  - Temperatura: 18-19°C
  - Energía: 0.0
  - Estado de materia: `solido`
- **Notas**: Estas capas permiten que el agua se filtre desde la superficie hacia el acuífero. El material es poroso y permite el paso del agua.

### Nivel Z = -6 (Zona de Saturación - Base del Acuífero)
- **Tipo de partícula**: `tierra` (saturada de agua)
- **Distribución**: Completa, capa saturada
- **Propiedades**:
  - Densidad: 1.5
  - Temperatura: 17°C
  - Energía: 0.0
  - Estado de materia: `solido`
- **Notas**: Esta es la capa base del acuífero, donde el material está completamente saturado de agua.

### Nivel Z = -7 a Z = -9 (Nivel Freático - Agua)
- **Tipo de partícula**: `agua` (agua subterránea)
- **Distribución**: Completa, capa de agua
- **Propiedades**:
  - Densidad: 1.0
  - Temperatura: 15-16°C (más fría que la superficie)
  - Energía: 0.0
  - Estado de materia: `liquido`
- **Notas**: Esta es la zona saturada donde el agua se almacena. El nivel freático es la superficie superior de esta zona (z=-7). El agua puede fluir horizontalmente por gravedad.

### Nivel Z = -10 (Capa Impermeable)
- **Tipo de partícula**: `piedra` (roca sólida impermeable)
- **Distribución**: Completa, capa base impermeable
- **Propiedades**:
  - Densidad: 2.5
  - Temperatura: 12°C
  - Energía: 0.0
  - Estado de materia: `solido`
- **Notas**: Esta capa de roca sólida impide que el agua continúe filtrándose hacia abajo. Contiene el acuífero y lo separa del límite inferior (partículas límite en z = profundidad_maxima).

### Nivel Z = -11 a Z = -13 (Roca Sólida)
- **Tipo de partícula**: `piedra`
- **Distribución**: Completa, roca sólida bajo la capa impermeable
- **Propiedades**:
  - Densidad: 2.5
  - Temperatura: 10-12°C
  - Energía: 0.0
  - Estado de materia: `solido`
- **Notas**: Capas adicionales de roca sólida que proporcionan soporte estructural.

## Distribución Espacial

### Área Completa: X: [0, max_x-1], Y: [0, max_y-1]
- **Partículas**: Capas completas según estructura vertical
- **Patrón**: Uniforme en toda el área
- **Densidad**: 100% de cobertura en cada capa
- **Ejemplo**: Acuífero que se extiende horizontalmente bajo toda el área

### Zona de Manantial (Opcional): X: [x_manantial], Y: [y_manantial]
- **Partículas**: `agua` que emerge a la superficie
- **Patrón**: Punto específico donde el agua emerge
- **Densidad**: Agua fluyendo desde z=-7 hasta z=0 o z=1
- **Ejemplo**: Manantial donde el agua subterránea encuentra una salida natural

### Zona de Recarga (Opcional): Áreas específicas
- **Partículas**: `tierra` más porosa o `arena` en superficie
- **Patrón**: Áreas donde el agua de lluvia se infiltra más fácilmente
- **Densidad**: Variable, áreas con mayor porosidad
- **Ejemplo**: Zonas de recarga donde el agua de superficie se filtra más rápido

## Propiedades de Partículas

| Tipo | Densidad | Temperatura | Energía | Estado | Notas |
|------|----------|-------------|---------|--------|-------|
| hierba | 0.3 | 20°C | 0.0 | solido | Superficie |
| tierra | 1.5 | 17-19°C | 0.0 | solido | Material poroso |
| agua | 1.0 | 15-16°C | 0.0 | liquido | Agua subterránea |
| piedra | 2.5 | 10-12°C | 0.0 | solido | Capa impermeable |
| arena | 1.2 | 20°C | 0.0 | solido | Zona de recarga (opcional) |

## Reglas de Generación

### Paso 1: Crear capa impermeable base
1. Para cada celda (x, y) en el rango [0, max_x-1] x [0, max_y-1]:
   - Crear partículas `piedra` desde z=-10 hasta z=-13 (o hasta profundidad_maxima+1)
   - Estas son las capas impermeables que contienen el acuífero

**Ejemplo:**
```python
# Pseudocódigo
for x in range(0, max_x):
    for y in range(0, max_y):
        for z in range(-13, -9):  # Capas de roca impermeable
            crear_particula(x, y, z, 'piedra', estado='solido', densidad=2.5, temperatura=12)
```

### Paso 2: Crear nivel freático (agua)
1. Para cada celda (x, y):
   - Crear partículas `agua` en z=-7, z=-8, z=-9
   - Esta es la zona saturada del acuífero
   - El nivel freático está en z=-7 (superficie del agua)

**Ejemplo:**
```python
# Pseudocódigo
for x in range(0, max_x):
    for y in range(0, max_y):
        for z in range(-9, -6):  # Nivel freático (agua)
            crear_particula(x, y, z, 'agua', estado='liquido', densidad=1.0, temperatura=15)
```

### Paso 3: Crear zona de saturación (tierra saturada)
1. Para cada celda (x, y):
   - Crear partícula `tierra` en z=-6
   - Esta capa está saturada de agua pero se representa como tierra porosa

**Ejemplo:**
```python
# Pseudocódigo
for x in range(0, max_x):
    for y in range(0, max_y):
        crear_particula(x, y, -6, 'tierra', estado='solido', densidad=1.5, temperatura=17)
```

### Paso 4: Crear zona de infiltración (tierra porosa)
1. Para cada celda (x, y):
   - Crear partículas `tierra` en z=-1 a z=-5
   - Estas capas permiten que el agua se filtre desde la superficie

**Ejemplo:**
```python
# Pseudocódigo
for x in range(0, max_x):
    for y in range(0, max_y):
        for z in range(-5, 0):  # Zona de infiltración
            crear_particula(x, y, z, 'tierra', estado='solido', densidad=1.5, temperatura=18)
```

### Paso 5: Crear superficie
1. Para cada celda (x, y):
   - Crear partícula `hierba` o `tierra` en z=0
   - Esta es la superficie desde donde el agua puede infiltrarse

**Ejemplo:**
```python
# Pseudocódigo
for x in range(0, max_x):
    for y in range(0, max_y):
        crear_particula(x, y, 0, 'hierba', estado='solido', densidad=0.3, temperatura=20)
```

### Paso 6: Crear manantial (opcional)
1. Seleccionar posición de manantial (x_manantial, y_manantial):
   - Puede ser aleatoria o en una posición específica (ej: cerca de una pendiente)
2. Crear columna de agua desde el acuífero hasta la superficie:
   - Crear partículas `agua` desde z=-7 hasta z=0 o z=1
   - El agua emerge naturalmente debido a la presión del acuífero

**Ejemplo:**
```python
# Pseudocódigo - Crear manantial
x_manantial = random.randint(10, max_x - 10)
y_manantial = random.randint(10, max_y - 10)

# Crear columna de agua desde acuífero hasta superficie
for z in range(-7, 2):  # Desde nivel freático hasta superficie
    crear_particula(x_manantial, y_manantial, z, 'agua', estado='liquido', densidad=1.0, temperatura=15)
```

### Paso 7: Crear zona de recarga (opcional)
1. Definir áreas de recarga donde el agua se infiltra más fácilmente:
   - Reemplazar `tierra` con `arena` en algunas áreas de superficie (z=0)
   - O crear áreas con mayor porosidad en z=-1 a z=-3

**Ejemplo:**
```python
# Pseudocódigo - Crear zona de recarga
for i in range(5):  # Crear 5 zonas de recarga
    x_recarga = random.randint(5, max_x - 5)
    y_recarga = random.randint(5, max_y - 5)
    radio = 3  # Radio de la zona de recarga
    
    for dx in range(-radio, radio + 1):
        for dy in range(-radio, radio + 1):
            if dx*dx + dy*dy <= radio*radio:
                x = x_recarga + dx
                y = y_recarga + dy
                if 0 <= x < max_x and 0 <= y < max_y:
                    # Reemplazar tierra con arena en superficie
                    eliminar_particula(x, y, 0, 'hierba')
                    crear_particula(x, y, 0, 'arena', estado='solido', densidad=1.2, temperatura=20)
```

## Variaciones

### Variación 1: Acuífero Superficial
- **Descripción**: Acuífero cercano a la superficie, con nivel freático alto
- **Modificaciones**: 
  - Nivel freático en z=-3 a z=-5 (más cerca de la superficie)
  - Zona de infiltración más delgada (z=-1 a z=-2)
  - Mayor interacción con la superficie
- **Cuándo usar**: Áreas con alta precipitación, zonas húmedas, cerca de ríos

### Variación 2: Acuífero Profundo
- **Descripción**: Acuífero profundo, con nivel freático bajo
- **Modificaciones**: 
  - Nivel freático en z=-10 a z=-12 (más profundo)
  - Zona de infiltración más gruesa (z=-1 a z=-9)
  - Menor interacción directa con la superficie
- **Cuándo usar**: Áreas áridas, desiertos, zonas con poca precipitación

### Variación 3: Acuífero con Manantiales
- **Descripción**: Acuífero que emerge en múltiples puntos como manantiales
- **Modificaciones**: 
  - 3-5 manantiales distribuidos en el área
  - Agua que emerge en diferentes puntos
  - Posible formación de arroyos en superficie
- **Cuándo usar**: Áreas montañosas, laderas, zonas con pendiente

### Variación 4: Acuífero Confinado
- **Descripción**: Acuífero entre dos capas impermeables
- **Modificaciones**: 
  - Capa impermeable superior en z=-5
  - Agua confinada en z=-6 a z=-8
  - Capa impermeable inferior en z=-9
  - Mayor presión del agua
- **Cuándo usar**: Sistemas geológicos complejos, acuíferos artesianos

## Interacciones

### Con terreno superior
- **Con bosques**: Los árboles pueden acceder al agua del acuífero a través de sus raíces
- **Con ríos**: Los ríos pueden recargar el acuífero o ser alimentados por él
- **Con lluvia**: El agua de lluvia se infiltra y recarga el acuífero

### Con partículas límite
- Las partículas límite se crean automáticamente en `z = profundidad_maxima`
- El acuífero debe respetar estos límites
- La capa impermeable en z=-10 debe estar al menos 1 celda por encima de `profundidad_maxima`

### Con otros sistemas subterráneos
- **Con cuevas**: Las cuevas pueden intersectar el acuífero, creando lagos subterráneos
- **Con otros acuíferos**: Múltiples acuíferos pueden conectarse o estar separados por capas impermeables

### Con superficie
- **Manantiales**: El agua puede emerger naturalmente en la superficie
- **Pozos**: Se pueden crear pozos para acceder al agua (representados como columnas de aire/agua)
- **Humedales**: Áreas donde el nivel freático está muy cerca de la superficie

## Optimizaciones

- **Generación por capas**: Crear el acuífero capa por capa para mejor control y validación
- **Validación de nivel freático**: Asegurar que el nivel freático esté por encima de la capa impermeable
- **Cálculo de presión**: Considerar la presión del agua para determinar si emergerá como manantial
- **Flujo de agua**: Implementar lógica de flujo horizontal del agua por gravedad (futuro)

## Notas Adicionales

- **Ciclo del agua**: Los acuíferos son parte del ciclo del agua. El agua se recarga desde la superficie y puede emerger como manantiales
- **Presión**: El agua en acuíferos confinados tiene mayor presión y puede emerger naturalmente
- **Calidad del agua**: El agua subterránea generalmente es más limpia que el agua superficial
- **Temperatura**: El agua subterránea mantiene una temperatura más estable que el agua superficial
- **Tamaño mínimo**: Para un acuífero funcional, se recomienda una dimensión de al menos 25x25 celdas (6.25m x 6.25m con celda de 0.25m)
- **Nivel freático variable**: En implementaciones avanzadas, el nivel freático puede variar según la recarga y el uso

## Ejemplo Completo

### Configuración de Dimensión
- **Ancho**: 25 metros (100 celdas con celda de 0.25m)
- **Alto**: 25 metros (100 celdas)
- **Profundidad máxima**: -15 (z mínimo)
- **Altura máxima**: 5 (z máximo)
- **Tamaño de celda**: 0.25 metros

### Resultado Esperado
- **Total de partículas de roca**: ~40,000 (100 x 100 x 4 capas)
- **Total de partículas de agua**: ~30,000 (100 x 100 x 3 capas)
- **Total de partículas de tierra**: ~60,000 (100 x 100 x 6 capas)
- **Total de partículas de superficie**: ~10,000 (100 x 100 x 1 capa)
- **Manantiales (opcional)**: 2-3 manantiales
- **Zonas de recarga (opcional)**: 3-5 zonas
- **Tipos únicos**: hierba, tierra, agua, piedra, arena (opcional)
- **Tiempo estimado de generación**: 5-10 minutos

### Distribución por Tipo
- `piedra`: ~40,000 partículas (capas impermeables y roca sólida)
- `agua`: ~30,000 partículas (nivel freático)
- `tierra`: ~60,000 partículas (zona de infiltración y saturación)
- `hierba`: ~10,000 partículas (superficie)
- `arena`: ~500 partículas (zonas de recarga, opcional)

### Características del Acuífero
- **Nivel freático**: z=-7 (superficie del agua)
- **Profundidad del acuífero**: 3 celdas (z=-7 a z=-9)
- **Espesor de zona de infiltración**: 5 celdas (z=-1 a z=-5)
- **Capa impermeable**: z=-10
- **Volumen de agua**: ~30,000 celdas (aproximadamente 468.75 m³ con celda de 0.25m)

## Referencias

- Ver `_template.md` para estructura de plantilla
- Ver `zona-subterranea-cueva.md` para ejemplo de estructura subterránea similar
- Ver `bioma-bosque.md` para ejemplo de interacción con superficie
- Ver `database/init/02-seed-data.sql` para tipos de partículas disponibles
- Ver `backend/src/database/terrain_builder.py` para funciones helper de construcción

