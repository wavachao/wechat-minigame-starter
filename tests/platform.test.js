'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require.resolve('../src/platform'),'utf8');
function load(globals){const context={module:{exports:{}},require:id=>{if(id!=='./project-settings')throw new Error('Unexpected module');return require('../src/project-settings');},...globals};vm.runInNewContext(source,context);return context.module.exports.createPlatform();}
function audioFactory(list){return function(){const audio={plays:0,stops:0,pauses:0,onError(){},play(){this.plays++;return Promise.resolve();},stop(){this.stops++;},pause(){this.pauses++;}};list.push(audio);return audio;};}
test('WeChat platform handles touch, lifecycle, capsule-safe size, storage, RAF and sound',()=>{
  const callbacks={},values={},audios=[];const canvas={};let frame;
  const wx={createCanvas:()=>canvas,getWindowInfo:()=>({windowWidth:390,windowHeight:844,pixelRatio:4,safeArea:{top:44,bottom:810}}),getMenuButtonBoundingClientRect:()=>({bottom:88}),getStorageSync:k=>values[k],setStorageSync:(k,v)=>values[k]=v,createInnerAudioContext:audioFactory(audios)};
  for(const name of ['onTouchStart','onTouchMove','onTouchEnd','onTouchCancel','onHide','onShow','onWindowResize'])wx[name]=fn=>callbacks[name]=fn;
  const platform=load({wx,requestAnimationFrame:fn=>frame=fn});assert.equal(platform.createCanvas(),canvas);
  const size=platform.getSize();assert.equal(size.safeTop,96);assert.equal(size.safeBottom,34);assert.equal(size.dpr,3);
  assert.equal(platform.read('best',0),0);platform.write('best',150);assert.equal(platform.read('best',0),150);
  platform.write('sound',false);assert.equal(platform.read('sound',true),false);
  const points=[];let ups=0;platform.onPointer({down:(...p)=>points.push(['down',...p]),move:(...p)=>points.push(['move',...p]),up:()=>ups++});
  callbacks.onTouchStart({touches:[{clientX:100,clientY:200}]});callbacks.onTouchMove({touches:[{clientX:110,clientY:220}]});callbacks.onTouchStart({touches:[]});callbacks.onTouchEnd();callbacks.onTouchCancel();
  assert.deepEqual(points,[['down',100,200],['move',110,220]]);assert.equal(ups,2);
  let hides=0,shows=0,resizes=0;platform.onHide(()=>hides++);platform.onShow(()=>shows++);platform.onResize(()=>resizes++);
  callbacks.onHide();callbacks.onShow();callbacks.onWindowResize();assert.equal(hides+shows+resizes,3);
  const requested=()=>{};platform.requestFrame(requested);assert.equal(frame,requested);
  platform.unlockSound();assert.equal(audios.length,3);platform.play('catch');assert.equal(audios[0].src,'assets/catch.wav');assert.equal(audios[0].plays,1);assert.equal(audios[0].stops,1);platform.stopSound();assert.equal(audios[0].stops,2);
});
test('WeChat legacy size API fallback and stored zero remain usable',()=>{
  const platform=load({wx:{createCanvas(){},getSystemInfoSync:()=>({windowWidth:320,windowHeight:568,pixelRatio:1}),getStorageSync:()=>0}});
  const size=platform.getSize();assert.equal(size.width,320);assert.equal(size.safeTop,0);assert.equal(size.safeBottom,0);assert.equal(platform.read('best',99),0);
});
test('browser platform maps local pointer coordinates, lifecycle, storage, keyboard, audio and RAF',async()=>{
  const canvasEvents={},windowEvents={},docEvents={},values={},audios=[];let frame,capture;
  const canvas={getBoundingClientRect:()=>({left:10,top:20,width:390,height:720}),addEventListener:(k,v)=>canvasEvents[k]=v,setPointerCapture:id=>capture=id};
  const document={getElementById:()=>canvas,hidden:false,addEventListener:(k,v)=>{(docEvents[k]||= []).push(v);}};
  const window={devicePixelRatio:2,requestAnimationFrame:fn=>frame=fn,addEventListener:(k,v)=>windowEvents[k]=v};
  const localStorage={getItem:k=>values[k]??null,setItem:(k,v)=>values[k]=v};
  const platform=load({document,window,localStorage,Audio:audioFactory(audios)});assert.equal(platform.createCanvas(),canvas);
  assert.equal(platform.getSize().height,720);assert.equal(platform.getSize().dpr,2);
  platform.write('best',80);assert.equal(platform.read('best',0),80);platform.write('sound',false);assert.equal(platform.read('sound',true),false);
  values[require('../src/project-settings').storagePrefix+'best']='broken json';assert.equal(platform.read('best',123),123);
  const points=[];let ups=0;platform.onPointer({down:(...p)=>points.push(['down',...p]),move:(...p)=>points.push(['move',...p]),up:()=>ups++});
  canvasEvents.pointerdown({clientX:110,clientY:220,pointerId:7,preventDefault(){}});assert.equal(capture,7);
  canvasEvents.pointermove({clientX:120,clientY:240,buttons:1});canvasEvents.pointermove({clientX:999,clientY:999,buttons:0,pointerType:'mouse'});canvasEvents.pointerup();
  assert.deepEqual(points,[['down',100,200],['move',110,220]]);assert.equal(ups,1);
  const keys=[];platform.onKey((...args)=>keys.push(args));windowEvents.keydown({key:'Enter',repeat:false,preventDefault(){}});windowEvents.keydown({key:'Enter',repeat:true,preventDefault(){}});windowEvents.keyup({key:'Enter'});assert.deepEqual(keys,[['Enter',true],['Enter',false]]);
  let hides=0,shows=0,resizes=0;platform.onHide(()=>hides++);platform.onShow(()=>shows++);platform.onResize(()=>resizes++);
  document.hidden=true;docEvents.visibilitychange.forEach(fn=>fn());assert.equal(hides,1);assert.equal(shows,0);
  document.hidden=false;docEvents.visibilitychange.forEach(fn=>fn());windowEvents.blur();windowEvents.resize();assert.equal(shows,1);assert.equal(hides,2);assert.equal(resizes,1);
  const requested=()=>{};platform.requestFrame(requested);assert.equal(frame,requested);
  platform.unlockSound();await Promise.resolve();assert.equal(audios.length,3);assert.ok(audios.every(a=>a.pauses===1&&a.muted===false));platform.play('catch');assert.equal(audios[0].src,'../assets/catch.wav');assert.equal(audios[0].plays,2);platform.stopSound();assert.equal(audios[0].pauses,2);
});
