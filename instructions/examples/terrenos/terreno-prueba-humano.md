# Terreno de Prueba - Primer Humano

## Descripción
Terreno simple de 40x40 metros diseñado para facilitar la creación del primer humano del juego.

## Características
- Tamaño: 40x40 metros (400x400 celdas con celda de 0.1m)
- Terreno plano con una montaña pequeña
- Capa base de piedra (z=-4)
- Capas de tierra (z=-3 a z=-1)
- Superficie de hierba (z=0)
- Un lago de agua (8x8 metros) en el centro
- Una montaña pequeña (4x4 metros base, 4 niveles de altura) hecha con tierra y piedra
- 10 árboles distribuidos estratégicamente

## Cómo Ejecutar
```bash
docker-compose exec backend python -m src.database.seed_human_test
```

## Nombre de la Dimensión
"Terreno de Prueba - Primer Humano"

## Recursos Disponibles
- Agua: En el lago (8x8 metros)
- Madera: En los 10 árboles
- Hierba: En toda la superficie (excepto lago y montaña)
- Tierra: En el subsuelo y en la montaña
- Piedra: En la capa base y en la montaña

## Estructura del Terreno

### Capas Base
- **z=-4**: Capa de piedra sólida (base del terreno)
- **z=-3 a z=-1**: Capas de tierra (subsuelo)
- **z=0**: Superficie de hierba (excepto donde está el lago y la montaña)

### Lago
- **Ubicación**: Centro del terreno
- **Tamaño**: 8x8 metros (80x80 celdas)
- **Profundidad**: 2 niveles (z=0 y z=1)
- **Tipo**: Agua líquida

### Montaña
- **Ubicación**: Esquina superior derecha
- **Tamaño base**: 4x4 metros (40x40 celdas)
- **Altura**: 4 niveles (z=1 a z=4)
- **Forma**: Cónica (se reduce 20% por nivel)
- **Composición**: 
  - Base (z=1): 70% tierra, 30% piedra
  - Niveles superiores (z=2-4): 50% tierra, 50% piedra

### Árboles
- **Cantidad**: Exactamente 10 árboles
- **Distribución**: Esparcidos por el terreno
- **Espaciado mínimo**: 4 metros entre árboles
- **Evitan**: Lago y montaña (con margen de seguridad)
- **Tipos**: Variedad de plantillas (Roble, Palmera, Paraíso)

## Propiedades de Partículas

| Tipo | Densidad | Temperatura | Energía | Estado | Notas |
|------|----------|-------------|---------|--------|-------|
| hierba | 0.3 | 20°C | 0.0 | solido | Superficie |
| tierra | 1.5 | 18°C | 0.0 | solido | Subsuelo y montaña |
| piedra | 2.5 | 15°C | 0.0 | solido | Base y montaña |
| agua | 1.0 | 15°C | 0.0 | liquido | Lago |
| madera | 0.6 | 20°C | 0.0 | solido | Troncos de árboles |
| hojas | 0.2 | 22°C | 0.0 | solido | Copas de árboles |

## Uso

Este terreno está diseñado específicamente para:
- Crear el primer humano del juego
- Probar sistemas de creación de entidades
- Probar interacciones básicas (agua, madera, tierra)
- Desarrollo y testing en un entorno controlado

## Notas

- El terreno es simple y controlado para facilitar pruebas
- El lago está centrado para fácil acceso
- La montaña está en la esquina superior derecha, lejos del lago
- Los árboles están distribuidos para evitar el lago y la montaña
- El script es idempotente: se puede ejecutar múltiples veces (elimina y recrea)

