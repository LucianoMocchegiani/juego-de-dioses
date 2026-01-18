# Helpers de Armas

Esta carpeta contiene helpers especializados para el sistema de equipamiento de armas del ECS. Estos helpers extraen responsabilidades específicas del `WeaponEquipSystem` para mejorar legibilidad, mantenibilidad y testabilidad.

## Helpers Disponibles

### `weapon-model-inspector.js` - WeaponModelInspector

**Responsabilidad:** Inspección y análisis de estructura de modelos de armas GLB.

**Métodos:**
- `inspectWeaponModel(model, modelUrl, objectPool)` - Analiza la estructura completa de un modelo de arma, incluyendo jerarquía, transformaciones, meshes y grupos.

**Dependencias:**
- Three.js (Object3D, Vector3, Quaternion, Euler)
- Object Pool opcional (optimización JDG-047)

### `weapon-model-loader.js` - WeaponModelLoader

**Responsabilidad:** Carga de modelos de armas desde archivos GLB con gestión de cache y promesas.

**Métodos:**
- `loadWeaponModel(weaponConfigPath)` - Carga un modelo de arma desde archivo GLB, usando cache y evitando cargas duplicadas con gestión de promesas.

**Dependencias:**
- `models/model-loader.js` (ModelLoader)
- `models/model-cache.js` (ModelCache)
- `utils/config.js` (getBackendBaseUrl)
- `debug/logger.js` (debugLogger)
- `weapon-model-inspector.js` (WeaponModelInspector)

### `weapon-attachment-manager.js` - WeaponAttachmentManager

**Responsabilidad:** Adjuntar y desequipar armas al personaje.

**Métodos:**
- `attachWeapon(weaponModel, characterMesh, weaponConfig)` - Adjunta un arma al personaje usando bones del esqueleto.
- `unequipWeapon(weaponModel, scene)` - Desequipa un arma del personaje.

**Dependencias:**
- `utils/weapon-attachment.js` (attachWeaponToCharacter, detachWeaponFromCharacter)
- `debug/logger.js` (debugLogger)

## Principios de Diseño

1. **Independencia del ECS:** Los helpers reciben componentes como parámetros, NO buscan en el ECS directamente.
2. **Una responsabilidad:** Cada helper maneja una responsabilidad única y clara.
3. **Testabilidad:** Los helpers pueden testearse independientemente sin necesidad del ECS completo.
4. **Reutilización:** Los helpers pueden ser reutilizados por otros sistemas si es necesario.

## Uso

Los helpers son instanciados y usados por el `WeaponEquipSystem`, que actúa como orquestador:

```javascript
// En WeaponEquipSystem
constructor(scene) {
    const modelLoader = new ModelLoader();
    const weaponCache = ModelCache.getInstance();
    const weaponInspector = new WeaponModelInspector();
    this.weaponModelLoader = new WeaponModelLoader(modelLoader, weaponCache, weaponInspector);
    this.weaponAttachmentManager = new WeaponAttachmentManager();
}
```

## Notas

- Esta estructura fue creada como parte de JDG-058 para refactorizar `WeaponEquipSystem` (628 líneas → ~200-250 líneas).
- Los helpers mantienen la misma funcionalidad que el código original, solo reorganizados para mejor legibilidad.
- Para modificaciones futuras, trabajar en el helper específico en lugar del sistema completo.
- El Object Pool se pasa como parámetro opcional para mantener la optimización JDG-047.
