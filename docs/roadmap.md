# Roadmap - Juego de Dioses

Este documento contiene el estado del proyecto: lo implementado y las funcionalidades planificadas.

**Referencias:**
- Para información general del proyecto, consulta [README.md](../README.md)
- Para detalles sobre arquitectura y tecnologías, consulta [ARQUITECTURA-TECNOLOGIAS.md](ARQUITECTURA-TECNOLOGIAS.md)

## ✅ Implementado

### Infraestructura Base

- [x] **Docker Compose** - Containerización completa del proyecto
- [x] **PostgreSQL 16** - Base de datos principal con esquema completo
- [x] **Redis 7** - Cache y Pub/Sub (configurado, no totalmente implementado)
- [x] **Backend FastAPI** - API REST básica funcionando
- [x] **Frontend Three.js** - Renderizado 3D con WebGL
- [x] **WebSockets** - Configuración básica (no completamente implementado)
- [x] **Scripts SQL de inicialización** - Esquema y seed data automáticos

### Sistema ECS (Entity Component System)

- [x] **ECSManager** - Núcleo del sistema ECS con queries y cache
- [x] **Sistema de Prioridades** - Ejecución ordenada de sistemas
- [x] **9 Componentes** - Position, Physics, Render, Input, Animation, Combo, Combat, Weapon
- [x] **9 Sistemas ECS** - InputSystem, PhysicsSystem, CollisionSystem, CombatSystem, ComboSystem, AnimationStateSystem, AnimationMixerSystem, RenderSystem, WeaponEquipSystem
- [x] **Helpers especializados** - Refactorización completa de sistemas grandes (JDG-057 a JDG-062)

### Sistema de Animaciones

- [x] **48+ animaciones GLB** - Cargadas desde backend/static/models/biped/
- [x] **Animaciones básicas** - Idle, Walk, Run, Jump, Crouch
- [x] **Animaciones direccionales** - Walk (W/A/S/D), Crouch Walk, Swim
- [x] **Animaciones de combate** - Attacks, Heavy Attacks, Charged Attacks, Special Attacks
- [x] **Animaciones de defensa** - Parry, Dodge
- [x] **Sistema de estados** - Máquina de estados con transiciones configurables
- [x] **Modelo 3D Biped** - Estructura `biped/male/` para modelos y animaciones

### Sistema de Combate

- [x] **Ataques básicos** - Click izquierdo
- [x] **Ataques pesados** - Shift + Click
- [x] **Ataques cargados** - Ctrl + Click (mantener)
- [x] **Ataques especiales** - Combinaciones personalizables
- [x] **Parry** - Tecla Q
- [x] **Dodge** - Tecla E (estilo Dark Souls)
- [x] **Sistema de combos** - Secuencias de ataques consecutivos
- [x] **Cooldowns** - Sistema de enfriamiento para acciones
- [x] **Bloqueo de movimiento** - Durante animaciones de habilidades

### Sistema de Armas

- [x] **Equipamiento de armas** - Sword, Axe, Spear
- [x] **Visualización 3D** - Armas adjuntadas al skeleton del personaje
- [x] **7 modelos GLB** - Modelos de armas disponibles
- [x] **Cache de modelos** - Evita cargas duplicadas
- [x] **Animaciones específicas por arma** - Configuración data-driven

### Sistema de Terreno/Partículas

- [x] **Sistema de partículas** - Base implementada (JDG-038)
- [x] **Renderizado optimizado** - Instanced rendering para partículas
- [x] **Colisiones** - Sistema sólido/líquido con partículas
- [x] **Sistema de bloques** - Gestión de celdas del mundo
- [x] **Seed de terrenos** - Terrain Test 1 (bosque denso) y Test 2 (lago/montaña)
- [x] **Límites de dimensión** - Validación de bordes del mundo
- [x] **Agrupaciones** - Sistema de conectividad BFS/DFS

### Sistema de Temperatura y Ambiente

- [x] **Sistema de temperatura ambiental** - Cálculo por posición (JDG-039)
- [x] **Sistema Sol/Luna Gleason** - Movimiento espiral realista (JDG-039)
- [x] **Conservación de calor** - Para partículas (JDG-041)
- [x] **Reflejo realista de la Luna** - Iluminación dinámica (JDG-042)

### Sistema de Natación

- [x] **Detección de líquidos** - Colisión con partículas líquidas
- [x] **Animaciones de natación** - Swim Forward, Swim Idle
- [x] **Animaciones direccionales** - W (swim_forward), S/A/D (swim_idle)

### Sistema de Vuelo

- [x] **Triple salto** - Activa modo vuelo (JDG-040)
- [x] **Vuelo 3D** - Movimiento libre en todas las direcciones
- [x] **Pointer Lock** - Para observación celestial durante vuelo

### Rendering y Visualización

- [x] **Three.js WebGL Renderer** - Renderizado 3D optimizado
- [x] **Frustum Culling** - Renderizado solo de entidades visibles
- [x] **Cámara tercera persona** - Control por mouse con rotación
- [x] **Luces dinámicas** - Iluminación basada en Sol/Luna
- [x] **Cielo dinámico** - Color basado en posición del sol
- [x] **Modelos 3D** - Personajes, armas, estructuras

### Optimizaciones de Rendimiento

- [x] **Object Pool** - Reutilización de objetos Three.js (JDG-047)
- [x] **Cache de queries ECS** - Optimización de queries de sistemas (JDG-047)
- [x] **Dirty flags** - Evita actualizaciones innecesarias del cielo (JDG-047)
- [x] **Particle Limiter** - Control de partículas renderizadas (JDG-008)
- [x] **Logging de performance** - RAM, GPU, CPU (JDG-045)
- [x] **Optimizaciones FPS** - Fases 1, 2 y 3 completadas (JDG-047, JDG-048, JDG-049)

