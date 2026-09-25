/**
 * Test/debug hooks. Only installed when the URL contains `?debug` or `?test` (Playwright uses
 * `?test`). The shipped game exposes nothing on `window` otherwise.
 */
export function installDebugHooks(game) {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('debug') && !params.has('test')) return;
  const api = {
    game,
    params,
    errors: [],
    /** Name of the scenes currently running (top of the display order last). */
    activeScenes: () => game.scene.getScenes(true).map((s) => s.scene.key),
    scene: (key) => game.scene.getScene(key)
  };
  window.addEventListener('error', (e) => api.errors.push(String(e.message || e)));
  window.addEventListener('unhandledrejection', (e) => api.errors.push(String(e.reason)));
  window.__NEXUS__ = api;
}

/** Register extra hooks from scenes (e.g. the simulation handle) when debug is enabled. */
export function exposeDebug(name, value) {
  if (window.__NEXUS__) window.__NEXUS__[name] = value;
}
