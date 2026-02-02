"""
Servicio de tiempo celestial y temperatura ambiental.
Usa IParticleRepository inyectado para vecinos y tipos (sin particles.service).
"""
import math
from typing import Dict, Optional, List, Any, TYPE_CHECKING

from src.config import CELESTIAL_CONFIG

if TYPE_CHECKING:
    from src.domains.particles.application.ports.particle_repository import IParticleRepository


def _calcular_distancia(
    x1: float, y1: float, z1: float, x2: float, y2: float, z2: float
) -> float:
    """Distancia euclidiana entre dos puntos 3D."""
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2)


# =============================================================================
# CELESTIAL TIME SERVICE
# =============================================================================

class CelestialTimeService:
    """Servicio de Tiempo Celestial - Autoritativo. Backend controla el tiempo del juego."""

    def __init__(self, tiempo_inicial: float = None, velocidad_tiempo: float = None):
        """Inicializa tiempo de juego y velocidad; valores por defecto desde CELESTIAL_CONFIG."""
        if tiempo_inicial is None:
            tiempo_inicial = CELESTIAL_CONFIG['TIEMPO_INICIAL']
        if velocidad_tiempo is None:
            velocidad_tiempo = CELESTIAL_CONFIG['VELOCIDAD_TIEMPO']
        self.tiempo_juego = tiempo_inicial
        self.velocidad_tiempo = velocidad_tiempo
        self.tiempo_inicio = tiempo_inicial

    def update(self, delta_time: float) -> None:
        """Avanza el tiempo del juego: tiempo_juego += delta_time * velocidad_tiempo."""
        self.tiempo_juego += delta_time * self.velocidad_tiempo

    def get_time(self) -> float:
        """Tiempo actual del juego (segundos virtuales)."""
        return self.tiempo_juego

    def get_sun_angle(self) -> float:
        """Ángulo del sol en radianes (0..2π) según tiempo y SOL_VELOCIDAD_ANGULAR."""
        velocidad_angular = CELESTIAL_CONFIG['SOL_VELOCIDAD_ANGULAR']
        return (self.tiempo_juego * velocidad_angular) % (2 * math.pi)

    def get_luna_angle(self) -> float:
        """Ángulo de la luna en radianes (0..2π) según tiempo y LUNA_VELOCIDAD_ANGULAR."""
        velocidad_angular = CELESTIAL_CONFIG['LUNA_VELOCIDAD_ANGULAR']
        desplazamiento = CELESTIAL_CONFIG['LUNA_DESPLAZAMIENTO_INICIAL']
        return (self.tiempo_juego * velocidad_angular + desplazamiento) % (2 * math.pi)

    def get_luna_phase(self) -> float:
        """Fase de la luna (0..1) derivada del ángulo lunar."""
        angulo = self.get_luna_angle()
        return (angulo / (2 * math.pi)) % 1.0

    def get_current_hour(self) -> float:
        """Hora actual del día (0..HORAS_POR_DIA) según posición del sol."""
        angulo_sol = self.get_sun_angle()
        angulo_ajustado = (angulo_sol + math.pi) % (2 * math.pi)
        horas_por_dia = CELESTIAL_CONFIG['HORAS_POR_DIA']
        return (angulo_ajustado / (2 * math.pi)) * horas_por_dia

    def get_sun_intensity_at(self, celda_x: float, celda_y: float) -> float:
        """Intensidad solar en (celda_x, celda_y): coseno del ángulo entre celda y sol (0..1)."""
        angulo = math.atan2(celda_y, celda_x)
        angulo_sol = self.get_sun_angle()
        diferencia_angular = abs(angulo - angulo_sol)
        if diferencia_angular > math.pi:
            diferencia_angular = 2 * math.pi - diferencia_angular
        return max(0.0, math.cos(diferencia_angular))

    def is_daytime_at(self, celda_x: float, celda_y: float) -> bool:
        """True si en (celda_x, celda_y) es de día según ANGULO_DIA_UMBRAL."""
        angulo = math.atan2(celda_y, celda_x)
        angulo_sol = self.get_sun_angle()
        diferencia_angular = abs(angulo - angulo_sol)
        if diferencia_angular > math.pi:
            diferencia_angular = 2 * math.pi - diferencia_angular
        return diferencia_angular < CELESTIAL_CONFIG['ANGULO_DIA_UMBRAL']

    def get_sun_position(self) -> Dict[str, float]:
        """Posición 3D del sol (x, y, z) según orbita y altura config."""
        angulo = self.get_sun_angle()
        radio_orbita = CELESTIAL_CONFIG['SOL_RADIO_ORBITA']
        altura = CELESTIAL_CONFIG['SOL_ALTURA']
        return {
            "x": math.cos(angulo) * radio_orbita,
            "y": math.sin(angulo) * radio_orbita,
            "z": altura,
        }

    def get_luna_position(self) -> Dict[str, float]:
        """Posición 3D de la luna (x, y, z) según orbita y altura config."""
        angulo = self.get_luna_angle()
        radio_orbita = CELESTIAL_CONFIG['LUNA_RADIO_ORBITA']
        altura = CELESTIAL_CONFIG['LUNA_ALTURA']
        return {
            "x": math.cos(angulo) * radio_orbita,
            "y": math.sin(angulo) * radio_orbita,
            "z": altura,
        }

    def get_celestial_state(self) -> Dict[str, float]:
        """Estado completo: time, ángulos, fase luna, hora, is_daytime, posiciones sol/luna."""
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
            "luna_position": self.get_luna_position(),
        }


