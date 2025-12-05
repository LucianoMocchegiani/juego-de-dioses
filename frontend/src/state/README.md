# Módulo State

Este módulo contiene el sistema de gestión de estado centralizado.

## Estructura

```
state/
├── store.js      # Store centralizado
├── actions.js    # Acciones para modificar estado
└── selectors.js  # Selectores de estado
```

## Componentes

### Store (`store.js`)
Store centralizado simple (custom, no requiere Redux).

**Estado gestionado:**
- `currentDimension`: Dimensión actual cargada
- `currentParticles`: Partículas cargadas
- `viewport`: Viewport actual
- `loading`: Estado de carga
- `error`: Errores

**Métodos:**
- `getState()`: Obtener estado actual
- `setState(newState)`: Actualizar estado
- `subscribe(listener)`: Suscribirse a cambios

### Actions (`actions.js`)
Acciones para modificar estado de forma estructurada.

**Acciones disponibles:**
- `setDimension(store, dimension)`: Establecer dimensión actual
- `setParticles(store, particles)`: Establecer partículas
- `setLoading(store, loading)`: Establecer estado de carga
- `setError(store, error)`: Establecer error

### Selectors (`selectors.js`)
Selectores para acceder a partes específicas del estado.

**Selectores disponibles:**
- `getCurrentDimension(state)`: Obtener dimensión actual
- `getCurrentParticles(state)`: Obtener partículas
- `isLoading(state)`: Verificar si está cargando

## Uso

```javascript
import { Store } from './store.js';
import { actions } from './actions.js';
import { selectors } from './selectors.js';

// Crear store
const store = new Store();

// Suscribirse a cambios
const unsubscribe = store.subscribe((state) => {
    console.log('Estado actualizado:', state);
});

// Modificar estado con acciones
actions.setDimension(store, dimension);
actions.setParticles(store, particles);
actions.setLoading(store, true);

// Acceder a estado con selectores
const dimension = selectors.getCurrentDimension(store.getState());
const isLoading = selectors.isLoading(store.getState());

// Desuscribirse
unsubscribe();
```

## Referencias

- Ver `frontend/src/README.md` para información general

