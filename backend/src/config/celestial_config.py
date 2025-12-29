"""
Configuración del Sistema Celestial

Centraliza todos los valores relacionados con el sistema de sol/luna,
tiempo del juego, y cálculos celestiales.
"""

import math

# ===== Configuración de Tiempo del Juego =====

# Velocidad del tiempo del juego
# 1.0 = tiempo real (1 segundo real = 1 segundo de juego)
# 60.0 = tiempo acelerado (1 segundo real = 60 segundos de juego = 1 minuto de juego)
#        Esto significa: 1 minuto real = 1 hora de juego
VELOCIDAD_TIEMPO = 60.0  # 1 segundo real = 1 minuto de juego | 1 minuto real = 1 hora de juego

# Tiempo inicial del juego (en segundos de juego)
TIEMPO_INICIAL = 0.0

# ===== Configuración del Mundo =====

# Radio máximo del mundo (en metros)
# Usado para cálculos de temperatura (proyección Gleason) y posiciones del sol/luna
# Este valor debe ser consistente con el tamaño real del mundo (todos los bloques combinados)
RADIO_MUNDO = 1000.0  # metros (radio desde el centro hasta el borde más lejano)

# ===== Configuración de Rotación del Sol =====

# Duración de un ciclo completo del sol (en tiempo de juego)
# El sol completa una rotación alrededor del mundo en este tiempo
SOL_CICLO_TIEMPO_JUEGO_SEGUNDOS = 24 * 60 * 60  # 24 horas de juego = 86400 segundos de juego

# Duración del ciclo en segundos reales (calculada desde tiempo de juego y VELOCIDAD_TIEMPO)
# Con VELOCIDAD_TIEMPO = 60.0: 24 horas de juego = 24 minutos reales = 1440 segundos reales
SOL_CICLO_REAL_SEGUNDOS = SOL_CICLO_TIEMPO_JUEGO_SEGUNDOS / VELOCIDAD_TIEMPO

# Velocidad angular del sol (radianes por segundo de juego)
# Calculada automáticamente: 2π radianes en SOL_CICLO_TIEMPO_JUEGO_SEGUNDOS
# Se multiplica por tiempo_juego (que ya está en tiempo de juego), así que la velocidad debe ser en radianes/segundo_de_juego
SOL_VELOCIDAD_ANGULAR = (2 * math.pi) / SOL_CICLO_TIEMPO_JUEGO_SEGUNDOS

# Multiplicador para calcular la distancia de órbita del sol desde RADIO_MUNDO
# El sol orbita a esta distancia relativa al borde del mundo
SOL_RADIO_ORBITA_MULTIPLICADOR = 1.5  # Sol orbita a 1.5x el radio del mundo

# Distancia de órbita del sol (calculada desde RADIO_MUNDO)
SOL_RADIO_ORBITA = RADIO_MUNDO * SOL_RADIO_ORBITA_MULTIPLICADOR

# Altura del sol sobre el mundo (en metros)
SOL_ALTURA = 500.0  # metros sobre el nivel del mar

# ===== Configuración de Rotación de la Luna =====

# Duración de un ciclo completo de la luna (en tiempo de juego)
# La luna completa una rotación alrededor del mundo en este tiempo
LUNA_CICLO_TIEMPO_JUEGO_SEGUNDOS = 28 * 24 * 60 * 60  # 28 días de juego = 2419200 segundos de juego

# Duración del ciclo en segundos reales (calculada desde tiempo de juego y VELOCIDAD_TIEMPO)
# Con VELOCIDAD_TIEMPO = 60.0: 28 días de juego = 28 horas reales = 100800 segundos reales
LUNA_CICLO_REAL_SEGUNDOS = LUNA_CICLO_TIEMPO_JUEGO_SEGUNDOS / VELOCIDAD_TIEMPO

# Velocidad angular de la luna (radianes por segundo de juego)
# Calculada automáticamente: 2π radianes en LUNA_CICLO_TIEMPO_JUEGO_SEGUNDOS
# Se multiplica por tiempo_juego (que ya está en tiempo de juego), así que la velocidad debe ser en radianes/segundo_de_juego
LUNA_VELOCIDAD_ANGULAR = (2 * math.pi) / LUNA_CICLO_TIEMPO_JUEGO_SEGUNDOS

