# Módulo Components

Este módulo contiene componentes reutilizables de UI y entidades.

## Estructura

```
components/
├── ui/                    # Componentes UI reutilizables
│   ├── button.js
│   ├── panel.js
│   ├── loading.js
│   └── info-panel.js
└── entities/              # Componentes de entidades
    ├── tree-view.js
    └── entity-info.js
```

## Componentes UI

### Button (`ui/button.js`)
Botón reutilizable con estilos y eventos configurables.

### Panel (`ui/panel.js`)
Panel contenedor con título y contenido.

### Loading (`ui/loading.js`)
Indicador de carga con mensaje configurable.

### InfoPanel (`ui/info-panel.js`)
Panel de información con datos de dimensión, partículas, estado.

## Componentes de Entidades

### TreeView (`entities/tree-view.js`)
Vista especializada para árboles (futuro).

### EntityInfo (`entities/entity-info.js`)
Información detallada de una entidad (futuro).

## Patrón de Componentes

Todos los componentes siguen este patrón:

```javascript
export class Component {
    constructor(options) {
        // Inicialización
    }
    
    render(container) {
        // Crear y agregar al DOM
    }
    
    update(data) {
        // Actualizar contenido
    }
    
    destroy() {
        // Limpiar y remover del DOM
    }
}
```

## Uso

```javascript
import { Panel, Loading, InfoPanel } from './components/index.js';

// Crear panel
const panel = new Panel({
    title: 'Información',
    content: 'Contenido del panel'
});
panel.render(document.body);

// Crear loading
const loading = new Loading('Cargando...');
loading.render(document.body);

// Actualizar
loading.update('Casi listo...');

// Destruir
loading.destroy();
```

## Referencias

- Ver `frontend/src/README.md` para información general

