# Zona Subterránea - Cueva

## Descripción

Una cueva es una cavidad natural formada en la roca bajo la superficie del terreno. Las cuevas pueden variar desde pequeñas aberturas hasta sistemas complejos de pasadizos y cámaras interconectadas. Son importantes para exploración, recursos minerales y como hábitats subterráneos.

**Características principales:**
- Espacios vacíos (aire) rodeados de roca sólida
- Entrada desde la superficie
- Pasadizos que conectan diferentes áreas
- Cámaras más grandes para almacenamiento o habitación
- Temperatura estable y constante
- Oscuridad natural (sin luz solar)

**Cuándo usar:**
- Crear áreas explorables bajo tierra
- Generar recursos minerales
- Establecer refugios o bases subterráneas
- Crear sistemas de túneles naturales
- Agregar complejidad geológica al mundo

## Estructura de Capas

### Nivel Z = 0 (Superficie - Entrada)
- **Tipo de partícula**: `hierba` o `tierra` (terreno normal)
- **Distribución**: Completa excepto en la entrada de la cueva
- **Propiedades**:
  - Densidad: 0.3 (hierba) o 1.5 (tierra)
  - Temperatura: 20°C
  - Energía: 0.0
  - Estado de materia: `solido`
- **Notas**: La superficie normal, con una abertura que permite acceso a la cueva.

### Nivel Z = -1 a Z = -2 (Entrada de la Cueva)
- **Tipo de partícula**: `aire` (interior) y `piedra` (paredes)
- **Distribución**: Abertura vertical que conecta superficie con cueva
- **Propiedades**:
  - Aire: densidad 0.001, temperatura 18°C, estado `gas`
  - Piedra: densidad 2.5, temperatura 15°C, estado `solido`
- **Notas**: La entrada es un túnel vertical que permite descender a la cueva. Las paredes son de piedra.

### Nivel Z = -3 a Z = -5 (Pasadizos)
- **Tipo de partícula**: `aire` (interior) y `piedra` (paredes y techo)
- **Distribución**: Túneles horizontales que conectan diferentes áreas
- **Propiedades**:
  - Aire: densidad 0.001, temperatura 15°C, estado `gas`
  - Piedra: densidad 2.5, temperatura 14°C, estado `solido`
- **Notas**: Los pasadizos son túneles de 1-2 celdas de ancho que permiten movimiento horizontal. El techo y las paredes son de piedra.

### Nivel Z = -6 (Cámaras)
- **Tipo de partícula**: `aire` (interior) y `piedra` (paredes)
- **Distribución**: Espacios abiertos más grandes
- **Propiedades**:
  - Aire: densidad 0.001, temperatura 14°C, estado `gas`
  - Piedra: densidad 2.5, temperatura 13°C, estado `solido`
- **Notas**: Las cámaras son espacios abiertos de 3x3 a 5x5 celdas donde puede haber recursos o estructuras.

### Nivel Z = -7 a Z = -9 (Roca Sólida)
- **Tipo de partícula**: `piedra`
- **Distribución**: Completa, roca sólida alrededor de la cueva
- **Propiedades**:
  - Densidad: 2.5
  - Temperatura: 12-13°C
  - Energía: 0.0
  - Estado de materia: `solido`
- **Notas**: Capas de roca sólida que rodean y contienen la cueva. La temperatura disminuye con la profundidad.

### Nivel Z = -10 (Base Roca)
- **Tipo de partícula**: `piedra`
- **Distribución**: Completa, capa base sólida
- **Propiedades**:
  - Densidad: 2.5
  - Temperatura: 10°C
  - Energía: 0.0
  - Estado de materia: `solido`
- **Notas**: Capa base que separa la cueva del límite inferior (partículas límite en z = profundidad_maxima).

## Distribución Espacial

### Área Completa: X: [0, max_x-1], Y: [0, max_y-1]
- **Partículas**: `piedra` en todas las capas excepto donde hay espacios de cueva
- **Patrón**: Roca sólida por defecto, con espacios vacíos (aire) para la cueva
- **Densidad**: 100% de roca, excepto espacios de cueva
- **Ejemplo**: Base sólida de roca con cavidades estratégicamente colocadas

### Entrada de la Cueva: X: [entrada_x], Y: [entrada_y]
- **Partículas**: `aire` en z=-1 a z=-2, `piedra` en las paredes
- **Patrón**: Túnel vertical de 1-2 celdas de ancho
- **Densidad**: 100% aire en el túnel, roca en las paredes
- **Ejemplo**: Abertura vertical que conecta la superficie con la cueva

