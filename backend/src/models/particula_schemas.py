"""
Modelos Pydantic para el sistema de partículas.

Este módulo contiene modelos de validación y serialización para:
- Tipos de partículas (tipos_particulas)
- Partículas (particulas)
- Bloques (bloques)
- Transiciones de partículas (transiciones_particulas)
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, Literal, Dict, Any
from decimal import Decimal
from datetime import datetime
from uuid import UUID


# ============================================================================
# MODELOS DE TIPOS DE PARTÍCULAS
# ============================================================================

class TipoParticulaBase(BaseModel):
    """Modelo base para tipos de partículas."""
    
    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre único del tipo de partícula")
    tipo_fisico: Literal['solido', 'liquido', 'gas', 'energia'] = Field(
        default='solido',
        description="Tipo físico que determina qué propiedades son relevantes"
    )
    
    # Propiedades comunes (todos los tipos)
    densidad: Decimal = Field(
        default=Decimal("1.0"),
        ge=Decimal("0.0"),
        le=Decimal("10.0"),
        description="Peso específico (0.0 = no gravedad, 10.0 = muy pesado)"
    )
    conductividad_termica: Decimal = Field(
        default=Decimal("1.0"),
        ge=Decimal("0.0"),
        le=Decimal("10.0"),
        description="Capacidad de propagar calor (0.0 = aislante, 10.0 = muy conductor)"
    )
    inercia_termica: Decimal = Field(
        default=Decimal("1.0"),
        ge=Decimal("0.0"),
        le=Decimal("10.0"),
        description="Resistencia al cambio de temperatura (también conocido como calor específico). Valores altos = cambia temperatura lentamente (agua: ~4.0). Valores bajos = cambia temperatura rápidamente (metal: ~0.5). Se usa igual para calentar y enfriar."
    )
    opacidad: Decimal = Field(
        default=Decimal("1.0"),
        ge=Decimal("0.0"),
        le=Decimal("1.0"),
        description="Transparencia visual (0.0 = transparente, 1.0 = opaco)"
    )
    color: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Color de la partícula para renderizado"
    )
    geometria: Dict[str, Any] = Field(
        default={"tipo": "box"},
        description="Forma de la partícula (JSONB)"
    )
    
    # Propiedades eléctricas y magnéticas
    conductividad_electrica: Decimal = Field(
        default=Decimal("0.0"),
        ge=Decimal("0.0"),
        le=Decimal("10.0"),
        description="Capacidad de conducir electricidad (0.0 = aislante, 10.0 = muy conductor)"
    )
    magnetismo: Decimal = Field(
        default=Decimal("0.0"),
        ge=Decimal("0.0"),
        le=Decimal("10.0"),
        description="Fuerza magnética (0.0 = no magnético, 10.0 = muy magnético)"
    )
    
    # Propiedades de sólidos (opcionales, solo si tipo_fisico = 'solido')
    dureza: Optional[Decimal] = Field(
        default=None,
        ge=Decimal("0.0"),
        le=Decimal("10.0"),
        description="Resistencia a rayar/deformar (solo para sólidos)"
    )
    fragilidad: Optional[Decimal] = Field(
        default=None,
        ge=Decimal("0.0"),
        le=Decimal("10.0"),
        description="Tendencia a romperse (solo para sólidos)"
    )
    elasticidad: Optional[Decimal] = Field(
        default=None,
        ge=Decimal("0.0"),
        le=Decimal("10.0"),
        description="Coeficiente de rebote (solo para sólidos)"
    )
    punto_fusion: Optional[Decimal] = Field(
        default=None,
        description="Temperatura de fusión en °C (solo para sólidos, NULL si no se derrite)"
    )
    
    # Propiedades de líquidos (opcionales, solo si tipo_fisico = 'liquido')
    viscosidad: Optional[Decimal] = Field(
        default=None,
        ge=Decimal("0.0"),
        le=Decimal("10.0"),
        description="Resistencia al flujo (solo para líquidos)"
    )
    punto_ebullicion: Optional[Decimal] = Field(
        default=None,
        description="Temperatura de ebullición en °C (solo para líquidos, NULL si no se evapora)"
    )
    
    # Propiedades de gases/energía (opcionales, solo si tipo_fisico = 'gas' o 'energia')
    propagacion: Optional[Decimal] = Field(
        default=None,
        ge=Decimal("0.0"),
        le=Decimal("10.0"),
        description="Velocidad/radio de propagación (solo para gases/energía)"
    )
    
    # Propiedades avanzadas
    propiedades_fisicas: Dict[str, Any] = Field(
        default={},
        description="Propiedades físicas adicionales (JSONB)"
    )
    descripcion: Optional[str] = Field(
        default=None,
        description="Descripción del tipo de partícula"
    )
    
    @model_validator(mode='after')
    def validate_type_specific_properties(self):
        """Valida que las propiedades específicas solo se usen con el tipo_fisico correcto."""
        tipo_fisico = self.tipo_fisico
        
        # Validar propiedades de sólidos
        if tipo_fisico != 'solido':
            if self.dureza is not None or self.fragilidad is not None or \
               self.elasticidad is not None or self.punto_fusion is not None:
                raise ValueError("Propiedades de sólidos solo aplican si tipo_fisico = 'solido'")
        
        # Validar propiedades de líquidos
        if tipo_fisico != 'liquido':
            if self.viscosidad is not None or self.punto_ebullicion is not None:
                raise ValueError("Propiedades de líquidos solo aplican si tipo_fisico = 'liquido'")
        
        # Validar propiedades de gases/energía
        if tipo_fisico not in ('gas', 'energia'):
            if self.propagacion is not None:
                raise ValueError("Propagación solo aplica si tipo_fisico = 'gas' o 'energia'")
        
        return self


class TipoParticulaCreate(TipoParticulaBase):
    """Modelo para crear un nuevo tipo de partícula."""
    pass


class TipoParticula(TipoParticulaBase):
    """Modelo completo de tipo de partícula (con ID y timestamps)."""
    
    id: UUID
    creado_en: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: str,
            UUID: str
        }


# ============================================================================
# MODELOS DE PARTÍCULAS
# ============================================================================

class ParticulaBase(BaseModel):
    """Modelo base para partículas."""
    
    bloque_id: UUID = Field(..., description="ID del bloque (mundo/dimensión)")
    celda_x: int = Field(..., description="Coordenada X de la celda")
    celda_y: int = Field(..., description="Coordenada Y de la celda")
    celda_z: int = Field(..., description="Coordenada Z de la celda")
    tipo_particula_id: UUID = Field(..., description="ID del tipo de partícula")
    estado_materia_id: UUID = Field(..., description="ID del estado de materia")
    
    # Propiedades dinámicas
    temperatura: Decimal = Field(
        default=Decimal("20.0"),
        description="Temperatura en °C"
    )
    integridad: Decimal = Field(
        default=Decimal("1.0"),
        ge=Decimal("0.0"),
        le=Decimal("1.0"),
        description="Vida/durabilidad de la partícula (0.0 = destruida, 1.0 = intacta)"
    )
    carga_electrica: Decimal = Field(
        default=Decimal("0.0"),
        ge=Decimal("-100.0"),
        le=Decimal("100.0"),
        description="Carga eléctrica actual (-100.0 a +100.0)"
    )
    
    # Propiedades adicionales (mantenidas para compatibilidad)
    cantidad: Decimal = Field(
        default=Decimal("1.0"),
        ge=Decimal("0.0"),
        description="Cantidad de partícula"
    )
    energia: Decimal = Field(
        default=Decimal("0.0"),
        description="Energía almacenada"
    )
    extraida: bool = Field(
        default=False,
        description="Si la partícula ha sido extraída"
    )
    
    # Agrupación
    agrupacion_id: Optional[UUID] = Field(
        default=None,
        description="ID de la agrupación a la que pertenece"
    )
    es_nucleo: bool = Field(
        default=False,
        description="Si es el núcleo de una agrupación"
    )
    
    # Propiedades especiales
    propiedades: Dict[str, Any] = Field(
        default={},
        description="Propiedades especiales (JSONB)"
    )
    creado_por: Optional[UUID] = Field(
        default=None,
        description="ID del usuario/entidad que creó la partícula"
    )


class ParticulaCreate(ParticulaBase):
    """Modelo para crear una nueva partícula."""
    pass


class Particula(ParticulaBase):
    """Modelo completo de partícula (con ID y timestamps)."""
    
    id: UUID
    creado_en: datetime
    modificado_en: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: str,
            UUID: str
        }


# ============================================================================
# MODELOS DE BLOQUES
# ============================================================================

class BloqueBase(BaseModel):
    """Modelo base para bloques (configuración de mundos/dimensiones)."""
    
    nombre: str = Field(
        default="Mundo Inicial",
        max_length=255,
        description="Nombre del bloque/mundo"
    )
    
    # Límites horizontales (X, Y) en METROS
    ancho_metros: Decimal = Field(
        default=Decimal("1.0"),
        ge=Decimal("0.0"),
        description="Ancho del mundo en metros"
    )
    alto_metros: Decimal = Field(
        default=Decimal("1.0"),
        ge=Decimal("0.0"),
        description="Alto del mundo en metros"
    )
    
    # Límites verticales (Z) en CELDAS
    profundidad_maxima: int = Field(
        default=-100,
        description="Profundidad máxima en celdas (Z negativo)"
    )
    altura_maxima: int = Field(
        default=100,
        description="Altura máxima en celdas (Z positivo)"
    )
    
    # Tamaño de celda en METROS
    tamano_celda: Decimal = Field(
        default=Decimal("0.25"),
        ge=Decimal("0.01"),
        description="Tamaño de cada celda en metros"
    )
    
    # Posición del origen
    origen_x: Decimal = Field(
        default=Decimal("0.0"),
        description="Posición X del origen en metros"
    )
    origen_y: Decimal = Field(
        default=Decimal("0.0"),
        description="Posición Y del origen en metros"
    )
    origen_z: int = Field(
        default=0,
        description="Posición Z del origen en celdas"
    )
    
    # Configuración de bloques
    tamano_bloque: int = Field(
        default=40,
        ge=1,
        description="Tamaño de bloque en celdas (40x40x40 = 64,000 celdas por bloque). Se usa para dividir el mundo en zonas para temperatura, renderizado y comunicación."
    )
    
    creado_por: Optional[UUID] = Field(
        default=None,
        description="ID del usuario/entidad que creó el bloque"
    )


class BloqueCreate(BloqueBase):
    """Modelo para crear un nuevo bloque."""
    pass


class Bloque(BloqueBase):
    """Modelo completo de bloque (con ID y timestamp)."""
    
    id: UUID
    creado_en: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: str,
            UUID: str
        }


# ============================================================================
# MODELOS DE TRANSICIONES DE PARTÍCULAS
# ============================================================================

class TransicionParticulaBase(BaseModel):
    """Modelo base para transiciones de partículas."""
    
    tipo_origen_id: UUID = Field(..., description="ID del tipo de partícula origen")
    tipo_destino_id: UUID = Field(..., description="ID del tipo de partícula destino")
    
    # Condición de temperatura
    condicion_temperatura: Optional[Literal['mayor', 'menor', 'igual']] = Field(
        default=None,
        description="Operador de comparación de temperatura (NULL si no aplica)"
    )
    valor_temperatura: Optional[Decimal] = Field(
        default=None,
        description="Valor de temperatura en °C (NULL si no aplica)"
    )
    
    # Condición de integridad
    condicion_integridad: Optional[Literal['mayor', 'menor', 'igual']] = Field(
        default=None,
        description="Operador de comparación de integridad (NULL si no aplica)"
    )
    valor_integridad: Optional[Decimal] = Field(
        default=None,
        ge=Decimal("0.0"),
        le=Decimal("1.0"),
        description="Valor de integridad (0.0-1.0, NULL si no aplica)"
    )
    
    # Prioridad y estado
    prioridad: int = Field(
        default=0,
        description="Prioridad de la transición (mayor = más importante, se evalúa primero)"
    )
    activa: bool = Field(
        default=True,
        description="Si la transición está activa"
    )
    reversible: bool = Field(
        default=True,
        description="Si puede revertirse al tipo original"
    )
    
    # Histeresis
    histeresis: Decimal = Field(
        default=Decimal("5.0"),
        ge=Decimal("0.0"),
        description="Diferencia necesaria para revertir (evita oscilaciones)"
    )
    
    descripcion: Optional[str] = Field(
        default=None,
        description="Descripción de la transición"
    )
    
    @model_validator(mode='after')
    def validate_conditions(self):
        """Valida que las condiciones estén correctamente definidas."""
        # Validar condición de temperatura
        if (self.condicion_temperatura is None) != (self.valor_temperatura is None):
            raise ValueError("condicion_temperatura y valor_temperatura deben estar ambos presentes o ambos ausentes")
        
        # Validar condición de integridad
        if (self.condicion_integridad is None) != (self.valor_integridad is None):
            raise ValueError("condicion_integridad y valor_integridad deben estar ambos presentes o ambos ausentes")
        
        return self


class TransicionParticulaCreate(TransicionParticulaBase):
    """Modelo para crear una nueva transición."""
    pass


class TransicionParticula(TransicionParticulaBase):
    """Modelo completo de transición (con ID y timestamp)."""
    
    id: UUID
    creado_en: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: str,
            UUID: str
        }

