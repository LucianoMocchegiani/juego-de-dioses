"""
Servicio de Tiempo Celestial (Autoritativo)

El backend controla el tiempo del juego como single source of truth.
El frontend recibe este tiempo y calcula posiciones visuales localmente.

Este servicio está diseñado para ser extensible y soportar:
- Cálculos de temperatura (actual)
- Modificadores de hechizos según fase lunar (futuro)
- Estadísticas de personajes según ciclo solar/lunar (futuro)
- Eventos especiales (eclipses, alineaciones) (futuro)
"""

import math
from typing import Dict
from src.config import CELESTIAL_CONFIG


class CelestialTimeService:
    """
    Servicio de Tiempo Celestial - Autoritativo
    
    El backend controla el tiempo del juego y proporciona cálculos celestiales.
    El frontend recibe este tiempo y calcula posiciones visuales localmente.
    
    Este servicio está diseñado para ser extensible y soportar:
    - Cálculos de temperatura (actual)
    - Modificadores de hechizos según fase lunar (futuro)
    - Estadísticas de personajes según ciclo solar/lunar (futuro)
    - Eventos especiales (eclipses, alineaciones) (futuro)
    """
    
    def __init__(
        self,
        tiempo_inicial: float = None,
        velocidad_tiempo: float = None
    ):
        """
        Args:
            tiempo_inicial: Tiempo inicial del juego en segundos (default: desde config)
            velocidad_tiempo: Multiplicador de velocidad (default: desde config)
        """
        # Usar valores de configuración si no se proporcionan
        if tiempo_inicial is None:
            tiempo_inicial = CELESTIAL_CONFIG['TIEMPO_INICIAL']
        if velocidad_tiempo is None:
            velocidad_tiempo = CELESTIAL_CONFIG['VELOCIDAD_TIEMPO']
        
        self.tiempo_juego = tiempo_inicial  # Tiempo del juego en segundos (autoritativo)
        self.velocidad_tiempo = velocidad_tiempo
        self.tiempo_inicio = tiempo_inicial
    
    def update(self, delta_time: float) -> None:
        """
        Actualizar tiempo del juego
        
        Args:
            delta_time: Tiempo transcurrido en segundos (tiempo real)
        """
        self.tiempo_juego += delta_time * self.velocidad_tiempo
    
    def get_time(self) -> float:
        """
        Obtener tiempo actual del juego en segundos
        
        Returns:
            Tiempo del juego en segundos
        """
        return self.tiempo_juego
    
    def get_sun_angle(self) -> float:
        """
        Calcular ángulo del sol según tiempo del juego
        
        El sol gira en sentido horario alrededor del centro.
        Una rotación completa = 1 día del juego (24 horas reales).
        
        Returns:
            Ángulo en radianes (0 = norte, π/2 = este, π = sur, 3π/2 = oeste)
        """
        # Velocidad angular desde configuración
        velocidad_angular = CELESTIAL_CONFIG['SOL_VELOCIDAD_ANGULAR']
        angulo = (self.tiempo_juego * velocidad_angular) % (2 * math.pi)
        return angulo
    
    def get_luna_angle(self) -> float:
        """
        Calcular ángulo de la luna según tiempo del juego
        
        La luna gira más lento que el sol (ciclo de ~28 días).
        
        Returns:
            Ángulo en radianes
        """
        # Velocidad angular y desplazamiento desde configuración
        velocidad_angular = CELESTIAL_CONFIG['LUNA_VELOCIDAD_ANGULAR']
        desplazamiento = CELESTIAL_CONFIG['LUNA_DESPLAZAMIENTO_INICIAL']
        angulo = (self.tiempo_juego * velocidad_angular + desplazamiento) % (2 * math.pi)
        return angulo
    
    def get_luna_phase(self) -> float:
        """
        Calcular fase lunar según tiempo del juego
        
        Returns:
            Fase lunar: 0.0 = luna nueva, 0.25 = cuarto creciente, 
                        0.5 = luna llena, 0.75 = cuarto menguante
        """
        angulo = self.get_luna_angle()
        return (angulo / (2 * math.pi)) % 1.0
    
    def get_current_hour(self) -> float:
        """
        Obtener hora actual del día (0-24)
        
        Returns:
            Hora del día (0.0 = medianoche, 12.0 = mediodía, 24.0 = medianoche siguiente)
        """
        angulo_sol = self.get_sun_angle()
        # Ajustar para que 0° = medianoche
        angulo_ajustado = (angulo_sol + math.pi) % (2 * math.pi)
        horas_por_dia = CELESTIAL_CONFIG['HORAS_POR_DIA']
        hora = (angulo_ajustado / (2 * math.pi)) * horas_por_dia
        return hora
    
    def get_sun_intensity_at(self, celda_x: float, celda_y: float) -> float:
        """
        Obtener intensidad solar en una posición (0.0 a 1.0)
        
        Útil para cálculos de temperatura y futuros efectos (hechizos solares, etc.)
        
        Args:
            celda_x: Coordenada X de la celda
            celda_y: Coordenada Y de la celda
        
        Returns:
            Intensidad solar: 1.0 cuando el sol está directamente arriba, 
                             0.0 cuando está opuesto (noche)
        """
        radio = math.sqrt(celda_x * celda_x + celda_y * celda_y)
        angulo = math.atan2(celda_y, celda_x)
        angulo_sol = self.get_sun_angle()
        
        # Diferencia angular
        diferencia_angular = abs(angulo - angulo_sol)
        if diferencia_angular > math.pi:
            diferencia_angular = 2 * math.pi - diferencia_angular
        
        # Intensidad: coseno de la diferencia angular
        intensidad = math.cos(diferencia_angular)
        
        # Solo positivo (día)
        return max(0.0, intensidad)
    
    def is_daytime_at(self, celda_x: float, celda_y: float) -> bool:
        """
        Determinar si es de día en una posición
        
        Útil para cálculos de temperatura y futuros efectos (bonificaciones diurnas, etc.)
        
        Args:
            celda_x: Coordenada X de la celda
            celda_y: Coordenada Y de la celda
        
        Returns:
            True si es de día, False si es de noche
        """
        radio = math.sqrt(celda_x * celda_x + celda_y * celda_y)
        angulo = math.atan2(celda_y, celda_x)
        angulo_sol = self.get_sun_angle()
        
        # Diferencia angular entre el punto y el sol
        diferencia_angular = abs(angulo - angulo_sol)
        
        # Normalizar a 0-π
        if diferencia_angular > math.pi:
            diferencia_angular = 2 * math.pi - diferencia_angular
        
        # Si el sol está "cerca" del punto (dentro del umbral), es de día
        umbral = CELESTIAL_CONFIG['ANGULO_DIA_UMBRAL']
        return diferencia_angular < umbral
    
    def get_sun_position(self) -> Dict[str, float]:
        """
        Calcular posición 3D del sol (autoritativo)
        
        Returns:
            Diccionario con posición {x, y, z} en metros
        """
        angulo = self.get_sun_angle()
        radio_orbita = CELESTIAL_CONFIG['SOL_RADIO_ORBITA']
        altura = CELESTIAL_CONFIG['SOL_ALTURA']
        
        # Calcular posición en círculo alrededor del centro
        # X e Y en el plano horizontal, Z es altura
        x = math.cos(angulo) * radio_orbita
        y = math.sin(angulo) * radio_orbita
        z = altura
        
        return {"x": x, "y": y, "z": z}
    
    def get_luna_position(self) -> Dict[str, float]:
        """
        Calcular posición 3D de la luna (autoritativo)
        
        Returns:
            Diccionario con posición {x, y, z} en metros
        """
        angulo = self.get_luna_angle()
        radio_orbita = CELESTIAL_CONFIG['LUNA_RADIO_ORBITA']
        altura = CELESTIAL_CONFIG['LUNA_ALTURA']
        
        # Calcular posición en círculo alrededor del centro
        # X e Y en el plano horizontal, Z es altura
        x = math.cos(angulo) * radio_orbita
        y = math.sin(angulo) * radio_orbita
        z = altura
        
        return {"x": x, "y": y, "z": z}
    
    def get_celestial_state(self) -> Dict[str, float]:
        """
        Obtener estado completo celestial (para otros sistemas)
        
        Útil para sistemas futuros que necesiten información celestial completa
        (hechizos, estadísticas, eventos, etc.)
        
        Returns:
            Diccionario con estado celestial completo:
            {
                "time": float,              # Tiempo del juego en segundos
                "sun_angle": float,          # Ángulo del sol en radianes
                "luna_angle": float,        # Ángulo de la luna en radianes
                "luna_phase": float,         # Fase lunar (0.0 a 1.0)
                "current_hour": float,       # Hora del día (0-24)
                "is_daytime": bool,          # Es de día (promedio mundial, simplificado)
                "sun_position": dict,        # Posición del sol {x, y, z} en metros
                "luna_position": dict        # Posición de la luna {x, y, z} en metros
            }
        """
        return {
            "time": self.tiempo_juego,
            "sun_angle": self.get_sun_angle(),
            "luna_angle": self.get_luna_angle(),
            "luna_phase": self.get_luna_phase(),
            "current_hour": self.get_current_hour(),
            "is_daytime": (
                CELESTIAL_CONFIG['HORA_AMANECER'] <= self.get_current_hour() <= CELESTIAL_CONFIG['HORA_ATARDECER']
            ),
            "sun_position": self.get_sun_position(),
            "luna_position": self.get_luna_position()
        }

