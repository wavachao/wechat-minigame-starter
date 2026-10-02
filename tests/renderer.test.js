'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Renderer } = require('../src/renderer');
const { Game } = require('../src/core');
function mockCanvas() {
  const calls = [];
  const ctx = new Proxy({}, { get(target, key) {
    if (key in target) return target[key];
    target[key] = (...args) => {
      for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${key} has a nonfinite coordinate`);
      calls.push([key,...args]);
      if (key === 'createLinearGradient') return { addColorStop() {} };
    };
    return target[key];
  }});
  return { calls, canvas: { getContext: () => ctx } };
}
const sizes = [[390,720,1,0,0],[375,812,3,88,34],[430,932,2,96,34],[320,568,2,32,0],[1024,768,1,0,0]];
for (const [width,height,dpr,top,bottom] of sizes) test(`render and controls fit ${width}x${height} DPR ${dpr}`, () => {
  const { canvas,calls } = mockCanvas();
  const renderer = new Renderer(canvas);
  renderer.resize(width,height,dpr,top,bottom);
  assert.equal(canvas.width, width*dpr); assert.equal(canvas.height,height*dpr);
  assert.ok(renderer.left >= -1e-8 && renderer.top >= top-1e-8);
  assert.ok(renderer.top+720*renderer.scale <= height-bottom+1e-8);
  assert.ok(Math.abs(renderer.toGameX(renderer.left+195*renderer.scale)-195)<1e-8);
  const game = new Game(); game.start();
  game.items = [{id:1,type:'star',x:80,y:210,r:15,rotation:.3},{id:2,type:'rock',x:260,y:350,r:18}];
  game.particles = [{x:195,y:625,r:3,life:.3,maxLife:.6}]; game.combo=5; game.invulnerable=.8;
  for (const state of ['menu','playing','paused','result']) {
    game.state=state; renderer.draw(game,{sound:false});
    assert.ok(renderer.buttons.length);
    for(const button of renderer.buttons){
      const x=renderer.left+(button.x+button.w/2)*renderer.scale;
      const y=renderer.top+(button.y+button.h/2)*renderer.scale;
      assert.equal(renderer.hitTest(x,y,state),button.action);
      assert.equal(renderer.hitTest(x,y,'unrelated'),null);
      assert.ok(button.x >= 0 && button.y >= 0 && button.x+button.w <= 390 && button.y+button.h <= 720);
    }
  }
  assert.ok(calls.some(call=>call[0]==='rect'&&call[2]===138),'falling objects are clipped below the HUD');
});
test('state transitions discard obsolete controls and empty space stays inactive', () => {
  const {canvas}=mockCanvas(); const r=new Renderer(canvas); const game=new Game();
  r.draw(game); assert.equal(r.hitTest(195,580,'menu'),'start');
  game.start();r.draw(game);assert.equal(r.hitTest(195,580,'playing'),null);
  game.pause();r.draw(game);assert.equal(r.hitTest(340,45,'paused'),null);
  assert.equal(r.hitTest(-10,20,'paused'),null);assert.equal(r.hitTest(195,360,'paused'),'resume');
  game.home();r.draw(game);assert.equal(r.hitTest(195,360,'menu'),null);
});
test('all controls in each screen have non-overlapping hit rectangles', () => {
  const {canvas}=mockCanvas(); const r=new Renderer(canvas);const g=new Game();
  for(const state of ['menu','playing','paused','result']){
    g.state=state;r.draw(g);
    for(let i=0;i<r.buttons.length;i++)for(let j=i+1;j<r.buttons.length;j++){
      const a=r.buttons[i],b=r.buttons[j];
      assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,`${state}: ${a.action} overlaps ${b.action}`);
    }
  }
});

