# Instrucciones para Probar JDG-010 - Personaje Jugable

## Pasos para Probar

### 1. Levantar el Proyecto

Desde la raíz del proyecto (`juego-de-dioses`):

```bash
docker-compose up -d
```

Esto levanta:
- PostgreSQL (puerto 5432)
- Redis (puerto 6379)
- Backend API FastAPI (puerto 8000)
- Frontend (nginx, puerto 8080)

### 2. Verificar que el Backend está Corriendo

```bash
# Health check
curl http://localhost:8000/health

# Ver logs del backend (opcional)
docker-compose logs -f backend
```

### 3. Abrir el Frontend

Abre tu navegador y ve a:

**http://localhost:8080**

### 4. Probar el Personaje Jugable

Una vez que el juego carga, deberías ver:

1. **El terreno 3D** con partículas (tierra, árboles, etc.)
2. **Un personaje humano** (cilindro marrón con cabeza) en la posición inicial (80, 80, 1)

#### Controles del Personaje

**Movimiento:**
- **W** o **Flecha Arriba**: Mover hacia adelante
- **S** o **Flecha Abajo**: Mover hacia atrás
- **A** o **Flecha Izquierda**: Mover hacia la izquierda
- **D** o **Flecha Derecha**: Mover hacia la derecha

**Acciones:**
- **Shift** (mantener): Correr (más rápido)
- **Espacio**: Saltar (solo si está en el suelo)
- **Ctrl** o **C**: Agacharse (reduce altura)
- **Click Izquierdo**: Golpear
- **Click Derecho** o **E**: Agarrar

**Cámara:**
- La cámara sigue automáticamente al personaje en modo tercera persona
- OrbitControls está deshabilitado cuando el jugador está activo

### 5. Verificar Funcionalidades

#### ✅ Movimiento Básico
- [ ] El personaje se mueve con WASD
- [ ] El personaje se orienta hacia la dirección de movimiento
- [ ] El movimiento es fluido

#### ✅ Correr
- [ ] Mantener Shift + dirección hace que el personaje corra más rápido
- [ ] La velocidad aumenta visiblemente

#### ✅ Saltar
- [ ] Presionar Espacio hace que el personaje salte
- [ ] Solo salta si está en el suelo (no salta en el aire)
- [ ] El personaje cae después del salto

#### ✅ Agacharse
- [ ] Presionar Ctrl o C reduce la altura del personaje
- [ ] Soltar Ctrl/C vuelve a altura normal
- [ ] El personaje puede moverse mientras está agachado

#### ✅ Física y Colisiones
- [ ] El personaje cae si no hay suelo debajo (gravedad)
- [ ] El personaje no atraviesa partículas sólidas (tierra, piedra)
- [ ] El personaje puede caminar sobre partículas sólidas
- [ ] El personaje se detiene al chocar con partículas sólidas

#### ✅ Cámara
- [ ] La cámara sigue al personaje cuando se mueve
- [ ] La cámara está posicionada detrás y arriba del personaje
- [ ] El movimiento de la cámara es suave

#### ✅ Animaciones
- [ ] El personaje tiene animación de balanceo al caminar
- [ ] El personaje tiene animación de balanceo al correr (más rápido)
- [ ] El personaje no se balancea cuando está quieto (idle)

### 6. Verificar en la Consola del Navegador

Abre la consola del navegador (F12) y verifica:

1. **No hay errores** en la consola
2. **Mensajes de performance** aparecen cada segundo (FPS, Draw Calls)
3. **El jugador se crea correctamente** (debería haber un mensaje o no errores)

### 7. Problemas Comunes

#### El personaje no aparece
- Verifica que el backend está corriendo: `curl http://localhost:8000/health`
- Abre la consola del navegador (F12) y busca errores
- Verifica que la dimensión demo se cargó correctamente

#### El personaje no se mueve
- Verifica que el InputManager está funcionando (abre consola, no debería haber errores)
- Verifica que los sistemas ECS están registrados correctamente
- Revisa la consola del navegador para errores de JavaScript

#### La cámara no sigue al personaje
- Verifica que el CameraController está inicializado
- Verifica que el playerId está configurado correctamente
- Revisa la consola del navegador para errores

#### Colisiones no funcionan
- Verifica que el CollisionSystem está registrado
- Verifica que hay partículas sólidas en el terreno
- Revisa la consola del navegador para errores de consulta de partículas

### 8. Detener el Proyecto

Cuando termines de probar:

```bash
# Detener todos los servicios
docker-compose down

# O detener y eliminar volúmenes (limpiar BD)
docker-compose down -v
```

## Comandos Útiles

```bash
# Ver logs del backend
docker-compose logs -f backend

# Ver logs del frontend
docker-compose logs -f frontend

# Reiniciar backend
docker-compose restart backend

# Reconstruir todo
docker-compose build --no-cache
docker-compose up -d
```

## Notas

- El personaje aparece en la posición (80, 80, 1) en celdas
- El terreno demo tiene partículas sólidas (tierra) y no sólidas (aire)
- El personaje puede caer si no hay suelo, pero será teleportado a una posición segura si cae fuera del terreno
- Las animaciones son simples (balanceo) por ahora, se pueden mejorar con modelos 3D en el futuro

