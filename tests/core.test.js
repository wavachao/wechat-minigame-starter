'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Game, GAME_SECONDS } = require('../src/core');
const started = () => { const g = new Game({ random: () => 0.5 }); g.start(); g.drainEvents(); return g; };
const drop = (g, type = 'star', extra = {}) => { g.items.push({ id: 100, type, x: g.player.x, y: g.player.y, r: 15, speed: 0, ...extra }); g.update(0.001); };

test('menu, start, pause, resume, and restart reset the round only', () => {
  const g = new Game({ best: 80 });
  assert.equal(g.state, 'menu'); g.update(2); assert.equal(g.elapsed, 0);
  g.start(); assert.deepEqual(g.drainEvents(), [{ type: 'start' }]);
  drop(g); g.update(1); g.pause(); const snapshot = [g.elapsed, g.score, g.items.length];
  g.update(20); assert.deepEqual([g.elapsed, g.score, g.items.length], snapshot);
  g.resume(); g.update(0.1); assert.ok(g.elapsed > snapshot[0]);
  g.start(); assert.equal(g.state, 'playing'); assert.equal(g.score, 0); assert.equal(g.lives, 3);
  assert.equal(g.combo, 0); assert.equal(g.remaining, GAME_SECONDS); assert.equal(g.best, 80);
  assert.equal(g.items.length, 0); assert.equal(g.particles.length, 0);
  g.home(); assert.equal(g.state, 'menu'); g.resume(); assert.equal(g.state, 'menu');
});

test('60 seconds end once, preserve best, and ignore invalid time deltas', () => {
  const g = started(); for (const dt of [0,-1,NaN,Infinity,undefined]) g.update(dt);
  assert.equal(g.remaining, 60); g.move(344); g.score = 140; g.update(100);
  assert.equal(g.state, 'result'); assert.ok(g.remaining < 1e-8); assert.equal(g.best, 140);
  const ends = g.drainEvents().filter(e => e.type === 'end');
  assert.equal(ends.length, 1); assert.equal(ends[0].newBest, true); assert.equal(ends[0].reason, 'time');
  g.update(100); assert.equal(g.drainEvents().length, 0);
  g.start(); g.move(344); g.update(60); assert.equal(g.best, 140);
});

test('catch combo earns a bounded bonus and missed stars reset combo', () => {
  const g = started(); for (let i=0;i<5;i++) drop(g);
  assert.equal(g.score, 55); assert.equal(g.combo, 5); assert.ok(g.particles.length > 0);
  for(let i=0;i<30;i++) drop(g);
  const events=g.drainEvents().filter(e=>e.type==='catch'); assert.equal(events.at(-1).points, 30);
  g.items=[{type:'star',x:0,y:800,r:15,speed:0}];g.update(0.01);assert.equal(g.combo,0);
});

test('multiple rocks share hit immunity and third separated hit ends the game', () => {
  const g=started();drop(g);g.items=[];
  drop(g,'rock');assert.equal(g.lives,2);assert.equal(g.combo,0);
  drop(g,'rock');assert.equal(g.lives,2);
  for(let i=0;i<2;i++){g.update(1.2);g.items=[];drop(g,'rock');}
  assert.equal(g.lives,0);assert.equal(g.state,'result');
  const events=g.drainEvents();assert.equal(events.filter(e=>e.type==='hit').length,3);
  assert.equal(events.filter(e=>e.type==='end').length,1);assert.equal(events.at(-1).reason,'lives');
});

test('large frames catch moving objects crossing the basket and reject near misses', () => {
  const g=started();g.items=[{type:'star',x:195,y:400,r:15,speed:900}];g.update(0.5);assert.equal(g.score,10);
  g.items=[{type:'star',x:260,y:400,r:15,speed:900}];g.update(0.5);assert.equal(g.score,10);
});

test('movement clamps basket bounds, rejects invalid input, and pauses movement', () => {
  const g=started();g.move(-100);assert.equal(g.player.x,46);g.move(1000);assert.equal(g.player.x,344);
  g.move(NaN);assert.equal(g.player.x,344);g.pause();g.move(195);assert.equal(g.player.x,344);
});

test('seeded simulation is repeatable, bounded, and ramps speed over time', () => {
  function simulate(){let s=42;const random=()=>((s=(s*1664525+1013904223)>>>0)/4294967296);const g=new Game({random});g.start();g.move(46);g.update(12);return g;}
  const a=simulate(),b=simulate();assert.deepEqual(a.items,b.items);assert.equal(a.score,b.score);
  assert.ok(a.items.length<15);assert.ok(a.items.every(i=>i.x>=34 && i.x<=356));
  const g=started();g.update(.5);const initial=g.items[0].speed;g.elapsed=45;g.remaining=15;g.items=[];g.update(.8);
  assert.ok(g.items[0].speed>initial);
});