# =============================================================================
# TEMPERATURE SERVICE (usa IParticleRepository inyectado)
# =============================================================================

def _calculate_solar_temperature(
    celda_x: float,
    celda_y: float,
    celestial_time_service: CelestialTimeService,
    radio_maximo: Optional[float] = None,
) -> float:
    """Temperatura base por latitud (radio) y ajuste día/noche según intensidad solar."""
    if radio_maximo is None:
        radio_maximo = CELESTIAL_CONFIG['RADIO_MUNDO']
    radio = math.sqrt(celda_x * celda_x + celda_y * celda_y)
    radio_ecuador = radio_maximo * 0.5
    if radio <= radio_ecuador:
        factor = radio / radio_ecuador if radio_ecuador > 0 else 0.0
        temp_base = -20.0 + (factor * 50.0)
    else:
        factor = (radio - radio_ecuador) / (radio_maximo - radio_ecuador) if (radio_maximo - radio_ecuador) > 0 else 0.0
        temp_base = 30.0 - (factor * 70.0)
    intensidad_solar = celestial_time_service.get_sun_intensity_at(celda_x, celda_y)
    ajuste_dia_noche = (intensidad_solar * 25.0) - 10.0
    return temp_base + ajuste_dia_noche


def get_altitude_modifier(altitud_z: float) -> float:
    """Modificador de temperatura por altitud: -6.5 °C por cada 1000 unidades de z."""
    return -6.5 * (altitud_z / 1000.0)


async def get_water_modifier(
    celda_x: float,
    celda_y: float,
    celda_z: float,
    bloque_id: str,
    particle_repo: "IParticleRepository",
    temp_ambiente: Optional[float] = None,
    radio_busqueda: float = 10.0,
) -> float:
    """Modificador por proximidad a agua/océano/hielo; usa get_particles_near y conductividad del tipo."""
    particulas_cercanas = await particle_repo.get_particles_near(
        bloque_id=bloque_id,
        celda_x=celda_x,
        celda_y=celda_y,
        celda_z=celda_z,
        radio=int(radio_busqueda),
    )
    if temp_ambiente is None:
        distancia_agua_minima = float('inf')
        for particula in particulas_cercanas:
            tipo_nombre = (particula.get('tipo_nombre') or '').lower()
            if tipo_nombre in ['agua', 'oceano', 'agua_sucia']:
                distancia = _calcular_distancia(
                    celda_x, celda_y, celda_z,
                    float(particula['celda_x']), float(particula['celda_y']), float(particula['celda_z']),
                )
                distancia_agua_minima = min(distancia_agua_minima, distancia)
        if distancia_agua_minima == float('inf'):
            return 0.0
        factor = max(0.0, 1.0 - (distancia_agua_minima / 5.0))
        return factor * 5.0
    modificador_total = 0.0
    for particula in particulas_cercanas:
        tipo_nombre = (particula.get('tipo_nombre') or '').lower()
        if tipo_nombre in ['agua', 'oceano', 'agua_sucia', 'hielo']:
            temp_particula_raw = particula.get('temperatura', 20.0)
            temp_particula = float(temp_particula_raw) if temp_particula_raw is not None else 20.0
            diferencia = temp_particula - temp_ambiente
            distancia = _calcular_distancia(
                celda_x, celda_y, celda_z,
                float(particula['celda_x']), float(particula['celda_y']), float(particula['celda_z']),
            )
            tipo_particula = await particle_repo.get_particle_type_by_name(tipo_nombre)
            conductividad = float(tipo_particula.get('conductividad_termica', 1.0)) if tipo_particula else 1.0
            factor_distancia = 1.0 / (1.0 + distancia ** 2)
            factor_proximidad = max(0.0, 1.0 - (distancia / 5.0))
            modificador_total += diferencia * factor_distancia * conductividad * factor_proximidad
    return modificador_total


