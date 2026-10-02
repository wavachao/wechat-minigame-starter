'use strict';

const GAME_SECONDS = 60;
const STEP = 1 / 60;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/** Platform-independent simulation. Positions use a 390 by 720 logical canvas. */
class Game {
  constructor({ best = 0, random = Math.random } = {}) {
    this.width = 390;
    this.height = 720;
    this.random = random;
    this.best = Number.isFinite(best) ? Math.max(0, Math.floor(best)) : 0;
    this.state = 'menu';
    this.player = { x: 195, y: 630, width: 76, height: 34 };
    this.items = [];
    this.particles = [];
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.elapsed = 0;
    this.remaining = GAME_SECONDS;
    this.invulnerable = 0;
    this._events = [];
    this._nextId = 1;
    this._spawnIn = 0.45;
    this._lastStarX = 195;
    this._starCount = 0;
  }

  start() {
    this.state = 'playing';
    this.player.x = this.width / 2;
    this.items = [];
    this.particles = [];
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.elapsed = 0;
    this.remaining = GAME_SECONDS;
    this.invulnerable = 0;
    this._spawnIn = 0.45;
    this._lastStarX = this.width / 2;
    this._starCount = 0;
    this._events = [{ type: 'start' }];
  }

  move(x) {
    if (this.state === 'playing' && Number.isFinite(x)) {
      this.player.x = clamp(x, this.player.width / 2 + 8, this.width - this.player.width / 2 - 8);
    }
  }

  pause() { if (this.state === 'playing') this.state = 'paused'; }
  resume() { if (this.state === 'paused') this.state = 'playing'; }
  home() { this.state = 'menu'; this.items = []; this.particles = []; }
  drainEvents() { const events = this._events; this._events = []; return events; }

  update(dt) {
    if (this.state !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    // Small simulation steps prevent a fast frame from skipping the basket.
    let pending = Math.min(dt, this.remaining);
    while (pending > 1e-8 && this.state === 'playing') {
      const step = Math.min(STEP, pending);
      this._step(step);
      pending -= step;
    }
  }

  _rand() {
    const value = this.random();
    return Number.isFinite(value) ? clamp(value, 0, 0.999999999) : 0.5;
  }

  _step(dt) {
    this.elapsed = Math.min(GAME_SECONDS, this.elapsed + dt);
    this.remaining = Math.max(0, GAME_SECONDS - this.elapsed);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this._spawnIn -= dt;
    if (this._spawnIn <= 0 && this.remaining > 1.9) {
      this._spawn();
      this._spawnIn += 0.79 - 0.25 * (this.elapsed / GAME_SECONDS);
    }

    const survivors = [];
    for (const item of this.items) {
      item.y += item.speed * dt;
      item.rotation = (item.rotation || 0) + (item.spin || 0) * dt;
      if (this._collides(item)) {
        if (item.type === 'star') {
          this.combo += 1;
          const points = 10 + Math.min(20, Math.floor(this.combo / 5) * 5);
          this.score += points;
          this._burst(item.x, item.y, 'star');
          this._events.push({ type: 'catch', points, score: this.score, combo: this.combo, x: item.x, y: item.y });
        } else if (this.invulnerable <= 0) {
          this.lives -= 1;
          this.combo = 0;
          this.invulnerable = 1.15;
          this._burst(item.x, item.y, 'rock');
          this._events.push({ type: 'hit', lives: this.lives, x: item.x, y: item.y });
        }
        continue;
      }
      if (item.y - item.r > this.height) {
        if (item.type === 'star') this.combo = 0;
        continue;
      }
      survivors.push(item);
    }
    this.items = survivors;
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 140 * dt;
    }
    this.particles = this.particles.filter(particle => particle.life > 0);
    if (this.lives <= 0 || this.remaining <= 1e-8) this._finish();
  }

  _collides(item) {
    const basket = this.player;
    const nearestX = clamp(item.x, basket.x - basket.width / 2, basket.x + basket.width / 2);
    const nearestY = clamp(item.y, basket.y - basket.height / 2, basket.y + basket.height / 2);
    return (item.x - nearestX) ** 2 + (item.y - nearestY) ** 2 <= item.r ** 2;
  }

  _spawn() {
    const progress = this.elapsed / GAME_SECONDS;
    // The opening teaches catching; subsequent stars stay within a manageable reach.
    const type = this._starCount >= 4 && this._rand() < 0.24 ? 'rock' : 'star';
    const r = type === 'star' ? 15 : 18;
    let x;
    if (type === 'star') {
      x = clamp(this._lastStarX + (this._rand() - 0.5) * 230, 34, this.width - 34);
      this._lastStarX = x;
      this._starCount += 1;
    } else {
      x = 34 + this._rand() * (this.width - 68);
      // Do not overlap a falling star with a rock near the same vertical position.
      const nearbyStar = this.items.find(item => item.type === 'star' && item.y < 125 && Math.abs(item.x - x) < 90);
      if (nearbyStar) x = nearbyStar.x < this.width / 2 ? this.width - 38 : 38;
    }
    this.items.push({
      id: this._nextId++, type, x, y: -r - 8, r,
      speed: 200 + progress * 110 + this._rand() * 18,
      rotation: this._rand() * Math.PI * 2,
      spin: (this._rand() - 0.5) * 2,
    });
  }

  _burst(x, y, type) {
    for (let index = 0; index < 10; index += 1) {
      const angle = this._rand() * Math.PI * 2;
      const speed = 35 + this._rand() * 95;
      const life = 0.35 + this._rand() * 0.3;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 40,
        life, maxLife: life, r: 2 + this._rand() * 2, type, color: type === 'star' ? '#ffdc74' : '#ff887a' });
    }
  }

  _finish() {
    this.state = 'result';
    const previousBest = this.best;
    this.best = Math.max(this.best, this.score);
    this._events.push({ type: 'end', score: this.score, best: this.best,
      newBest: this.score > previousBest, reason: this.lives <= 0 ? 'lives' : 'time' });
  }
}

module.exports = { Game, GAME_SECONDS };
