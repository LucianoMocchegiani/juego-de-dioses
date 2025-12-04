# Guía de Referencia Rápida - Cursor AI para Juego de Dioses

## Comandos Frecuentes

### Generar Ticket

```
"Genera un ticket para [descripción]"
```
Crea un ticket estructurado en `/tickets/`

Ejemplos:
- "Genera un ticket para implementar sistema de recolección de partículas"
- "Genera un ticket de bugfix para el problema de conectividad de núcleos"
- "Genera un ticket de performance para optimizar consultas de viewport"

---

### Planificación

```
"Necesito un action plan para [TICKET-ID]: [descripción]"
```
Genera un plan paso a paso en `/tasks/`

---

### Implementación

```
"Implementa el Paso [N] del action plan"
```
Implementa un paso específico del plan

```
"Implementa el Paso [N] pero usando [tecnología/patrón específico]"
```
Implementa con indicaciones específicas

---

### Generar PR

```
"Genera la descripción del PR para [TICKET-ID]"
```
Crea descripción completa en `/prs/`

---

### Documentación

La documentación Python docstring se agrega automáticamente, pero puedes forzarla:

```
"Documenta esta función/clase/endpoint"
```

---

### Búsqueda y Análisis

```
"¿Dónde se implementa [funcionalidad]?"
"¿Cómo funciona [componente/servicio]?"
"Explica este código: [código]"
```

---

## Flujos Comunes

### Feature Nueva (Complejo)

```
1. "Genera un ticket para [descripción]" (opcional pero recomendado)
2. "Necesito un action plan para JDG-123: [descripción]"
3. "Implementa el Paso 1"
4. "Implementa el Paso 2"
   ...
N. "Genera la descripción del PR para JDG-123"
```

### Feature Nueva (Simple - sin action plan)

```
1. "Implementa JDG-456: [descripción completa]"
2. "Genera la descripción del PR para JDG-456"
```

### Bugfix

```
1. "Fix el bug JDG-789: [descripción]"
2. "Genera la descripción del PR para JDG-789"
```

### Refactoring

```
1. "Refactoriza [componente/servicio] para [objetivo]"
2. "Genera la descripción del PR para JDG-321"
```

---

## Patrones de Preguntas Efectivas

### Buenas Preguntas

```
"Necesito un action plan para implementar sistema de recolección de partículas"
"Implementa el Paso 3: Crear endpoint POST /api/v1/particles/{id}/collect"
"Fix el bug donde las partículas no se marcan como extraidas"
"Refactoriza el servicio de partículas para usar async/await correctamente"
```

### Preguntas Vagas

```
"Haz el sistema de partículas"                → Poco específico
"Arregla esto"                                 → Sin contexto
"Implementa todo"                              → Muy amplio
```

---

## Convenciones de Commits

```
feat(scope): descripción corta
fix(scope): descripción corta
docs: descripción corta
refactor(scope): descripción corta
chore: descripción corta
test: descripción corta
```

### Ejemplos

```bash
feat(particles): add collection endpoint
fix(dimensions): correct viewport query validation
docs: update API documentation
refactor(agrupaciones): extract core connectivity logic to service
chore: update Python to 3.11
test: add unit tests for particle collection
```

---

## Scopes por Módulo

| Módulo | Scopes Comunes |
|--------|----------------|
| **Backend** | `particles`, `dimensions`, `agrupaciones`, `api`, `database` |
| **Frontend** | `frontend`, `ui`, `threejs`, `scene` |
| **Database** | `database`, `migrations`, `seed` |
| **WebSocket** | `websocket`, `realtime` |

---

## Casos de Uso Específicos

### Crear Nuevo Endpoint (Backend FastAPI)

```
"Crea un nuevo endpoint POST /api/v1/particles/{id}/collect que:
 - Acepte el ID de la partícula
 - Verifique que la partícula existe y no está extraida
 - Marque la partícula como extraida
 - Agregue la partícula al inventario del jugador
 - Retorne el estado actualizado
 - Maneje errores apropiadamente"
```

### Crear Nueva Funcionalidad Frontend (Three.js)

```
"Implementa una nueva funcionalidad de visualización que:
 - Muestre partículas en tiempo real usando WebSocket
 - Use Three.js para renderizar cubos 3D
 - Permita rotar, hacer zoom y mover la cámara
 - Actualice automáticamente cuando cambien las partículas
 - Muestre información de la partícula al hacer hover"
```

### Crear Servicio Python

```
"Crea un servicio ParticleService que:
 - Se integre con PostgreSQL usando asyncpg
 - Proporcione métodos para obtener partículas por viewport
 - Maneje la recolección de partículas
 - Use Redis para cachear consultas frecuentes
 - Esté completamente documentado con docstrings"
```

### Crear Función de Cálculo (NumPy/SciPy)