### Pasadizos: Patrón de Túneles
- **Partículas**: `aire` en el interior, `piedra` en paredes y techo
- **Patrón**: Túneles horizontales de 1-2 celdas de ancho, conectando áreas
- **Densidad**: Variable según diseño (pueden ser lineales o ramificados)
- **Ejemplo**: Red de túneles que conecta la entrada con las cámaras

### Cámaras: Espacios Abiertos
- **Partículas**: `aire` en el interior, `piedra` en las paredes
- **Patrón**: Espacios abiertos de 3x3 a 5x5 celdas
- **Densidad**: 100% aire en el interior, roca en las paredes
- **Ejemplo**: Salas grandes donde pueden encontrarse recursos o estructuras

### Recursos (Opcional): Minerales en Paredes
- **Partículas**: `piedra` con ocasional `roca_magmatica` o recursos especiales
- **Patrón**: Distribución aleatoria en paredes de cueva
- **Densidad**: 5-10% de celdas de pared pueden tener minerales
- **Ejemplo**: Vetas de minerales visibles en las paredes de la cueva

## Propiedades de Partículas

| Tipo | Densidad | Temperatura | Energía | Estado | Notas |
|------|----------|-------------|---------|--------|-------|
| aire | 0.001 | 14-18°C | 0.0 | gas | Interior de la cueva |
| piedra | 2.5 | 10-15°C | 0.0 | solido | Paredes, techo y base |
| roca_magmatica | 3.0 | 20-25°C | 0.0 | solido | Minerales/recursos (opcional) |

## Reglas de Generación

### Paso 1: Crear base sólida de roca
1. Para cada celda (x, y) en el rango [0, max_x-1] x [0, max_y-1]:
   - Crear partículas `piedra` desde z=-7 hasta z=-10 (o hasta profundidad_maxima+1)
   - Estas son las capas de roca sólida que contendrán la cueva

**Ejemplo:**
```python
# Pseudocódigo
for x in range(0, max_x):
    for y in range(0, max_y):
        for z in range(-10, -6):  # Capas de roca sólida
            crear_particula(x, y, z, 'piedra', estado='solido', densidad=2.5, temperatura=12)
```

### Paso 2: Definir posición de entrada
1. Seleccionar posición de entrada (x_entrada, y_entrada):
   - Puede ser aleatoria o en una posición específica
   - Debe estar dentro de los límites de la dimensión
2. Crear túnel vertical de entrada:
   - Crear partículas `aire` en (x_entrada, y_entrada, z=-1) y (x_entrada, y_entrada, z=-2)
   - Mantener `piedra` en las celdas adyacentes (paredes del túnel)

**Ejemplo:**
```python
# Pseudocódigo
x_entrada = random.randint(5, max_x - 5)
y_entrada = random.randint(5, max_y - 5)

# Crear túnel vertical de entrada
for z in [-1, -2]:
    crear_particula(x_entrada, y_entrada, z, 'aire', estado='gas', densidad=0.001, temperatura=18)
    
    # Mantener paredes de piedra (opcional, si se quiere un túnel más ancho)
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nx = x_entrada + dx
        ny = y_entrada + dy
        if 0 <= nx < max_x and 0 <= ny < max_y:
            # Asegurar que las paredes sean piedra
            if not existe_particula(nx, ny, z):
                crear_particula(nx, ny, z, 'piedra', estado='solido', densidad=2.5, temperatura=15)
```

### Paso 3: Crear pasadizos horizontales
1. Desde la entrada, generar pasadizos horizontales:
   - Crear túnel horizontal desde (x_entrada, y_entrada, z=-3) hacia diferentes direcciones
   - Los pasadizos tienen 1-2 celdas de ancho
   - Pueden ramificarse o seguir un patrón específico
2. Para cada celda del pasadizo:
   - Crear partícula `aire` en el interior
   - Mantener `piedra` en las paredes y techo

**Ejemplo:**
```python
# Pseudocódigo - Pasadizo simple horizontal
def crear_pasadizo(x_inicio, y_inicio, z, direccion, longitud):
    x, y = x_inicio, y_inicio
    
    for i in range(longitud):
        # Crear aire en el pasadizo
        crear_particula(x, y, z, 'aire', estado='gas', densidad=0.001, temperatura=15)
        
        # Crear paredes de piedra (1 celda de ancho = pasadizo estrecho)
        # O crear pasadizo de 2 celdas de ancho
        if direccion == 'este':
            x += 1
        elif direccion == 'oeste':
            x -= 1
        elif direccion == 'norte':
            y += 1
        elif direccion == 'sur':
            y -= 1
        
        # Verificar límites
        if not (0 <= x < max_x and 0 <= y < max_y):
            break

# Crear pasadizos desde la entrada
crear_pasadizo(x_entrada, y_entrada, -3, 'este', 10)
crear_pasadizo(x_entrada, y_entrada, -4, 'norte', 8)
crear_pasadizo(x_entrada, y_entrada, -5, 'oeste', 12)
```

