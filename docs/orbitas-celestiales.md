# Diagramas de Órbitas Celestiales

Este documento explica los diagramas que muestran cómo giran el sol y la luna en el juego según el **Modelo de Gleason**.

## Archivos de Diagramas

### Modelo de Gleason (Correcto)
1. **`diagrama-gleason-espiral.svg`** - Movimiento espiral del sol entre los trópicos
2. **`diagrama-gleason-ciclo-completo.svg`** - Ciclo completo del año (12 meses) con posiciones mensuales

### Diagramas Originales (Modelo Simplificado)
3. **`diagramas-orbita-celestial.svg`** - Vista superior del sistema simplificado (círculo fijo)
4. **`diagrama-orbita-lateral.svg`** - Vista lateral/perfil (altura y posición)
5. **`diagrama-ciclos-temporales.svg`** - Ciclos temporales y diferentes momentos del día

## Cómo Ver los Diagramas

Los archivos SVG se pueden abrir directamente en:
- Navegador web (Chrome, Firefox, Edge, etc.)
- Visual Studio Code (con extensión SVG)
- Cualquier visor de imágenes que soporte SVG
- Editores como Inkscape, Adobe Illustrator, etc.

## Resumen del Sistema

### Sol - Modelo de Gleason (Correcto)

**⚠️ IMPORTANTE**: El modelo correcto según Gleason es un **movimiento en espiral**, no un círculo simple.

- **Órbita**: Espiral horizontal alrededor del centro del mundo (Polo Norte)
- **Radio variable**: 
  - **Mínimo**: Trópico de Cáncer (radio interior, ~1000m)
  - **Máximo**: Trópico de Capricornio (radio exterior, ~2000m)
- **Altura**: 500 metros sobre el nivel del mar (constante)
- **Ciclo diario**: 24 horas de juego (rotación angular)
- **Ciclo anual**: 365 días de juego (variación del radio en espiral)
- **Movimiento**: 
  - Espiral hacia afuera: Cáncer → Capricornio (6 meses)
  - Espiral hacia adentro: Capricornio → Cáncer (6 meses)
- **Sentido**: Horario (rotación diaria) + espiral (variación anual)
- **Fórmula de posición** (Modelo de Gleason):
  - `radio(t) = r_min + (r_max - r_min) × función_espiral(tiempo_año)`
  - `ángulo(t) = 2π × (tiempo_día / 24_horas)`
  - `x = cos(ángulo) × radio(tiempo)`
  - `y = sin(ángulo) × radio(tiempo)`
  - `z = 500`

**Nota**: El código actual usa un modelo simplificado con radio fijo. El modelo de Gleason requiere implementar la variación del radio según el ciclo anual.

### Sol - Modelo Simplificado (Actual en el código)

- **Órbita**: Círculo horizontal alrededor del centro del mundo
- **Radio**: 1500 metros (1.5x el radio del mundo) - **FIJO**
- **Altura**: 500 metros sobre el nivel del mar (constante)
- **Ciclo completo**: 24 horas de juego
- **Velocidad**: Constante, sentido horario
- **Fórmula de posición** (Simplificada):
  - `x = cos(ángulo) × 1500`
  - `y = sin(ángulo) × 1500`
  - `z = 500`

### Luna
- **Órbita**: Círculo horizontal alrededor del centro del mundo
- **Radio**: 1500 metros (1.5x el radio del mundo)
- **Altura**: 500 metros sobre el nivel del mar (constante)
- **Ciclo completo**: 28 días de juego (mucho más lento que el sol)
- **Velocidad**: Constante, sentido horario (mucho más lento)
- **Desplazamiento inicial**: π radianes (180°) - empieza opuesta al sol
- **Fórmula de posición**:
  - `x = cos(ángulo_luna) × 1500`
  - `y = sin(ángulo_luna) × 1500`
  - `z = 500`

## Descripción de Cada Diagrama

### 1. diagrama-gleason-espiral.svg (Modelo de Gleason - Movimiento Espiral)

Muestra el movimiento espiral del sol según el modelo de Gleason, con los círculos de los trópicos.

**Elementos clave:**
- Centro del mundo (Polo Norte) marcado en rojo
- **Trópico de Cáncer** (círculo interior, naranja) - radio mínimo
- **Ecuador** (círculo medio, amarillo)
- **Trópico de Capricornio** (círculo exterior, rosa) - radio máximo
- Espiral del sol mostrando el movimiento de adentro hacia afuera y viceversa
- Posiciones del sol en diferentes momentos del ciclo
- Flechas indicando la dirección de la espiral

