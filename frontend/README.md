# Frontend - Visualizador 3D

Frontend simple para visualizar partículas en 3D usando Three.js.

## Características

- Visualización 3D de partículas como cubos
- Colores según tipo de partícula (hierba, madera, hojas, etc.)
- Controles de cámara (rotar, zoom, mover)
- Carga automática de la dimensión demo

## Cómo usar

### Requisitos Previos

**IMPORTANTE**: El backend debe estar corriendo primero.

1. Levantar backend con Docker (desde la raíz del proyecto):
   ```bash
   docker-compose up -d
   ```

2. Verificar que el backend funciona:
   ```bash
   curl http://localhost:8000/health
   ```

### Levantar Frontend (RECOMENDADO: Docker)

**El frontend corre automáticamente con Docker (nginx)** cuando ejecutas `docker-compose up -d` desde la raíz del proyecto.

**Solo abre en navegador:** **http://localhost:8080**

**Ventajas de usar Docker/nginx:**
- Todo levantado con un solo comando
- Más rápido y robusto que servidores simples
- Configuración lista para producción
- Proxy automático al backend (no necesitas configurar CORS manualmente)

### Levantar Frontend (Desarrollo Local - Opcional)

Si prefieres servir el frontend localmente (sin Docker):

**IMPORTANTE**: El frontend es **HTML/JavaScript puro**. NO es Python.

**El frontend en sí es:**
- `index.html` - Archivo HTML
- `src/main.js` - JavaScript puro
- `src/api.js` - JavaScript puro
- `src/scene.js` - JavaScript puro (Three.js)

**Opciones para servir el frontend localmente:**

```bash
# Desde la carpeta frontend
cd frontend

# Opción 1: Node.js
npx --yes http-server -p 8080

# Opción 2: Python (si tienes Python instalado)
python -m http.server 8080

# Opción 3: PHP (si tienes PHP instalado)
php -S localhost:8080
```

**Nota**: 
- El frontend requiere que el backend esté corriendo en http://localhost:8000
- Si usas Docker, el frontend ya está configurado para conectarse al backend

### Opción 2: Con Docker (opcional)

Puedes agregar un servicio nginx al docker-compose si prefieres.

## Estructura

```
frontend/
├── index.html          # HTML principal
├── src/
│   ├── main.js         # Lógica principal
│   ├── api.js          # Cliente API
│   └── scene.js        # Configuración Three.js
└── README.md
```

## Controles

- **Click izquierdo + Arrastrar**: Rotar cámara
- **Rueda del mouse**: Zoom in/out
- **Click derecho + Arrastrar**: Mover cámara

## Colores de Partículas

- **Hierba**: Verde claro
- **Madera**: Marrón
- **Hojas**: Verde oscuro
- **Tierra**: Beige
- **Piedra**: Gris
- **Agua**: Azul

## Notas

- Requiere que el backend esté corriendo en http://localhost:8000
- Usa ES6 modules, requiere servidor HTTP (no funciona con file://)
- Three.js se carga desde CDN (no requiere npm install)

