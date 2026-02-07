# Frontend - Visualizador 3D - Cliente (rendering, ECS, adapters, domain)

Frontend está diseñado como cliente estático (servido por nginx / Docker) que renderiza el mundo en 3D usando Three.js y un patrón ECS. Con una arquitectura hexagonal organizado en capas de rendering, adaptadores (adapters), modelos de dominio y contratos (ports).

## Responsabilidad

- Rendering y escena (Three.js)
- Sistemas ECS para lógica de entidades y helpers (armas, combate, input)
- Gestión de dominio puro (modelos en `frontend/src/domain/`)
- Adapters para comunicación con backend (`frontend/src/adapters/`)
- Definición de ports/contratos (`frontend/src/ports/`) para invertir dependencias
- Configuración y optimizaciones (partículas, performance)

## Cómo levantar

### Requisitos Previos

- Backend corriendo en http://localhost:8000 (recomendado levantar con Docker Compose desde la raíz).

### Levantar (recomendado: Docker)

Desde la raíz del proyecto:

```bash
docker-compose up -d
```

El frontend estará disponible en http://localhost:8080

### Desarrollo local (opcional)

Si necesitas servir localmente (sin Docker), usar un servidor estático desde la carpeta `frontend/` es suficiente:

```bash
cd frontend
npx --yes http-server -p 8080
```

Nota: el frontend usa ES6 modules y espera un servidor HTTP (no funciona con file://).

## Estructura (resumen)

```
frontend/
├── index.html
├── src/
│   ├── rendering/      # escenas, terrain, optimizations, loaders
│   ├── rendering/ecs/  # sistemas ECS, domains (combat, input, physics, animation)
│   ├── adapters/       # http adapters y otros adapters concretos
│   ├── domain/         # modelos puros y lógica de dominio
│   ├── ports/          # contratos (JSDoc typedefs)
│   ├── config/         # parámetros de optimización y constantes
│   └── debug/          # herramientas de debug
└── README.md
```

## Controles rápidos

- Click izquierdo + Arrastrar: Rotar cámara
- Rueda del mouse: Zoom
- Click derecho + Arrastrar: Mover cámara

## Notas técnicas

- El frontend usa módulos ES (import/export). Asegurar que el servidor estático respeta rutas relativas.
- Las abstracciones importantes están en `frontend/src/ports/` (contracts) y `frontend/src/adapters/` (implementaciones). Documentar cualquier cambio de contrato.
- Para cambios de bootstrap (creación de ports/adapters), actualizar `driving/game/game-bootstrap.js` o el entrypoint correspondiente.

Si quieres, actualizo también los README internos (`frontend/src/rendering/README.md`, `frontend/src/ports/README.md`, etc.) en la siguiente pasada según el plan JDG-069.