**Qué muestra:**
- El sol NO gira en un círculo fijo, sino en una **espiral**
- El radio varía entre el Trópico de Cáncer (interior) y Capricornio (exterior)
- El movimiento crea las estaciones del año
- La espiral va de adentro hacia afuera (6 meses) y luego de afuera hacia adentro (6 meses)

### 2. diagrama-gleason-ciclo-completo.svg (Ciclo Completo del Año)

Muestra el ciclo completo de 12 meses con las posiciones mensuales del sol en la espiral.

**Elementos clave:**
- Vista superior con los tres círculos de los trópicos
- Posiciones del sol marcadas para cada mes (o grupo de meses)
- Espiral completa conectando todas las posiciones
- Información detallada sobre el ciclo anual
- Comparación entre el modelo simple y el modelo de Gleason

**Qué muestra:**
- Mes 1: Sol en Trópico de Cáncer (inicio del ciclo)
- Mes 2-5: Sol se mueve hacia Capricornio (espiral hacia afuera)
- Mes 6: Sol alcanza Trópico de Capricornio (radio máximo)
- Mes 7-10: Sol regresa hacia Cáncer (espiral hacia adentro)
- Mes 11-12: Sol vuelve a Trópico de Cáncer (completa el ciclo)
- Cómo el movimiento en espiral crea las estaciones

### 3. diagramas-orbita-celestial.svg (Vista Superior - Modelo Simplificado)

Muestra el sistema desde arriba (plano XY), como si miraras el mapa del mundo desde el cielo.

**Elementos clave:**
- Centro del mundo marcado en rojo
- Mundo representado como un círculo de radio 1000m
- Órbita del sol en línea dorada punteada (radio 1500m)
- Órbita de la luna en línea gris punteada (radio 1500m)
- Posiciones iniciales del sol y la luna
- Flechas que indican el sentido de rotación (horario)
- Leyenda con todos los elementos
- Panel técnico con especificaciones

**Qué muestra:**
- Ambos cuerpos celestes orbitan en el mismo círculo horizontal
- El sol y la luna están en el mismo plano (misma altura)
- La luna empieza opuesta al sol (180° de diferencia)
- El sentido de rotación es horario para ambos

### 4. diagrama-orbita-lateral.svg (Vista Lateral)

Muestra el sistema desde un lado (perfil), mostrando la altura y cómo se ven las órbitas desde esta perspectiva.

**Elementos clave:**
- Línea del suelo (nivel del mar en z=0)
- Plano del mundo
- Centro del mundo marcado
- Órbita del sol (elipse, porque es un círculo visto de lado)
- Sol y luna en sus posiciones iniciales
- Líneas de referencia de altura
- Notas explicativas

**Qué muestra:**
- Ambos cuerpos celestes están a la misma altura (500m)
- Las órbitas son horizontales (no hay movimiento vertical)
- El movimiento es puramente circular horizontal

### 5. diagrama-ciclos-temporales.svg (Ciclos Temporales)

Muestra cómo se mueven el sol y la luna a lo largo del tiempo, en diferentes momentos del ciclo.

**Elementos clave:**
- Vista superior con posiciones en 4 momentos diferentes:
  - Momento 1 (t=0): Inicio
  - Momento 2 (6 horas): Sol a 90°
  - Momento 3 (12 horas): Sol a 180° (luna llena)
  - Momento 4 (24 horas): Sol completa 1 día
- Gráfico de velocidad angular comparando sol y luna
- Panel informativo con detalles técnicos

**Qué muestra:**
- El sol se mueve rápido: completa 1 rotación en 24 horas
- La luna se mueve muy lento: completa 1 rotación en 28 días
- En 28 días, el sol da 28 vueltas mientras la luna da solo 1 vuelta
- La diferencia de velocidad crea las diferentes fases lunares

## Conceptos Clave

### 1. Modelo de Gleason - Movimiento en Espiral

**El sol NO se mueve en un círculo fijo**. Según el modelo de Gleason:
- El sol se mueve en una **espiral** que varía su radio durante el año
- **Radio mínimo**: Trópico de Cáncer (círculo interior, naranja)
- **Radio máximo**: Trópico de Capricornio (círculo exterior, rosa)
- El sol completa una espiral completa cada año (365 días de juego)
- La espiral va de adentro hacia afuera (6 meses) y luego de afuera hacia adentro (6 meses)

### 2. Estaciones del Año

El movimiento en espiral crea las estaciones:
- **Sol cerca de Cáncer**: Verano en hemisferio norte (más calor)
- **Sol cerca de Capricornio**: Invierno en hemisferio norte (más frío)
- **Sol en Ecuador**: Primavera u Otoño (temperaturas moderadas)

