'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {boot}=require('../src/main');
function harness(size={width:390,height:720,dpr:2,safeTop:0,safeBottom:0}){
 const gradient={addColorStop(){}};
 const ctx=new Proxy({}, {get(target,key){if(key in target)return target[key];if(key==='createLinearGradient')return()=>gradient;return()=>{};},set(target,key,value){target[key]=value;return true;}});
 const calls={writes:[],plays:[],unlocks:0,stops:0}; let callback;
 const platform={createCanvas:()=>({getContext:()=>ctx}),read:(key,fallback)=>key==='best'?25:fallback,
 write:(...args)=>calls.writes.push(args),play:name=>calls.plays.push(name),unlockSound:()=>calls.unlocks++,stopSound:()=>calls.stops++,
 getSize:()=>size,requestFrame:cb=>{callback=cb;},onPointer:handlers=>{platform.pointer=handlers;},onKey:fn=>{platform.key=fn;},
 onHide:fn=>{platform.hide=fn;},onShow:fn=>{platform.show=fn;},onResize:fn=>{platform.resize=fn;}};
 const app=boot(platform);
 return {...app,platform,calls,frame(now){callback(now);},click(x,y){platform.pointer.down(app.renderer.left+x*app.renderer.scale,app.renderer.top+y*app.renderer.scale);platform.pointer.up();}};
}
test('real renderer coordinates launch, drag, pause, resume, and restart',()=>{
 const h=harness({width:430,height:932,dpr:3,safeTop:44,safeBottom:34});h.frame(0);assert.equal(h.game.best,25);
 h.click(195,580);assert.equal(h.game.state,'playing');h.frame(16);
 h.platform.pointer.down(h.renderer.left+100*h.renderer.scale,h.renderer.top+400*h.renderer.scale);assert.equal(h.game.player.x,100);
 h.platform.pointer.move(h.renderer.left+300*h.renderer.scale);assert.ok(Math.abs(h.game.player.x-300)<1e-8);
 h.platform.pointer.up();h.platform.pointer.move(10);assert.ok(Math.abs(h.game.player.x-300)<1e-8);
 h.click(342,46);assert.equal(h.game.state,'paused');h.frame(1000);const elapsed=h.game.elapsed;
 h.click(195,360);assert.equal(h.game.state,'playing');h.frame(90000);assert.equal(h.game.elapsed,elapsed);
 h.game.elapsed=59.999;h.game.remaining=.001;h.frame(90016);assert.equal(h.game.state,'result');h.click(195,480);assert.equal(h.game.score,0);assert.equal(h.game.state,'playing');
});
test('sound toggle persists, muted catches stay quiet, and best persists at end',()=>{
 const h=harness();h.frame(0);h.click(320,45);assert.deepEqual(h.calls.writes,[['sound',false]]);
 h.click(195,580);h.frame(16);h.game.items=[{type:'star',x:195,y:630,r:15,speed:0}];h.frame(32);
 assert.equal(h.game.score,10);assert.equal(h.calls.plays.length,0);
 h.game.score=90;h.game.elapsed=59.999;h.game.remaining=.001;h.frame(48);assert.ok(h.calls.writes.some(([key,v])=>key==='best'&&v===90));
 h.click(320,45);assert.equal(h.calls.plays.at(-1),'catch');assert.equal(h.calls.writes.at(-1)[1],true);
});
test('visibility pauses gameplay, resets drag and held keys, and avoids stale delta on resume',()=>{
 const h=harness();h.frame(0);h.platform.key('Enter',true);h.frame(16);h.platform.key('ArrowRight',true);h.frame(32);
 h.platform.pointer.down(120,400);h.platform.hide();assert.equal(h.game.state,'paused');assert.equal(h.calls.stops,1);
 const elapsed=h.game.elapsed,x=h.game.player.x;h.frame(100000);assert.equal(h.game.elapsed,elapsed);
 h.platform.show();h.frame(200000);h.click(195,360);h.frame(300000);assert.equal(h.game.elapsed,elapsed);
 h.platform.pointer.move(300);h.frame(300016);assert.equal(h.game.player.x,x);
});
test('keyboard navigation clamps long frame time and drawing all screens is error free',()=>{
 const h=harness();h.frame(0);h.platform.key('Enter',true);h.frame(16);h.platform.key('a',true);h.frame(10016);
 assert.ok(h.game.elapsed<=.12);h.platform.key('a',false);h.platform.key('p',true);h.frame(10032);assert.equal(h.game.state,'paused');
 h.click(195,430);h.frame(10048);assert.equal(h.game.state,'menu');h.platform.resize();h.frame(10064);
});

