# Bioma Bosque

## Descripción

Un bioma bosque es un ecosistema terrestre caracterizado por una alta densidad de árboles, vegetación de suelo (hierba) y un subsuelo rico en materia orgánica. Los bosques son fundamentales para la vida en el mundo y proporcionan recursos como madera, hojas y un hábitat para diversas formas de vida.

**Características principales:**
- Alta densidad de árboles (madera y hojas)
- Cobertura completa de hierba en la superficie
- Subsuelo con capas de tierra orgánica
- Base rocosa sólida
- Temperatura moderada y humedad alta

**Cuándo usar:**
- Crear áreas naturales con vegetación
- Generar recursos de madera y materia orgánica
- Establecer ecosistemas complejos
- Crear biomas templados o tropicales

## Estructura de Capas

### Nivel Z = 0 (Superficie)
- **Tipo de partícula**: `hierba`
- **Distribución**: Completa, cubriendo toda el área horizontal (x, y)
- **Propiedades**:
  - Densidad: 0.3
  - Temperatura: 20°C
  - Energía: 0.0
  - Estado de materia: `solido`
- **Notas**: Esta es la capa visible de la superficie. Cubre todo el terreno excepto donde hay árboles.

### Nivel Z = -1 a Z = -3 (Subsuelo)
- **Tipo de partícula**: `tierra`
- **Distribución**: Completa, capas sólidas de tierra orgánica
- **Propiedades**:
  - Densidad: 1.5
  - Temperatura: 18°C (ligeramente más fría que la superficie)
  - Energía: 0.0
  - Estado de materia: `solido`
- **Notas**: Estas capas proporcionan soporte estructural y nutrientes. La temperatura disminuye ligeramente con la profundidad.

### Nivel Z = -4 (Roca Base)
- **Tipo de partícula**: `piedra`
- **Distribución**: Completa, capa sólida de roca
- **Propiedades**:
  - Densidad: 2.5
  - Temperatura: 15°C
  - Energía: 0.0
  - Estado de materia: `solido`
- **Notas**: Esta es la capa base sólida que separa el terreno del límite inferior (partículas límite en z = profundidad_maxima).

### Nivel Z = 0 a Z = 3 (Árboles - Troncos)
- **Tipo de partícula**: `madera`
- **Distribución**: Aleatoria, espaciados según densidad del bosque
- **Propiedades**:
  - Densidad: 0.6
  - Temperatura: 20°C
  - Energía: 0.0
  - Estado de materia: `solido`
- **Notas**: 
  - Los troncos se extienden desde z=0 (base) hasta z=2 o z=3 (altura del árbol)
  - **IMPORTANTE**: Los árboles NO pueden ser del grosor de una sola partícula
  - **Mínimo**: 4 partículas (2×2) = 0.5m × 0.5m para árboles pequeños
  - **Grandes**: 9-16 partículas (3×3 o 4×4) = 0.75m-1m para árboles grandes
  - Ver `instructions/RELACION-PARTICULAS-METROS.md` para más detalles

### Nivel Z = 2 a Z = 4 (Árboles - Hojas)
- **Tipo de partícula**: `hojas`
- **Distribución**: Alrededor de los troncos, formando copas de árboles
- **Propiedades**:
  - Densidad: 0.2
  - Temperatura: 22°C (ligeramente más cálida por exposición al sol)
  - Energía: 0.0
  - Estado de materia: `solido`
- **Notas**: Las hojas forman una copa alrededor del tronco, típicamente en un patrón de 3x3 celdas centrado en el tronco.

## Distribución Espacial

### Área Completa: X: [0, max_x-1], Y: [0, max_y-1]
- **Partículas**: `hierba` en z=0, `tierra` en z=-1 a z=-3, `piedra` en z=-4
- **Patrón**: Regular, cubriendo toda el área
- **Densidad**: 100% (cada celda tiene estas partículas)
- **Ejemplo**: Base sólida y uniforme que cubre toda la dimensión

### Árboles: Distribución Aleatoria
- **Partículas**: `madera` (troncos) y `hojas` (copas)
- **Patrón**: Aleatorio con espaciado mínimo
- **Densidad**: Variable según tipo de bosque:
  - **Bosque denso**: 15-20% de celdas tienen árboles (espaciado mínimo: 2-3 celdas)
  - **Bosque claro**: 5-10% de celdas tienen árboles (espaciado mínimo: 4-5 celdas)
- **Ejemplo**: Árboles distribuidos de forma natural, evitando aglomeraciones excesivas

### Copas de Árboles: Patrón 3x3
- **Partículas**: `hojas` alrededor de cada tronco
- **Patrón**: Cuadrado de 3x3 celdas centrado en el tronco
- **Densidad**: 8 hojas por árbol (3x3 menos el centro que es el tronco)
- **Ejemplo**: Cada árbol tiene una copa visible que se extiende 1 celda en cada dirección desde el tronco

## Propiedades de Partículas

