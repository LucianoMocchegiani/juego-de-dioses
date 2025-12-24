# Módulo API

Este módulo contiene el cliente API modular organizado por recurso.

## Estructura

```
api/
├── client.js            # Cliente base con configuración
└── endpoints/          # Endpoints por recurso
    ├── bloques.js
    ├── particles.js
    └── agrupaciones.js
```

## Componentes

### ApiClient (`client.js`)
Cliente base con configuración y método genérico de request.

**Responsabilidades:**
- Configurar URL base del API
- Proporcionar método `request()` genérico
- Manejar errores de red

### BloquesApi (`endpoints/bloques.js`)
Endpoints específicos para bloques.

**Métodos:**
- `getDimensions()`: Listar todos los bloques
- `getDimension(bloqueId)`: Obtener bloque específico

### ParticlesApi (`endpoints/particles.js`)
Endpoints específicos para partículas.

**Métodos:**
- `getParticles(bloqueId, viewport)`: Obtener partículas por viewport
- `getParticleTypes(bloqueId, viewport)`: Obtener tipos de partículas con estilos

### AgrupacionesApi (`endpoints/agrupaciones.js`)
Endpoints específicos para agrupaciones.

**Métodos:**
- `getAgrupaciones(bloqueId)`: Listar agrupaciones
- `getAgrupacion(bloqueId, agrupacionId)`: Obtener agrupación con partículas

## Uso

```javascript
import { ApiClient } from './client.js';
import { BloquesApi, ParticlesApi } from './endpoints/index.js';

// Crear cliente base
const client = new ApiClient('/api/v1');

// Crear APIs específicos
const bloquesApi = new BloquesApi(client);
const particlesApi = new ParticlesApi(client);

// Usar APIs
const bloques = await bloquesApi.getDimensions();
const particles = await particlesApi.getParticles(bloqueId, viewport);
```

## Referencias

- Ver `frontend/src/README.md` para información general