# Desplazamiento angular inicial de la luna (en radianes)
# La luna empieza opuesta al sol (π radianes = 180°)
LUNA_DESPLAZAMIENTO_INICIAL = math.pi

# Multiplicador para calcular la distancia de órbita de la luna desde RADIO_MUNDO
# La luna orbita a esta distancia relativa al borde del mundo
LUNA_RADIO_ORBITA_MULTIPLICADOR = 1.5  # Luna orbita a 1.5x el radio del mundo

# Distancia de órbita de la luna (calculada desde RADIO_MUNDO)
LUNA_RADIO_ORBITA = RADIO_MUNDO * LUNA_RADIO_ORBITA_MULTIPLICADOR

# Altura de la luna sobre el mundo (en metros)
LUNA_ALTURA = 500.0  # metros sobre el nivel del mar

# ===== Configuración de Horas del Día =====

# Horas del día consideradas como "día" (para cálculos simplificados)
HORA_AMANECER = 6.0  # 6:00 AM
HORA_ATARDECER = 18.0  # 6:00 PM

# Horas del día en un ciclo completo
HORAS_POR_DIA = 24.0

# ===== Configuración de Intensidad Solar =====

# Umbral angular para determinar si es de día (en radianes)
# Si el sol está dentro de este ángulo del punto, es de día
ANGULO_DIA_UMBRAL = math.pi / 2  # 90 grados

# ===== Configuración de Temperatura de Partículas =====

# Intervalo de actualización de temperatura de partículas (en segundos reales)
# El background task actualiza la temperatura de partículas con inercia_termica cada este intervalo
PARTICLE_TEMPERATURE_UPDATE_INTERVAL = 300  # 5 minutos = 300 segundos

# ===== Diccionario de Configuración Completa =====

CELESTIAL_CONFIG = {
    # Tiempo
    'VELOCIDAD_TIEMPO': VELOCIDAD_TIEMPO,
    'TIEMPO_INICIAL': TIEMPO_INICIAL,
    
    # Mundo
    'RADIO_MUNDO': RADIO_MUNDO,
    
    # Sol
    'SOL_CICLO_TIEMPO_JUEGO_SEGUNDOS': SOL_CICLO_TIEMPO_JUEGO_SEGUNDOS,
    'SOL_CICLO_REAL_SEGUNDOS': SOL_CICLO_REAL_SEGUNDOS,
    'SOL_VELOCIDAD_ANGULAR': SOL_VELOCIDAD_ANGULAR,
    'SOL_RADIO_ORBITA_MULTIPLICADOR': SOL_RADIO_ORBITA_MULTIPLICADOR,
    'SOL_RADIO_ORBITA': SOL_RADIO_ORBITA,
    'SOL_ALTURA': SOL_ALTURA,
    
    # Luna
    'LUNA_CICLO_TIEMPO_JUEGO_SEGUNDOS': LUNA_CICLO_TIEMPO_JUEGO_SEGUNDOS,
    'LUNA_CICLO_REAL_SEGUNDOS': LUNA_CICLO_REAL_SEGUNDOS,
    'LUNA_VELOCIDAD_ANGULAR': LUNA_VELOCIDAD_ANGULAR,
    'LUNA_DESPLAZAMIENTO_INICIAL': LUNA_DESPLAZAMIENTO_INICIAL,
    'LUNA_RADIO_ORBITA_MULTIPLICADOR': LUNA_RADIO_ORBITA_MULTIPLICADOR,
    'LUNA_RADIO_ORBITA': LUNA_RADIO_ORBITA,
    'LUNA_ALTURA': LUNA_ALTURA,
    
    # Horas del día
    'HORA_AMANECER': HORA_AMANECER,
    'HORA_ATARDECER': HORA_ATARDECER,
    'HORAS_POR_DIA': HORAS_POR_DIA,
    
    # Intensidad solar
    'ANGULO_DIA_UMBRAL': ANGULO_DIA_UMBRAL,
    
    # Temperatura de partículas
    'PARTICLE_TEMPERATURE_UPDATE_INTERVAL': PARTICLE_TEMPERATURE_UPDATE_INTERVAL,
}

