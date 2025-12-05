# Módulo API

Este módulo contiene el cliente API modular organizado por recurso.

## Estructura

```
api/
├── client.js            # Cliente base con configuración
└── endpoints/          # Endpoints por recurso
    ├── dimensions.js
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

### DimensionsApi (`endpoints/dimensions.js`)
Endpoints específicos para dimensiones.

**Métodos:**
- `getDimensions()`: Listar todas las dimensiones
- `getDimension(dimensionId)`: Obtener dimensión específica

### ParticlesApi (`endpoints/particles.js`)
Endpoints específicos para partículas.

**Métodos:**
- `getParticles(dimensionId, viewport)`: Obtener partículas por viewport
- `getParticleTypes(dimensionId, viewport)`: Obtener tipos de partículas con estilos

### AgrupacionesApi (`endpoints/agrupaciones.js`)
Endpoints específicos para agrupaciones.

**Métodos:**
- `getAgrupaciones(dimensionId)`: Listar agrupaciones
- `getAgrupacion(dimensionId, agrupacionId)`: Obtener agrupación con partículas

## Uso

```javascript
import { ApiClient } from './client.js';
import { DimensionsApi, ParticlesApi } from './endpoints/index.js';

// Crear cliente base
const client = new ApiClient('/api/v1');

// Crear APIs específicos
const dimensionsApi = new DimensionsApi(client);
const particlesApi = new ParticlesApi(client);

// Usar APIs
const dimensions = await dimensionsApi.getDimensions();
const particles = await particlesApi.getParticles(dimensionId, viewport);
```

## Referencias

- Ver `frontend/src/README.md` para información general