### 3. Mismo Plano, Misma Altura
Ambos cuerpos celestes orbitan en el mismo plano horizontal, a la misma altura (500m). No hay movimiento vertical.

### 4. Sentido Horario
Ambos giran en sentido horario (de derecha a izquierda cuando se ve desde arriba) en su rotación diaria.

### 5. Velocidades Diferentes
- **Sol (rotación diaria)**: 1 día = 1 rotación completa (ángulo)
- **Sol (variación anual)**: 365 días = 1 ciclo completo de espiral (radio)
- **Luna**: 28 días = 1 rotación completa
- Esta diferencia crea el efecto de fases lunares y estaciones

### 6. Desplazamiento Inicial
La luna empieza opuesta al sol (180° de diferencia). Esto significa que cuando el sol está al Este, la luna está al Oeste (y viceversa).

### 7. Coordenadas
- **X, Y**: Plano horizontal (órbita espiral para el sol, circular para la luna)
- **Z**: Altura (constante = 500m)
- **Ángulo 0°**: Norte (o Este, dependiendo de la convención)
- **Ángulo aumenta**: Sentido horario
- **Radio**: Variable para el sol (espiral), constante para la luna

## Fases Lunares

Las fases lunares se calculan según la posición relativa del sol y la luna:
- **Luna nueva (0.0)**: Sol y luna en la misma posición (no visible)
- **Cuarto creciente (0.25)**: Luna a 90° del sol
- **Luna llena (0.5)**: Luna opuesta al sol (180°)
- **Cuarto menguante (0.75)**: Luna a 270° del sol

El modelo de Gleason calcula estas fases automáticamente según las posiciones relativas.

## Notas Técnicas

### Implementación Actual (Modelo Simplificado)
- Las posiciones se calculan en el backend usando `CelestialTimeService`
- El frontend solo renderiza las posiciones recibidas del backend
- Las fórmulas usan trigonometría básica: `cos(ángulo)` y `sin(ángulo)`
- El tiempo del juego avanza a 60x la velocidad real (1 minuto real = 1 hora de juego)
- **Limitación**: El código actual usa un radio fijo, no implementa el movimiento en espiral

### Implementación Sugerida (Modelo de Gleason)

Para implementar correctamente el modelo de Gleason, se necesita:

1. **Agregar variación del radio según el ciclo anual**:
   ```python
   # En celestial_time_service.py
   def get_sun_radius(self) -> float:
       """Calcular radio actual del sol según el ciclo anual"""
       # Ciclo anual en días de juego
       año_en_días = 365.0
       días_transcurridos = (self.tiempo_juego / (24 * 60 * 60)) % año_en_días
       
       # Radio mínimo (Trópico de Cáncer) y máximo (Capricornio)
       radio_min = CELESTIAL_CONFIG['SOL_RADIO_MIN']  # ~1000m
       radio_max = CELESTIAL_CONFIG['SOL_RADIO_MAX']  # ~2000m
       
       # Función espiral: usar seno para variación suave
       # 0.0 = Cáncer, 0.5 = Capricornio, 1.0 = Cáncer
       fase_anual = (días_transcurridos / año_en_días) * 2 * math.pi
       variación = (math.sin(fase_anual) + 1) / 2  # Normalizar a 0-1
       
       return radio_min + (radio_max - radio_min) * variación
   ```

2. **Actualizar get_sun_position() para usar radio variable**:
   ```python
   def get_sun_position(self) -> Dict[str, float]:
       angulo = self.get_sun_angle()  # Rotación diaria
       radio = self.get_sun_radius()   # Radio variable (espiral)
       altura = CELESTIAL_CONFIG['SOL_ALTURA']
       
       x = math.cos(angulo) * radio
       y = math.sin(angulo) * radio
       z = altura
       
       return {"x": x, "y": y, "z": z}
   ```

3. **Agregar configuración para los trópicos**:
   ```python
   # En celestial_config.py
   SOL_RADIO_MIN = 1000.0  # Trópico de Cáncer
   SOL_RADIO_MAX = 2000.0  # Trópico de Capricornio
   SOL_CICLO_ANUAL_DIAS = 365.0  # Días de juego en un año
   ```

### Referencias
- **Modelo de Gleason**: Proyección cartográfica que muestra la Tierra como un disco plano con el Polo Norte en el centro
- El movimiento del sol en espiral entre los trópicos explica las estaciones y la variación de temperatura
- Este modelo es más complejo que el círculo simple pero es más realista para efectos de temperatura y estaciones