### Paso 4: Crear cámaras
1. En los extremos de los pasadizos, crear cámaras:
   - Espacios abiertos de 3x3 a 5x5 celdas
   - Ubicadas en z=-6 (nivel de cámaras)
2. Para cada cámara:
   - Crear partículas `aire` en el interior
   - Mantener `piedra` en las paredes
   - Opcionalmente, agregar recursos en las paredes

**Ejemplo:**
```python
# Pseudocódigo - Crear cámara
def crear_camara(x_centro, y_centro, z, tamano=3):
    for dx in range(-tamano//2, tamano//2 + 1):
        for dy in range(-tamano//2, tamano//2 + 1):
            x = x_centro + dx
            y = y_centro + dy
            
            if 0 <= x < max_x and 0 <= y < max_y:
                # Interior de la cámara: aire
                if abs(dx) < tamano//2 and abs(dy) < tamano//2:
                    crear_particula(x, y, z, 'aire', estado='gas', densidad=0.001, temperatura=14)
                # Paredes de la cámara: piedra
                else:
                    crear_particula(x, y, z, 'piedra', estado='solido', densidad=2.5, temperatura=13)

# Crear cámaras en los extremos de los pasadizos
crear_camara(x_entrada + 10, y_entrada, -6, tamano=4)
crear_camara(x_entrada, y_entrada + 8, -6, tamano=5)
crear_camara(x_entrada - 12, y_entrada, -6, tamano=3)
```

### Paso 5: Agregar recursos/minerales (opcional)
1. En las paredes de la cueva, agregar ocasionalmente recursos:
   - Reemplazar algunas partículas `piedra` con `roca_magmatica` o otros minerales
   - Distribución aleatoria: 5-10% de las paredes
   - Ubicadas en z=-3 a z=-6 (niveles de cueva)

**Ejemplo:**
```python
# Pseudocódigo - Agregar minerales
def agregar_minerales():
    for z in range(-6, -2):  # Niveles de cueva
        for x in range(0, max_x):
            for y in range(0, max_y):
                # Solo en paredes (donde hay piedra adyacente a aire)
                if es_pared_cueva(x, y, z):
                    if random.random() < 0.08:  # 8% de probabilidad
                        # Reemplazar piedra con mineral
                        eliminar_particula(x, y, z, 'piedra')
                        crear_particula(x, y, z, 'roca_magmatica', estado='solido', densidad=3.0, temperatura=20)
```

### Paso 6: Crear superficie normal
1. En z=0, crear terreno normal:
   - Crear partículas `hierba` o `tierra` en toda el área
   - Excepto en la entrada de la cueva, donde debe haber acceso

**Ejemplo:**
```python
# Pseudocódigo - Crear superficie
for x in range(0, max_x):
    for y in range(0, max_y):
        # No crear partícula en la entrada de la cueva
        if not (x == x_entrada and y == y_entrada):
            crear_particula(x, y, 0, 'hierba', estado='solido', densidad=0.3, temperatura=20)
```

## Variaciones

### Variación 1: Cueva Pequeña
- **Descripción**: Cueva simple con una entrada, un pasadizo corto y una cámara pequeña
- **Modificaciones**: 
  - Pasadizo de 5-10 celdas de longitud
  - Cámara de 3x3 celdas
  - Sin ramificaciones
  - Sin recursos adicionales
- **Cuándo usar**: Cuevas simples para exploración básica, refugios pequeños

### Variación 2: Sistema de Cavernas Complejo
- **Descripción**: Red compleja de pasadizos interconectados con múltiples cámaras
- **Modificaciones**: 
  - Múltiples pasadizos que se ramifican
  - 3-5 cámaras de diferentes tamaños
  - Múltiples niveles (z=-3 a z=-6)
  - Recursos distribuidos en las paredes
  - Posibles conexiones entre niveles
- **Cuándo usar**: Sistemas de cuevas grandes, minas naturales, áreas explorables extensas