### Debugging y Desarrollo

- [x] **Sistema de logging** - DebugLogger con niveles
- [x] **Interfaz F6** - Panel de testing de animaciones
- [x] **Interfaz F4** - Panel de métricas de performance
- [x] **Inspector de entidades** - Visualización de componentes ECS
- [x] **Validadores** - Validación de configuraciones
- [x] **Performance Monitor** - Monitoreo en tiempo real

### Base de Datos

- [x] **Esquema completo** - Dimensiones, partículas, agrupaciones, personajes, estilos
- [x] **Sistema de personajes** - Templates, Builders, Creators
- [x] **Modelos 3D en BD** - Rutas de archivos GLB almacenadas
- [x] **Seed data** - Terrenos de prueba y personajes demo

### Arquitectura y Código

- [x] **Backend Hexagonal + DDD (JDG-066)** - Puertos, casos de uso, adaptadores de persistencia por dominio; routes sin `get_connection`; create_character vía ICharacterCreationPort; celestial con IParticleRepository; WorldBloque/Manager con ITemperatureCalculator opcional
- [x] **Refactorización ECS** - Helpers especializados para sistemas grandes (JDG-057 a JDG-062)
- [x] **Configuración data-driven** - Animation Config, Combat Config, Input Config
- [x] **Estructura modular** - Separación clara de responsabilidades
- [x] **Documentación** - READMEs en cada módulo importante; docs de arquitectura backend (flujo-endpoints-hexagonal-ddd)

**Estadísticas:**
- 54 tickets completados
- 9 sistemas ECS (todos refactorizados con helpers)
- 9 componentes ECS
- 48+ animaciones GLB
- 7 modelos de armas

---

## 🔄 Funcionalidades Planificadas

### API y Comunicación

- [ ] **Implementar API REST completa** - Expandir endpoints para todas las operaciones del juego (HTTP para operaciones no críticas)
- [ ] **Sistema de autenticación (JWT)** - Login, registro y gestión de sesiones de usuarios
- [ ] **WebSocket funcional** - Implementar lógica de sincronización en tiempo real (ya configurado básico)
- [ ] **Sistema de suscripción por viewport (interest management)** - Solo enviar actualizaciones de entidades visibles para cada jugador
- [ ] **Delta compression** - Comprimir actualizaciones del mundo para reducir ancho de banda
- [ ] **Redis Pub/Sub para broadcast** - Enviar actualizaciones a múltiples clientes simultáneamente

### Sistema de Juego

- [ ] **Sistema de inventario** - Gestión de items, objetos y recursos del jugador
- [ ] **Sistema de construcción/edición del mundo** - Permite a los jugadores modificar el terreno y crear estructuras
- [ ] **Sistema de NPCs y AI** - Personajes no jugadores con comportamiento autónomo
- [ ] **Sistema de misiones/objetivos** - Quests y objetivos para guiar la progresión del jugador
- [ ] **Sistema de combate** - Mejoras y expansión del sistema actual (básico ya implementado)
  - [ ] Sistema de física avanzado (JDG-037)
  - [ ] Restricción de movimiento en aire al saltar (JDG-053)
  - [ ] Root Motion - Corrección de desplazamiento no deseado (JDG-055)

### Optimización

- [ ] **Optimizaciones de consultas** - Índices en base de datos y cache para mejorar rendimiento
- [ ] **Optimización de renderizado** - LOD (Level of Detail) y técnicas avanzadas de culling
- [ ] **Optimización de física y colisiones** - Mejoras en el sistema de detección de colisiones
- [ ] **Optimización de memoria** - Reducir uso de RAM y mejorar gestión de recursos

### Visual y Ambiental

- [ ] **Sistema de sombras dinámicas** - (JDG-043)
- [ ] **Movimiento espiral Sol/Luna** - Mejoras al modelo Gleason (JDG-044)
- [ ] **Refactorizar renderParticles()** - Métodos más pequeños (JDG-050)

### Documentación

- [ ] **Documentación API completa** - Swagger/OpenAPI mejorado (ya disponible en /docs pero necesita expansión)
- [ ] **Documentación de arquitectura detallada** - Explicación profunda de decisiones de diseño
- [ ] **Guías de contribución mejoradas** - Facilitar el onboarding de nuevos desarrolladores

### Ideas Futuras (Baja Prioridad)

- [ ] Sistema de elementos (fuego, agua, tierra, aire)
- [ ] Sistema de propagación de fuego/calor/electricidad
- [ ] Sistema de magnetismo
- [ ] Múltiples partículas por celda
- [ ] Sistema de transiciones de partículas con integridad
- [ ] Sistema de bloques unificado
- [ ] Persistencia de chunks
- [ ] Sistema de eventos activos
- [ ] Dimensiones dinámicas
- [ ] Sistema de generación procedural de criaturas
- [ ] Sistema de daño por partes del cuerpo (Limb Damage System - JDG-014) ⚠️ POSPUESTO

---

**Nota**: Este roadmap es dinámico y se actualiza conforme el proyecto evoluciona.

**Ver también:**
- [README.md](../README.md) - Información general y guía de inicio rápido
- [ARQUITECTURA-TECNOLOGIAS.md](ARQUITECTURA-TECNOLOGIAS.md) - Decisiones técnicas y arquitectura