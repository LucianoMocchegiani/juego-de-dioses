/**
 * Game loop: requestAnimationFrame; en cada frame llama a ecs.update(dt), terrain.update(dt), etc.
 * App.startAnimation() actualmente contiene este loop; cuando App exponga update(dt), este módulo puede llamarlo.
 *
 * Uso futuro:
 *   runGameLoop(app) -> cada frame app.update(deltaTime)
 * o
 *   runGameLoop({ ecs, terrain, cameraController, celestialRenderer, scene, inputManager }) -> actualizar cada uno
 */

/**
 * Ejecutar un frame del juego (para uso externo o testing)
 * @param {Object} app - Instancia de App con ecs, terrain, cameraController, etc.
 * @param {number} deltaTime - Tiempo desde el último frame en segundos
 */
export function runFrame(app, deltaTime) {
    if (app.ecs) app.ecs.update(deltaTime);
    if (app.cameraController) app.cameraController.update(app.ecs);
    if (app.terrain) app.terrain.updateForPlayerMovement?.()?.catch(() => {});
    if (app.inputManager) app.inputManager.clearFrame();
    if (app.scene?.renderer) app.scene.renderer.render(app.scene.scene, app.scene.camera.camera);
}