| Tipo | Densidad | Temperatura | Energía | Estado | Notas |
|------|----------|-------------|---------|--------|-------|
| hierba | 0.3 | 20°C | 0.0 | solido | Superficie visible |
| tierra | 1.5 | 18°C | 0.0 | solido | Subsuelo orgánico |
| piedra | 2.5 | 15°C | 0.0 | solido | Base rocosa |
| madera | 0.6 | 20°C | 0.0 | solido | Troncos de árboles |
| hojas | 0.2 | 22°C | 0.0 | solido | Copas de árboles |

## Reglas de Generación

### Paso 1: Crear capa base de terreno
1. Para cada celda (x, y) en el rango [0, max_x-1] x [0, max_y-1]:
   - Crear partícula `piedra` en (x, y, z=-4)
   - Crear partícula `tierra` en (x, y, z=-3)
   - Crear partícula `tierra` en (x, y, z=-2)
   - Crear partícula `tierra` en (x, y, z=-1)
   - Crear partícula `hierba` en (x, y, z=0)

**Ejemplo:**
```python
# Pseudocódigo
for x in range(0, max_x):
    for y in range(0, max_y):
        crear_particula(x, y, -4, 'piedra', estado='solido', densidad=2.5, temperatura=15)
        crear_particula(x, y, -3, 'tierra', estado='solido', densidad=1.5, temperatura=18)
        crear_particula(x, y, -2, 'tierra', estado='solido', densidad=1.5, temperatura=18)
        crear_particula(x, y, -1, 'tierra', estado='solido', densidad=1.5, temperatura=18)
        crear_particula(x, y, 0, 'hierba', estado='solido', densidad=0.3, temperatura=20)
```

### Paso 2: Generar posiciones de árboles
1. Determinar densidad de árboles según tipo de bosque:
   - Bosque denso: 15-20% de celdas
   - Bosque claro: 5-10% de celdas
2. Generar lista de posiciones aleatorias (x, y) con espaciado mínimo:
   - Bosque denso: mínimo 2-3 celdas entre árboles
   - Bosque claro: mínimo 4-5 celdas entre árboles
3. Verificar que no haya superposición con otros árboles

**Ejemplo:**
```python
# Pseudocódigo
densidad_arboles = 0.15  # 15% para bosque denso
num_arboles = int(max_x * max_y * densidad_arboles)
posiciones_arboles = []
espaciado_minimo = 3

while len(posiciones_arboles) < num_arboles:
    x = random.randint(0, max_x - 1)
    y = random.randint(0, max_y - 1)
    
    # Verificar espaciado
    valido = True
    for (ax, ay) in posiciones_arboles:
        distancia = sqrt((x - ax)**2 + (y - ay)**2)
        if distancia < espaciado_minimo:
            valido = False
            break
    
    if valido:
        posiciones_arboles.append((x, y))
```

### Paso 3: Crear troncos de árboles
1. Para cada posición de árbol (x, y):
   - Determinar altura del tronco (2-3 celdas, aleatorio)
   - Crear partículas `madera` desde z=0 hasta z=altura-1
   - Cada tronco ocupa 1 celda en x,y

**Ejemplo:**
```python
# Pseudocódigo
for (x, y) in posiciones_arboles:
    altura_tronco = random.randint(2, 3)  # Altura 2 o 3 celdas
    
    for z in range(0, altura_tronco):
        crear_particula(x, y, z, 'madera', estado='solido', densidad=0.6, temperatura=20)
```

### Paso 4: Crear copas de árboles (hojas)
1. Para cada árbol en posición (x, y) con altura `h`:
   - Crear partículas `hojas` en un patrón 3x3 alrededor del tronco
   - Centrar el patrón en z = h (nivel superior del tronco)
   - Extender hacia arriba 1-2 niveles adicionales
   - Omitir la celda central (x, y) que contiene el tronco

**Ejemplo:**
```python
# Pseudocódigo
for (x, y) in posiciones_arboles:
    altura_tronco = obtener_altura_tronco(x, y)
    z_copa_base = altura_tronco
    z_copa_top = altura_tronco + 1  # Copas de 2 niveles
    
    for z in range(z_copa_base, z_copa_top + 1):
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx == 0 and dy == 0:
                    continue  # Saltar celda del tronco
                
                nx = x + dx
                ny = y + dy
                
                # Verificar límites
                if 0 <= nx < max_x and 0 <= ny < max_y:
                    crear_particula(nx, ny, z, 'hojas', estado='solido', densidad=0.2, temperatura=22)
```

### Paso 5: Reemplazar hierba bajo árboles (opcional)
1. Para cada posición de árbol (x, y):
   - Opcionalmente, mantener la hierba bajo el tronco (más realista)
   - O reemplazar con tierra si se desea un efecto de "sombra" del árbol

**Nota**: En la mayoría de los casos, es mejor mantener la hierba bajo los árboles para mantener la cobertura completa.

