# Sistema de Combos

Este módulo implementa el sistema de combos para el sistema de combate del juego.

## Propósito

Proporcionar un sistema de combos que permite ejecutar secuencias de ataques con inputs consecutivos, detectando patrones de input y ejecutando animaciones correspondientes.

## Componentes

### InputBuffer
Almacena inputs recientes con timestamp para permitir detección de combos con ventana temporal. Limpia automáticamente inputs antiguos para evitar acumulación de memoria.

### ComboChain
Representa una secuencia de combo (pasos de ataque). Cada combo tiene:
- Secuencia de inputs requeridos
- Animaciones correspondientes a cada paso
- Timing windows para cada paso
- Tipos de armas compatibles

### ComboManager
Gestiona detección y ejecución de combos. Procesa inputs del usuario y detecta si coinciden con alguna secuencia de combo configurada.

## Flujo de Ejecución

```
1. Usuario presiona inputs (clicks, combinaciones)
   ↓
2. InputBuffer almacena inputs con timestamp
   ↓
3. ComboManager detecta si la secuencia coincide con algún combo configurado
   ↓
4. Si coincide, inicia el combo y ejecuta animaciones en secuencia
   ↓
5. ComboSystem actualiza ComboComponent con el estado del combo
   ↓
6. AnimationStateSystem lee ComboComponent para determinar animación
```

## Uso

Los combos se definen en `../config/combo-config.js` y se procesan automáticamente por `ComboSystem`.

### Ejemplo de Configuración de Combo

```javascript
{
    id: 'basic_combo_3hit',
    steps: [
        { input: 'click', animation: 'left_slash', timing: 500 },
        { input: 'click', animation: 'attack', timing: 400 },
        { input: 'click', animation: 'double_blade_spin', timing: 600 }
    ],
    cancelable: false,
    weaponTypes: ['sword', 'generic']
}
```

## Archivos

- `input-buffer.js` - Clase InputBuffer para almacenar inputs temporales
- `combo-chain.js` - Clase ComboChain que representa una secuencia de combo
- `combo-manager.js` - Clase ComboManager que gestiona detección y ejecución
- `index.js` - Exportaciones del módulo

## Integración

Este módulo se integra con:
- **ComboSystem** (`../../systems/combo-system.js`): Sistema ECS que usa este módulo
- **ComboComponent** (`../../components/combo.js`): Componente que almacena estado de combos
- **AnimationStateSystem**: Lee ComboComponent para determinar estados de animación

## Referencias

- **Análisis de Arquitectura**: `instructions/analysis/JDG-021-architecture-analysis_2025-12-10_09-58-53.md`
- **Ticket**: `instructions/tickets/JDG-021_work-ticket_2025-12-10_09-58-53.md`
- **Plan de Acción**: `instructions/tasks/JDG-021-action-plan_2025-12-10_11-34-53.md`

