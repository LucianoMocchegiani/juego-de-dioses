# Arquitectura y Elección de Tecnologías

Este documento explica las decisiones técnicas y las razones detrás de la elección de tecnologías para el proyecto.

## Stack Tecnológico

### Backend: Python 3.11 + FastAPI + Uvicorn

**¿Por qué Python/FastAPI?**

**Mejor para este proyecto:**
- **Cálculos matemáticos y físicos**: NumPy y SciPy son librerías maduras y altamente optimizadas para simulaciones físicas de partículas
- **Algoritmos complejos**: NetworkX proporciona implementaciones eficientes de BFS/DFS para conectividad de núcleos en el sistema de partículas
- **Procesamiento de datos científicos**: Python es el estándar de la industria para análisis y procesamiento científico de datos
- **Performance**: FastAPI es muy rápido (comparable a Node.js) gracias a su uso de Pydantic y Uvicorn
- **Async/await nativo**: Soporte completo para programación asíncrona, ideal para WebSockets y operaciones I/O
- **Librerías maduras**: Ecosistema robusto para simulaciones físicas y cálculos científicos

**Alternativas consideradas:**
- **Node.js/Express**: No tiene librerías tan maduras para cálculos científicos (NumPy/SciPy)
- **Go**: Excelente performance pero menos librerías para física de partículas
- **Rust**: Demasiado complejo para el scope inicial del proyecto

### Base de Datos: PostgreSQL 16

**¿Por qué PostgreSQL?**
- **Proven**: Sistema de base de datos relacional robusto y probado
- **JSON support**: Soporte nativo para JSON/JSONB útil para datos flexibles
- **Geométrico**: Extensión PostGIS disponible para futuras funcionalidades espaciales
- **Open source**: Sin costos de licencia
- **Escalabilidad**: Capacidad para manejar grandes volúmenes de datos

**Alternativas consideradas:**
- **MongoDB**: Menos apropiado para datos relacionales del juego (partículas, personajes, agrupaciones)
- **MySQL**: PostgreSQL tiene mejor soporte para JSON y es más flexible

### Cache: Redis 7

**¿Por qué Redis?**
- **In-memory**: Acceso ultra-rápido para datos frecuentes
- **Pub/Sub**: Ideal para broadcast a múltiples clientes en tiempo real
- **Estructuras de datos**: Soporte para sets, lists, hashes útiles para el juego
- **Persistencia**: Configurable para persistir datos importantes
- **Escalabilidad**: Clustering para futura expansión

### Frontend: Three.js + ECS Pattern

**¿Por qué Three.js?**
- **WebGL**: Renderizado 3D nativo en el navegador sin plugins
- **Mature**: Librería estable y bien documentada con gran comunidad
- **Performance**: Optimizaciones para instanced rendering y frustum culling
- **GLB/GLTF**: Soporte nativo para modelos 3D modernos

**¿Por qué ECS (Entity Component System)?**
- **Composición flexible**: Permite crear entidades dinámicas combinando componentes
- **Reutilización**: Los mismos componentes y sistemas sirven para diferentes entidades
- **Mantenibilidad**: Separación clara entre datos (componentes) y lógica (sistemas)
- **Testabilidad**: Sistemas y helpers independientes fáciles de testear
- **Escalabilidad**: Fácil agregar nuevos componentes y sistemas sin modificar código existente

### WebSockets: FastAPI WebSockets (nativo)

**¿Por qué WebSockets nativo de FastAPI?**
- **Integración**: Funciona directamente con FastAPI sin dependencias adicionales
- **Async**: Soporte completo para programación asíncrona
- **Simplicidad**: No necesita librerías externas complejas
- **Performance**: Buen rendimiento para actualizaciones en tiempo real

### Containerización: Docker + Docker Compose

**¿Por qué Docker?**
- **Portabilidad**: Mismo entorno en desarrollo y producción
- **Reproducibilidad**: Cualquier desarrollador puede levantar el proyecto con `docker-compose up`
- **Aislamiento**: Cada servicio corre en su propio contenedor
- **Simplicidad**: Fácil de entender y mantener

## Arquitectura de Comunicación

**IMPORTANTE**: Los juegos en tiempo real NO usan solo HTTP.

### HTTP/REST
- **Para**: Autenticación, inventario, consultas (operaciones no críticas)
- **Razón**: Simple, bien entendido, suficiente para operaciones que no requieren baja latencia

### WebSockets
- **Para**: Actualizaciones del mundo en tiempo real (cambios de partículas, agrupaciones)
- **Razón**: Comunicación bidireccional persistente con baja latencia, ideal para juegos

### Redis Pub/Sub
- **Para**: Broadcast a múltiples clientes simultáneamente
- **Razón**: Permite notificar cambios a todos los jugadores conectados de manera eficiente

## Decisiones de Diseño

### Sistema ECS Separado de Partículas

**Por qué separar:**
- **Partículas** (suelo, árboles, rocas): Mayormente estáticas, renderizado optimizado con instanced rendering
- **Entidades ECS** (personajes, NPCs, monstruos): Dinámicas, necesitan física, animaciones, input

Esta separación permite optimizar cada tipo según sus necesidades específicas.

### Frontend Agnóstico del Backend

**Por qué:**
- **Flexibilidad**: Fácil cambiar el backend sin modificar el frontend
- **Testing**: Frontend puede funcionar con datos mock sin backend
- **Desarrollo**: Frontend y backend pueden desarrollarse independientemente

### Configuración Data-Driven

**Por qué:**
- **Mantenibilidad**: Cambios en comportamiento sin modificar código
- **Balance**: Fácil ajustar valores sin recompilar
- **Escalabilidad**: Agregar nuevas animaciones/acciones sin cambiar sistemas

## Referencias

- [README.md](../README.md) - Información general del proyecto
- [roadmap.md](roadmap.md) - Estado actual y funcionalidades planificadas