## Variaciones

### Variación 1: Bosque Denso
- **Descripción**: Bosque con alta densidad de árboles, copas que se superponen
- **Modificaciones**: 
  - Densidad de árboles: 15-20% de celdas
  - Espaciado mínimo: 2-3 celdas
  - Copas más grandes: 4x4 o 5x5 celdas
  - Altura de troncos: 3-4 celdas
- **Cuándo usar**: Crear bosques antiguos, selvas, áreas con mucha vegetación

### Variación 2: Bosque Claro
- **Descripción**: Bosque con árboles espaciados, más luz en el suelo
- **Modificaciones**: 
  - Densidad de árboles: 5-10% de celdas
  - Espaciado mínimo: 4-5 celdas
  - Copas más pequeñas: 3x3 celdas (estándar)
  - Altura de troncos: 2-3 celdas
- **Cuándo usar**: Crear bosques jóvenes, sabanas arboladas, áreas de transición

### Variación 3: Bosque de Coníferas
- **Descripción**: Bosque con árboles altos y delgados, copas en forma de cono
- **Modificaciones**: 
  - Altura de troncos: 4-5 celdas
  - Copas más pequeñas: 2x2 o 3x3 celdas
  - Distribución: Más uniforme, menos aleatoria
- **Cuándo usar**: Crear bosques de pinos, áreas montañosas, climas fríos

### Variación 4: Bosque Tropical
- **Descripción**: Bosque con árboles muy altos y copas grandes
- **Modificaciones**: 
  - Altura de troncos: 4-6 celdas
  - Copas muy grandes: 5x5 o 6x6 celdas
  - Densidad alta: 20-25% de celdas
  - Temperatura más alta: 25-30°C
- **Cuándo usar**: Crear selvas, bosques tropicales, áreas con clima cálido

## Interacciones

### Con otros terrenos
- **Con praderas**: Los bosques pueden tener bordes donde la hierba se mezcla con áreas más abiertas
- **Con montañas**: Los bosques pueden crecer en las laderas, disminuyendo en densidad hacia la cima
- **Con ríos**: Los bosques pueden seguir el curso de ríos, creando corredores de vegetación

### Con partículas límite
- Las partículas límite se crean automáticamente en `z = profundidad_maxima`
- El bosque debe respetar estos límites y no crear partículas por debajo de `profundidad_maxima`
- La capa de `piedra` en z=-4 debe estar al menos 1 celda por encima de `profundidad_maxima`

## Optimizaciones

- **Generación en batch**: Crear todas las partículas de una capa en una sola operación batch para mejor rendimiento
- **Caché de posiciones**: Pre-calcular todas las posiciones de árboles antes de crear partículas
- **Validación de límites**: Verificar límites de dimensión antes de crear cada partícula
- **Densidad ajustable**: Permitir ajustar la densidad de árboles según el tamaño de la dimensión

## Notas Adicionales

- **Agrupaciones**: Los árboles pueden ser agrupados usando la tabla `agrupaciones` para representar cada árbol como una entidad completa
- **Núcleos**: Los troncos pueden marcarse como `es_nucleo=true` para indicar que son el núcleo de la agrupación del árbol
- **Propiedades**: Se pueden agregar propiedades JSON a las partículas para almacenar información adicional (edad del árbol, especie, etc.)
- **Tamaño mínimo**: Para un bosque funcional, se recomienda una dimensión de al menos 20x20 celdas (5m x 5m con celda de 0.25m)

## Ejemplo Completo

### Configuración de Dimensión
- **Ancho**: 20 metros (80 celdas con celda de 0.25m)
- **Alto**: 20 metros (80 celdas)
- **Profundidad máxima**: -10 (z mínimo)
- **Altura máxima**: 10 (z máximo)
- **Tamaño de celda**: 0.25 metros

### Resultado Esperado
- **Total de partículas base**: ~32,000 (80 x 80 x 5 capas)
- **Árboles (bosque denso)**: ~960 árboles (15% de 6,400 celdas)
- **Partículas de árboles**: ~9,600 (960 árboles x ~10 partículas por árbol)
- **Total aproximado**: ~41,600 partículas
- **Tipos únicos**: hierba, tierra, piedra, madera, hojas
- **Tiempo estimado de generación**: 2-5 minutos (dependiendo del rendimiento)

### Distribución por Tipo
- `hierba`: ~6,400 partículas (superficie)
- `tierra`: ~19,200 partículas (3 capas de subsuelo)
- `piedra`: ~6,400 partículas (base rocosa)
- `madera`: ~2,400 partículas (troncos, promedio 2.5 celdas por árbol)
- `hojas`: ~7,200 partículas (copas, promedio 7.5 celdas por árbol)

## Referencias

- Ver `_template.md` para estructura de plantilla
- Ver `database/init/02-seed-data.sql` para tipos de partículas disponibles
- Ver `backend/src/database/seed_demo.py` para ejemplo de implementación de árboles

