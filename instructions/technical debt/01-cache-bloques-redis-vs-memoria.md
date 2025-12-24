# Technical Debt: Cache de Bloques - Redis vs Memoria

**Fecha**: 2025-12-24  
**Ticket Relacionado**: JDG-038  
**Prioridad**: Media  
**Estado**: Pendiente de decisión

## Contexto

Durante la implementación de `WorldBloqueManager` (Paso 6 de JDG-038), se implementó un sistema de cache en memoria usando diccionarios de Python para almacenar:

- **Bloques espaciales** (`WorldBloque`): Instancias en memoria de bloques del mundo
- **Configuraciones de bloques**: Cache de configuraciones desde la tabla `bloques` de PostgreSQL

## Situación Actual

**Implementación actual**: Cache en memoria (dicts de Python)

```python
# backend/src/services/world_bloque_manager.py
class WorldBloqueManager:
    def __init__(self):
        self.bloques: Dict[str, WorldBloque] = {}  # Cache en memoria
        self.bloque_configs: Dict[str, dict] = {}  # Cache de configuraciones
```

**Características**:
- ✅ Acceso ultra-rápido (nanosegundos)
- ✅ Sin dependencias externas
- ✅ Implementación simple
- ❌ Se pierde al reiniciar el servidor
- ❌ No compartido entre múltiples instancias
- ❌ Consume RAM del proceso Python
- ❌ Sin TTL automático

## Propuesta: Migrar a Redis

**Redis ya está configurado en el proyecto**:
- ✅ Docker Compose incluye servicio Redis
- ✅ `requirements.txt` incluye `redis==5.0.1`
- ✅ Documentación menciona Redis para cache

**Ventajas de Redis**:
- ✅ Persistencia entre reinicios
- ✅ Compartido entre múltiples instancias del servidor
- ✅ TTL automático para expiración de datos
- ✅ Escalabilidad horizontal (importante para MMO)
- ✅ Menos consumo de RAM en el proceso Python

**Desventajas**:
- ⚠️ Latencia de red (~1-5ms vs nanosegundos)
- ⚠️ Dependencia adicional (si Redis cae, afecta el cache)
- ⚠️ Serialización/deserialización necesaria

## Alternativa: Sistema Híbrido (L1 + L2)

**Cache de dos niveles**:
1. **L1 (Memoria)**: Datos muy frecuentes, cálculos rápidos
2. **L2 (Redis)**: Datos compartidos, persistencia

**Implementación sugerida**:
```python
class WorldBloqueManager:
    def __init__(self):
        # L1: Cache en memoria (muy rápido)
        self.bloques_l1: Dict[str, WorldBloque] = {}
        self.bloque_configs_l1: Dict[str, dict] = {}
        
        # L2: Redis (persistente, compartido)
        self.redis_client: Optional[Redis] = None
    
    async def get_bloque(self, key: str) -> Optional[WorldBloque]:
        # 1. Buscar en L1 (memoria)
        if key in self.bloques_l1:
            return self.bloques_l1[key]
        
        # 2. Buscar en L2 (Redis)
        bloque_data = await self.redis_client.get(f"bloque:{key}")
        if bloque_data:
            bloque = deserialize(bloque_data)
            self.bloques_l1[key] = bloque  # Populate L1
            return bloque
        
        # 3. Cargar desde BD
        bloque = await self._load_from_db(key)
        await self.redis_client.setex(f"bloque:{key}", 3600, serialize(bloque))
        self.bloques_l1[key] = bloque
        return bloque
```

## Decisión Pendiente

**Pregunta clave**: ¿Cuál es la estrategia de escalabilidad del proyecto?

- **Single-instance**: Memoria es suficiente
- **Multi-instance (horizontal scaling)**: Redis es necesario
- **Balance performance/persistencia**: Sistema híbrido

## Acciones Recomendadas

1. **Corto plazo**: Mantener implementación actual (memoria) para MVP
2. **Medio plazo**: Evaluar necesidad de escalabilidad horizontal
3. **Largo plazo**: Implementar sistema híbrido si se requiere multi-instance

## Referencias

- `backend/src/services/world_bloque_manager.py` (implementación actual)
- `docker-compose.yml` (Redis ya configurado)
- `backend/requirements.txt` (redis==5.0.1)
- Documentación: `Juego de Dioses/Ideas/14-Arquitectura-Tecnica-Mundo.md` (menciona Redis para cache)

## Notas Adicionales

- El usuario mencionó: "creo que me lo llevo para analizar"
- Esta decisión afecta la arquitectura de escalabilidad del sistema de partículas
- Considerar también el impacto en otros sistemas que usen cache (elementos, regiones, etc.)

