/**
 * Exhibition idle watcher: if nobody touches the game for a while, reset to the title (or start
 * the attract demo). Any pointer or key input restarts the countdown.
 */
export class IdleWatcher {
  constructor(scene, seconds, onIdle) {
    this.scene = scene;
    this.seconds = seconds;
    this.onIdle = onIdle;
    this.left = seconds;
    this.fired = false;
    const reset = () => this.reset();
    scene.input.on('pointerdown', reset);
    scene.input.on('pointermove', reset);
    scene.input.keyboard?.on('keydown', reset);
    scene.events.once('shutdown', () => {
      scene.input.off('pointerdown', reset);
      scene.input.off('pointermove', reset);
      scene.input.keyboard?.off('keydown', reset);
    });
  }

  reset() {
    this.left = this.seconds;
    this.fired = false;
  }

  update(dt) {
    if (this.fired) return;
    this.left -= dt;
    if (this.left <= 0) {
      this.fired = true;
      this.onIdle();
    }
  }
}
