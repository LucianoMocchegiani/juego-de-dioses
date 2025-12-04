# Ejemplos de Construcción de Terrenos

Esta carpeta contiene ejemplos detallados de cómo construir diferentes tipos de terrenos, biomas, zonas subterráneas y características geológicas para el Juego de Dioses.

## Propósito

Estos ejemplos sirven como guía para los dioses (IA) que crean el mundo, proporcionando patrones y reglas detalladas para generar terrenos realistas y coherentes. Cada ejemplo incluye:

- **Estructura de capas**: Qué partículas colocar en cada nivel Z
- **Distribución espacial**: Cómo distribuir las partículas en el plano X-Y
- **Propiedades de partículas**: Valores específicos de densidad, temperatura, energía, etc.
- **Reglas de generación**: Pasos detallados y replicables para crear el terreno

## Estructura de un Ejemplo

Cada ejemplo debe incluir:

1. **Descripción**: Qué tipo de terreno es y sus características principales
2. **Estructura de Capas**: Qué partículas en qué niveles z (vertical)
3. **Distribución Espacial**: Cómo se distribuyen las partículas en x, y (horizontal)
4. **Propiedades de Partículas**: Densidad, temperatura, energía, estado de materia, etc.
5. **Reglas de Generación**: Pasos detallados para crear el terreno
6. **Variaciones**: Diferentes versiones del mismo tipo de terreno
7. **Notas Adicionales**: Consideraciones especiales, optimizaciones, interacciones

## Cómo Usar los Ejemplos

1. **Leer el ejemplo completo** antes de comenzar a crear el terreno
2. **Preparar la dimensión** con los límites apropiados (ancho, alto, profundidad, altura)
3. **Verificar que existen** los tipos de partículas necesarios en la base de datos
4. **Seguir los pasos de generación** en orden
5. **Ajustar según necesidades** específicas (tamaño, densidad, variaciones)

## Lista de Ejemplos

### Biomas
- `bioma-bosque.md` - Construcción de bosque con árboles, hierba y subsuelo
- `bioma-desierto.md` - Construcción de desierto con arena y rocas
- `bioma-tundra.md` - Construcción de tundra con nieve y hielo
- `bioma-pradera.md` - Construcción de pradera con hierba y flores

### Zonas Subterráneas
- `zona-subterranea-cueva.md` - Construcción de cueva con pasadizos y cámaras
- `zona-subterranea-mina.md` - Construcción de mina con túneles y vetas minerales
- `zona-subterranea-bunker.md` - Construcción de estructura subterránea artificial

### Características Geológicas
- `acuifero-napa-subterranea.md` - Construcción de acuífero/napa subterránea
- `estructura-geologica-capas.md` - Estructura geológica con múltiples capas
- `formacion-rocosa.md` - Formaciones rocosas y montañas
- `volcan.md` - Estructura volcánica con lava y ceniza

### Características Acuáticas
- `lago.md` - Construcción de lago con agua y orillas
- `rio.md` - Construcción de río con flujo y lecho
- `oceano.md` - Construcción de océano con profundidades

## Plantilla

Para crear nuevos ejemplos, usa la plantilla `_template.md` como base. La plantilla incluye todas las secciones necesarias con ejemplos de formato.

## Convenciones

- **Coordenadas Z**: 
  - `z = 0` es la superficie (nivel del mar)
  - `z > 0` es sobre la superficie (aire, nubes, estructuras)
  - `z < 0` es bajo la superficie (subsuelo, cuevas, acuíferos)
- **Coordenadas X, Y**: 
  - Empiezan en `0` y van hasta `max_x - 1` y `max_y - 1`
  - Se calculan como: `max_x = ancho_metros / tamano_celda`
- **Partículas límite**: 
  - Siempre se crean automáticamente en `z = profundidad_maxima`
  - Son indestructibles y transparentes
  - No deben ser incluidas en los ejemplos (se crean automáticamente)

## Contribuir

Al crear nuevos ejemplos:

1. Usa la plantilla `_template.md`
2. Incluye valores reales y específicos
3. Proporciona suficientes detalles para replicación
4. Considera diferentes tamaños y variaciones
5. Documenta interacciones con otros tipos de terreno

