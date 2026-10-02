'use strict';
const { Game } = require('./core');
const { Renderer } = require('./renderer');

function boot(platform) {
  const canvas = platform.createCanvas();
  const game = new Game({ best: Number(platform.read('best', 0)) || 0 });
  const renderer = new Renderer(canvas);
  let sound = platform.read('sound', true) !== false;
  let last = null;
  let dragging = false;
  let keyDirection = 0;
  const resize = () => {
    const size = platform.getSize();
    renderer.resize(size.width, size.height, size.dpr, size.safeTop, size.safeBottom);
  };
  const action = (name) => {
    switch (name) {
      case 'start': case 'restart': platform.unlockSound(); game.start(); last = null; break;
      case 'sound': sound = !sound; platform.write('sound', sound); if (sound) { platform.unlockSound(); platform.play('catch'); } break;
      case 'pause': game.pause(); break;
      case 'resume': game.resume(); last = null; break;
      case 'home': game.home(); break;
    }
  };
  platform.onPointer({
    down(x, y) {
      const target = renderer.hitTest(x, y, game.state);
      if (target) { action(target); dragging = false; }
      else if (game.state === 'playing') { dragging = true; game.move(renderer.toGameX(x)); }
    },
    move(x) { if (dragging && game.state === 'playing') game.move(renderer.toGameX(x)); },
    up() { dragging = false; }
  });
  platform.onKey((key, pressed) => {
    if (key === 'ArrowLeft' || key === 'a') keyDirection = pressed ? -1 : (keyDirection < 0 ? 0 : keyDirection);
    if (key === 'ArrowRight' || key === 'd') keyDirection = pressed ? 1 : (keyDirection > 0 ? 0 : keyDirection);
    if (pressed && (key === 'Escape' || key === 'p')) action(game.state === 'playing' ? 'pause' : game.state === 'paused' ? 'resume' : null);
    if (pressed && (key === 'Enter' || key === ' ')) {
      if (game.state === 'menu' || game.state === 'result') action('start');
      else if (game.state === 'paused') action('resume');
    }
  });
  platform.onHide(() => { game.pause(); dragging = false; keyDirection = 0; last = null; platform.stopSound(); });
  platform.onShow(() => { resize(); last = null; });
  platform.onResize(resize);
  resize();
  function frame(now) {
    const dt = last === null ? 0 : Math.max(0, Math.min((now - last) / 1000, 0.1));
    last = now;
    if (game.state === 'playing' && keyDirection) game.move(game.player.x + keyDirection * 400 * dt);
    game.update(dt);
    for (const event of game.drainEvents()) {
      if (event.type === 'end') platform.write('best', game.best);
      if (sound && (event.type === 'catch' || event.type === 'hit' || event.type === 'end')) platform.play(event.type);
    }
    renderer.draw(game, { sound });
    platform.requestFrame(frame);
  }
  platform.requestFrame(frame);
  return { game, renderer };
}
module.exports = { boot };