```
"Crea una función calculate_particle_physics que:
 - Use NumPy para cálculos vectoriales
 - Calcule la posición de partículas basada en física
 - Maneje colisiones entre partículas
 - Retorne resultados optimizados
 - Esté documentada con ejemplos"
```

### Agregar Tests

```
"Agrega tests unitarios para ParticleService que cubran:
 - Obtención de partículas por viewport
 - Recolección exitosa de partícula
 - Manejo de errores (partícula no existe, ya extraida)
 - Edge cases (viewport vacío, límites de dimensión)"
```

---

## Debugging

### Encontrar Problema

```
"¿Por qué [comportamiento inesperado]?"
"Analiza este error: [error]"
"¿Qué causa este bug: [descripción]?"
```

### Proponer Solución

```
"¿Cómo puedo solucionar [problema]?"
"¿Cuál es la mejor manera de [objetivo]?"
"Propone alternativas para [implementación]"
```

---

## Exploración de Código

### Buscar Implementación

```
"¿Dónde se implementa la obtención de partículas por viewport?"
"¿Qué endpoints usan WebSocket para actualizaciones en tiempo real?"
"Muestra todos los endpoints relacionados con partículas"
```

### Entender Código

```
"Explica cómo funciona el sistema de conectividad de núcleos"
"¿Qué hace esta función verificar_nucleo_conectado?"
"Describe el flujo de recolección de partículas"
```

---

## Modificaciones Comunes

### Agregar Validación

```
"Agrega validación a ParticleCollectEndpoint para verificar que la partícula existe"
```

### Mejorar Manejo de Errores

```
"Mejora el manejo de errores en DimensionService para cubrir timeouts y errores de conexión"
```

### Optimizar Performance

```
"Optimiza la consulta de partículas por viewport para reducir el tiempo de respuesta"
```

### Agregar Logging

```
"Agrega logs estructurados al servicio de partículas para debugging"
```

---

## Tips y Mejores Prácticas

### Haz

- Sé específico con lo que necesitas
- Proporciona contexto relevante (PostgreSQL, Redis, Three.js, etc.)
- Implementa paso a paso para features complejas
- Revisa el código generado
- Pregunta si algo no está claro
- Usa action plans para features grandes
- Menciona tecnologías específicas (FastAPI, asyncpg, Three.js, NumPy)

### Evita

- Preguntas vagas sin contexto
- Implementar todo de una vez
- Aceptar código sin entender
- Omitir la generación de PR description
- No revisar la documentación generada
- Ignorar los estándares del proyecto

---

## Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| Regla no se activa | Invócala manualmente o reinicia Cursor |
| Código generado con errores | Provee más contexto o especifica requisitos |
| Documentación imprecisa | Revisa y edita manualmente |
| Action plan muy genérico | Da más detalles del ticket |
| PR description incompleta | Agrega información faltante manualmente |
| Conexión PostgreSQL falla | Verifica configuración de variables de entorno |

---

## Tecnologías Comunes

### Backend (FastAPI)

```
"Crea un router FastAPI para [feature]"
"Implementa un endpoint GET que [descripción]"
"Crea un modelo Pydantic para [entidad]"
"Configura asyncpg para [consulta]"
```

### Frontend (Three.js)

```
"Crea un componente Three.js para [funcionalidad]"
"Implementa una escena 3D que muestre [objetos]"
"Crea controles de cámara para [interacción]"
"Integra WebSocket para [notificaciones]"
```

### Base de Datos

```
"Crea una función SQL para [operación]"
"Implementa una migración para [cambio]"
"Optimiza la query de [consulta]"
"Configura conexión a Redis para [cache]"
```

### Cálculos (NumPy/SciPy)

```
"Implementa cálculo de [física/matemática] usando NumPy"
"Crea función de [operación] con SciPy"
"Optimiza cálculo de [proceso] con vectorización"
```

### Grafos (NetworkX)

```
"Implementa verificación de conectividad usando NetworkX"
"Crea algoritmo BFS para [propósito]"
"Calcula ruta entre [nodos] usando grafo"
```

---

## Más Información

- [README Completo](./README.md)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Three.js Documentation](https://threejs.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [NumPy Documentation](https://numpy.org/doc/)

---

## ¿Necesitas Ayuda?

```
"¿Cómo uso las reglas de Cursor AI?"
"Muestra ejemplos de cómo usar action plans"
"Explica el flujo completo de desarrollo con estas reglas"
"¿Cómo integro WebSocket en este proyecto?"
```

---

**Recuerda:** La IA es una herramienta poderosa, pero tú eres el desarrollador. Siempre revisa, entiende y valida el código generado.

**Contexto Juego de Dioses:** Este es un juego basado en partículas (voxels) donde todo está compuesto de partículas pequeñas. Mantén la consistencia del sistema de partículas y la física del mundo.