### Variación 3: Cueva con Agua
- **Descripción**: Cueva que contiene agua estancada o un pequeño lago subterráneo
- **Modificaciones**: 
  - Agregar partículas `agua` en el fondo de algunas cámaras (z=-6)
  - Pasadizos parcialmente inundados
  - Temperatura más fría (10-12°C)
- **Cuándo usar**: Cuevas costeras, sistemas acuíferos, áreas con alta humedad

### Variación 4: Cueva Volcánica
- **Descripción**: Cueva formada por actividad volcánica, con lava y roca magmática
- **Modificaciones**: 
  - Paredes de `roca_magmatica` en lugar de `piedra`
  - Temperatura más alta (25-30°C)
  - Posible presencia de `lava` en algunas áreas
  - Formaciones irregulares
- **Cuándo usar**: Áreas volcánicas, cuevas cerca de actividad geotérmica

## Interacciones

### Con terreno superior
- **Con bosques**: La entrada de la cueva puede estar oculta bajo árboles o en claros
- **Con montañas**: Las cuevas pueden formarse en las laderas de montañas
- **Con ríos**: Las cuevas pueden tener entradas cerca de ríos o contener agua

### Con partículas límite
- Las partículas límite se crean automáticamente en `z = profundidad_maxima`
- La cueva debe respetar estos límites y no crear espacios por debajo de `profundidad_maxima`
- La capa base de roca en z=-10 debe estar al menos 1 celda por encima de `profundidad_maxima`

### Con otros sistemas subterráneos
- Las cuevas pueden conectarse con acuíferos (agua en niveles más profundos)
- Pueden intersectar con otras cuevas o túneles
- Pueden tener múltiples entradas desde la superficie

## Optimizaciones

- **Generación por secciones**: Crear la cueva sección por sección (entrada, pasadizos, cámaras) para mejor control
- **Validación de conectividad**: Asegurar que todos los espacios de la cueva sean accesibles desde la entrada
- **Detección de colisiones**: Verificar que los pasadizos no se superpongan incorrectamente
- **Generación procedural**: Usar algoritmos como random walk o cellular automata para generar pasadizos orgánicos

## Notas Adicionales

- **Agrupaciones**: Las diferentes partes de la cueva (entrada, pasadizos, cámaras) pueden ser agrupadas para representarlas como una entidad completa
- **Iluminación**: Las cuevas son naturalmente oscuras. Considerar agregar fuentes de luz si se implementa un sistema de iluminación
- **Ventilación**: Las cuevas pueden tener flujo de aire. Considerar agregar partículas `aire` que se muevan o tengan propiedades especiales
- **Tamaño mínimo**: Para una cueva funcional, se recomienda una dimensión de al menos 30x30 celdas (7.5m x 7.5m con celda de 0.25m)
- **Accesibilidad**: Asegurar que la entrada sea accesible desde la superficie y que los pasadizos sean transitables (al menos 1 celda de ancho)

## Ejemplo Completo

### Configuración de Dimensión
- **Ancho**: 30 metros (120 celdas con celda de 0.25m)
- **Alto**: 30 metros (120 celdas)
- **Profundidad máxima**: -15 (z mínimo)
- **Altura máxima**: 5 (z máximo)
- **Tamaño de celda**: 0.25 metros

### Resultado Esperado
- **Total de partículas de roca**: ~180,000 (120 x 120 x 12.5 capas promedio)
- **Espacios de cueva (aire)**: ~500-800 partículas (dependiendo de complejidad)
- **Entrada**: 1 túnel vertical de 2 celdas
- **Pasadizos**: 3-5 pasadizos de 10-15 celdas cada uno
- **Cámaras**: 2-3 cámaras de 3x3 a 5x5 celdas
- **Recursos (opcional)**: 20-40 partículas de minerales
- **Tipos únicos**: aire, piedra, hierba, roca_magmatica (opcional)
- **Tiempo estimado de generación**: 3-8 minutos (dependiendo de complejidad)

### Distribución por Tipo
- `piedra`: ~179,500 partículas (roca sólida)
- `aire`: ~600 partículas (espacios de cueva)
- `hierba`: ~14,400 partículas (superficie, menos entrada)
- `roca_magmatica`: ~30 partículas (recursos, opcional)

## Referencias

- Ver `_template.md` para estructura de plantilla
- Ver `bioma-bosque.md` para ejemplo de estructura similar
- Ver `database/init/02-seed-data.sql` para tipos de partículas disponibles
- Ver `backend/src/database/terrain_builder.py` para funciones helper de construcción