async def get_albedo_modifier(
    particle_repo: "IParticleRepository",
    tipo_particula_nombre: Optional[str] = None,
) -> float:
    """Modificador por albedo del tipo de partícula en superficie; (0.5 - albedo) * 20."""
    if tipo_particula_nombre is None:
        albedo = 0.2
    else:
        tipo_particula = await particle_repo.get_particle_type_by_name(tipo_particula_nombre)
        albedo = float(tipo_particula['albedo']) if tipo_particula and tipo_particula.get('albedo') is not None else 0.2
    return (0.5 - albedo) * 20.0


async def get_particle_temperature_modifier(
    celda_x: float,
    celda_y: float,
    celda_z: float,
    bloque_id: str,
    temp_ambiente: float,
    particle_repo: "IParticleRepository",
    tipos_particulas: List[str],
    radio_busqueda: float = 10.0,
) -> float:
    """Modificador por partículas cercanas de tipos dados (ej. agua, hielo); distancia y conductividad."""
    particulas_cercanas = await particle_repo.get_particles_near(
        bloque_id=bloque_id,
        celda_x=celda_x,
        celda_y=celda_y,
        celda_z=celda_z,
        radio=int(radio_busqueda),
    )
    modificador_total = 0.0
    tipos_normalizados = [t.lower() for t in tipos_particulas]
    for particula in particulas_cercanas:
        tipo_nombre = (particula.get('tipo_nombre') or '').lower()
        if tipo_nombre in tipos_normalizados:
            temp_particula_raw = particula.get('temperatura', 20.0)
            temp_particula = float(temp_particula_raw) if temp_particula_raw is not None else 20.0
            diferencia = temp_particula - float(temp_ambiente)
            distancia = _calcular_distancia(
                celda_x, celda_y, celda_z,
                float(particula['celda_x']), float(particula['celda_y']), float(particula['celda_z']),
            )
            tipo_particula = await particle_repo.get_particle_type_by_name(tipo_nombre)
            conductividad = float(tipo_particula.get('conductividad_termica', 1.0)) if tipo_particula else 1.0
            factor_distancia = 1.0 / (1.0 + distancia ** 2)
            factor_proximidad = max(0.0, 1.0 - (distancia / 5.0))
            modificador_total += diferencia * factor_distancia * conductividad * factor_proximidad
    return modificador_total


async def calculate_cell_temperature(
    celda_x: float,
    celda_y: float,
    celda_z: float,
    bloque_id: str,
    celestial_time_service: CelestialTimeService,
    particle_repo: "IParticleRepository",
    tipo_particula_superficie: Optional[str] = None,
    radio_maximo: Optional[float] = None,
    radio_busqueda_agua: float = 10.0,
) -> float:
    if radio_maximo is None:
        radio_maximo = CELESTIAL_CONFIG['RADIO_MUNDO']
    temp_solar = _calculate_solar_temperature(
        celda_x=celda_x,
        celda_y=celda_y,
        celestial_time_service=celestial_time_service,
        radio_maximo=radio_maximo,
    )
    mod_altitud = get_altitude_modifier(altitud_z=celda_z)
    mod_albedo = await get_albedo_modifier(particle_repo, tipo_particula_nombre=tipo_particula_superficie)
    temp_ambiente_base = temp_solar + mod_altitud + mod_albedo
    mod_particulas = await get_particle_temperature_modifier(
        celda_x=celda_x,
        celda_y=celda_y,
        celda_z=celda_z,
        bloque_id=bloque_id,
        temp_ambiente=temp_ambiente_base,
        particle_repo=particle_repo,
        tipos_particulas=['agua', 'oceano', 'agua_sucia', 'hielo'],
        radio_busqueda=radio_busqueda_agua,
    )
    temperatura_final = max(-50.0, min(60.0, temp_ambiente_base + mod_particulas))
    return temperatura_final


# Compatibilidad: alias para quien importe calculate_solar_temperature
def calculate_solar_temperature(
    celda_x: float,
    celda_y: float,
    celestial_time_service: CelestialTimeService,
    radio_maximo: Optional[float] = None,
) -> float:
    """Alias de _calculate_solar_temperature para compatibilidad."""
    return _calculate_solar_temperature(celda_x, celda_y, celestial_time_service, radio_maximo)
