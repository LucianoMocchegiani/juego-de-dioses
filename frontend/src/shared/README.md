# Shared

Utilidades puras sin dependencias de state ni driving. Usadas por domain, application, rendering y adapters.

## Contenido

- **math.js** – clamp, lerp, map, roundTo, inRange
- **geometry.js** – calculateBoundingBox, calculateCenter, calculateSize
- **colors.js** – increaseBrightness, parseColor, colorToHexString, hexStringToColor
- **helpers.js** – formatNumber, formatBytes, debounce, throttle, generateId, isNullOrUndefined, defaultValue
- **config.js** – getBackendBaseUrl, API_BASE_URL (detección de entorno y URLs del backend)
- **cursor-manager.js** – cursorManager (ocultar/mostrar cursor, centrado)

weapon-attachment.js y weapon-utils.js siguen en utils/ (dependen de loaders/ECS o se usan desde interfaces).
