'use strict';
const projectSettings = require('./project-settings');

const W = 390, H = 720;
const C = { ink: '#f5f5ec', muted: '#9facbf', mint: '#95efce', gold: '#ffe099', navy: '#101c32' };

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.buttons = [];
    this.resize(W, H, 1);
  }
  resize(width, height, dpr = 1, safeTop = 0, safeBottom = 0) {
    this.width = width; this.height = height; this.dpr = dpr || 1;
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.scale = Math.min(width / W, Math.max(1, height - safeTop - safeBottom) / H);
    this.left = (width - W * this.scale) / 2;
    this.top = safeTop + (height - safeTop - safeBottom - H * this.scale) / 2;
  }
  toGameX(x) { return (x - this.left) / this.scale; }
  hitTest(x, y, state) {
    x = this.toGameX(x); y = (y - this.top) / this.scale;
    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const b = this.buttons[i];
      if (b.state === state && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action;
    }
    return null;
  }
  rounded(x, y, w, h, r = 16) {
    const c = this.ctx; r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  text(str, x, y, size = 16, color = C.ink, align = 'left', weight = 400) {
    const c = this.ctx; c.fillStyle = color; c.font = `${weight} ${size}px sans-serif`;
    c.textAlign = align; c.textBaseline = 'middle'; c.fillText(String(str), x, y);
  }
  pill(x, y, w, h, color) { this.rounded(x, y, w, h, h / 2); this.ctx.fillStyle = color; this.ctx.fill(); }
  button(action, label, x, y, w, h, state, primary = false) {
    const c = this.ctx;
    this.buttons.push({ action, x, y, w, h, state });
    if (primary) {
      c.save(); c.shadowColor = 'rgba(149,239,206,.18)'; c.shadowBlur = 20; c.shadowOffsetY = 6;
      this.pill(x, y, w, h, C.mint); c.restore();
    } else {
      this.rounded(x, y, w, h, 18); c.fillStyle = 'rgba(255,255,255,.045)'; c.fill();
      c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 1; c.stroke();
    }
    this.text(label, x + w / 2, y + h / 2, 16, primary ? '#16382f' : C.ink, 'center', 600);
  }
  star(x, y, r, angle = 0, alpha = 1) {
    const c = this.ctx; c.save(); c.translate(x, y); c.rotate(angle); c.globalAlpha = alpha;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .48 : r;
      const xx = Math.cos(a) * rr, yy = Math.sin(a) * rr;
      if (!i) c.moveTo(xx, yy); else c.lineTo(xx, yy);
    }
    c.closePath(); c.fillStyle = C.gold; c.shadowColor = 'rgba(255,218,134,.38)'; c.shadowBlur = r * .75; c.fill();
    c.shadowBlur = 0; c.fillStyle = 'rgba(255,255,255,.38)'; c.beginPath(); c.arc(-r * .17, -r * .3, r * .1, 0, Math.PI * 2); c.fill(); c.restore();
  }
  rock(x, y, r) {
    const c = this.ctx; c.save(); c.translate(x, y); c.beginPath();
    [[-.82,-.48],[-.2,-1],[.65,-.7],[1,.08],[.55,.84],[-.38,1],[-.94,.33]].forEach((p,i) => {
      if (!i) c.moveTo(p[0]*r,p[1]*r); else c.lineTo(p[0]*r,p[1]*r);
    }); c.closePath(); c.fillStyle = '#8d93a4'; c.fill();
    c.fillStyle = '#afb5c2'; c.beginPath(); c.moveTo(-r*.82,-r*.48); c.lineTo(-r*.2,-r); c.lineTo(r*.32,-r*.4); c.lineTo(-r*.15,r*.06); c.closePath(); c.fill();
    c.fillStyle = '#686f83'; c.beginPath(); c.arc(r*.33,r*.28,r*.16,0,Math.PI*2); c.fill(); c.restore();
  }
  basket(x, y, width = 72, height = 34) {
    const c = this.ctx; c.save(); c.translate(x, y);
    c.strokeStyle = 'rgba(149,239,206,.5)'; c.lineWidth = 3; c.beginPath(); c.arc(0,-height*.36,width*.27,Math.PI,0); c.stroke();
    c.beginPath(); c.moveTo(-width/2,-height/2); c.lineTo(width/2,-height/2); c.lineTo(width*.38,height/2); c.quadraticCurveTo(0,height*.72,-width*.38,height/2); c.closePath();
    const g = c.createLinearGradient(0,-height/2,0,height/2); g.addColorStop(0,'#aaf9db'); g.addColorStop(1,'#59bda1'); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(19,94,76,.24)'; c.lineWidth = 2;
    for(let i=-1;i<=1;i++){ c.beginPath(); c.moveTo(i*width*.18,-height*.22); c.lineTo(i*width*.15,height*.36); c.stroke(); }
    this.pill(-width*.54,-height*.6,width*1.08,7,'#c0ffe7'); c.restore();
  }
  heart(x,y,filled) {
    const c=this.ctx; c.save(); c.translate(x,y); c.beginPath(); c.moveTo(0,7);
    c.bezierCurveTo(-16,-2,-8,-13,0,-6); c.bezierCurveTo(8,-13,16,-2,0,7);
    c.fillStyle=filled?'#f2a69e':'rgba(242,166,158,.18)'; c.fill(); c.restore();
  }
  background(elapsed = 0) {
    const c=this.ctx, g=c.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#10192d'); g.addColorStop(.65,'#172b42'); g.addColorStop(1,'#21423f'); c.fillStyle=g; c.fillRect(0,0,W,H);
    for(let i=0;i<65;i++) {
      const x=(i*97+17)%W, y=(i*61+31)%650;
      c.globalAlpha=.18+.35*(.5+.5*Math.sin(i*2.1+elapsed*.6)); c.fillStyle=i%5===0?C.gold:'#c4d3e4';
      c.beginPath(); c.arc(x,y,i%9===0?1.6:.8,0,Math.PI*2); c.fill();
    }
    c.globalAlpha=1;
    c.fillStyle='rgba(110,176,146,.055)'; c.beginPath(); c.ellipse(195,725,270,100,0,0,Math.PI*2); c.fill();
    c.strokeStyle='rgba(149,239,206,.15)'; c.lineWidth=1; c.beginPath(); c.moveTo(24,675); c.lineTo(366,675); c.stroke();
  }
  draw(game, options = {}) {
    const c=this.ctx; this.buttons=[];
    c.setTransform(this.dpr,0,0,this.dpr,0,0); c.clearRect(0,0,this.width,this.height); c.fillStyle='#0b1526'; c.fillRect(0,0,this.width,this.height);
    c.save(); c.translate(this.left,this.top); c.scale(this.scale,this.scale);
    c.beginPath(); c.rect(0,0,W,H); c.clip(); this.background(game.elapsed || 0);
    if(game.state==='menu') this.menu(game,options); else {
      this.play(game);
      if(game.state==='paused') this.paused(game,options);
      if(game.state==='result') this.result(game,options);
    }
    c.restore();
  }
  sound(state, options, y=26) { this.button('sound',options.sound === false?'音效：关':'音效：开',278,y,88,36,state); }
  menu(game, options) {
    this.pill(24,30,107,28,'rgba(149,239,206,.08)'); this.text('60 秒 · 小确幸',77.5,44,11,C.mint,'center'); this.sound('menu',options);
    this.text(projectSettings.titleLines[0],195,133,35,C.ink,'center',700); this.text(projectSettings.titleLines[1],195,183,54,C.gold,'center',700);
    this.text('把今晚的星光，装进口袋。',195,234,14,C.muted,'center');
    this.ctx.save(); this.ctx.strokeStyle='rgba(255,224,153,.15)'; this.ctx.setLineDash([3,7]); this.ctx.beginPath(); this.ctx.moveTo(192,285); this.ctx.bezierCurveTo(143,320,230,356,195,395); this.ctx.stroke(); this.ctx.restore();
    this.star(195,301,29,-.12); this.star(117,350,13,.15,.75); this.star(271,368,18,.25,.9); this.rock(291,294,11);
    this.basket(195,424,105,45);
    this.text('←  左右拖动，接住星星  →',195,484,16,C.ink,'center',600);
    this.text('避开石头 · 3 颗爱心 · 每局 60 秒',195,513,12,C.muted,'center');
    this.button('start','开始收集  →',36,555,318,58,'menu',true);
    this.text(`最高纪录  ${game.best || 0} 分`,195,645,13,C.muted,'center');
    this.text('一场轻松的星光旅行',195,692,10,'#829b9c','center');
  }
  play(game) {
    const c=this.ctx;
    this.text('本局得分',24,32,11,C.muted); this.text(game.score,24,64,32,C.ink,'left',700);
    this.text('剩余时间',196,32,11,C.muted,'center'); this.text(`${Math.max(0,Math.ceil(game.remaining))}s`,196,63,27,C.gold,'center',600);
    if(game.state==='playing') this.button('pause','Ⅱ',321,26,45,43,'playing');
    for(let i=0;i<3;i++)this.heart(31+i*27,105,i<game.lives);
    this.text(`最佳 ${game.best || 0}`,366,104,12,C.muted,'right');
    this.pill(24,124,342,4,'rgba(255,255,255,.07)'); if(game.remaining>0)this.pill(24,124,Math.max(1,342*game.remaining/60),4,C.mint);
    c.save(); c.beginPath(); c.rect(0, 138, W, H - 138); c.clip();
    for(const item of game.items || []) {
      if(item.type==='rock')this.rock(item.x,item.y,item.r || 16); else this.star(item.x,item.y,item.r || 15,item.rotation || 0);
    }
    for(const p of game.particles || []) {
      c.save(); c.globalAlpha=Math.max(0,Math.min(1,p.life !== undefined ? p.life / (p.maxLife || .6):.7)); c.fillStyle=p.color || C.gold;
      c.beginPath(); c.arc(p.x,p.y,p.r || 3,0,Math.PI*2); c.fill(); c.restore();
    }
    c.restore();
    const player=game.player || {x:195,y:636,width:72,height:34};
    c.save(); if (game.invulnerable > 0) c.globalAlpha = Math.sin(game.invulnerable * 24) > 0 ? .4 : 1;
    this.basket(player.x,player.y,player.width,player.height); c.restore();
    if(game.combo>=3){ this.text(`${game.combo} 连击！`,195,158,15,C.gold,'center',600); }
    this.text((game.elapsed || 0)<5?'← 拖动屏幕，让小篮子跟随你 →':'接住每一颗小星星',195,697,12,'#a9c3b9','center');
  }
  overlay(x,y,w,h) {
    const c=this.ctx; c.fillStyle='rgba(6,13,26,.74)'; c.fillRect(0,0,W,H);
    c.save(); c.shadowColor='rgba(0,0,0,.3)'; c.shadowBlur=35; this.rounded(x,y,w,h,26); c.fillStyle='#1d3045'; c.fill(); c.restore();
    this.rounded(x,y,w,h,26); c.strokeStyle='rgba(255,255,255,.1)'; c.lineWidth=1; c.stroke();
  }
  paused(game,options) {
    this.overlay(24,210,342,320); this.text('休息一下',195,258,28,C.ink,'center',700);
    this.text('星星会等你回来',195,297,14,C.muted,'center');
    this.button('resume','继续收集  →',48,337,294,54,'paused',true);
    this.button('home','回到首页',48,406,294,46,'paused');
    this.button('sound',options.sound===false?'音效：关':'音效：开',132,473,126,34,'paused');
  }
  result(game,options) {
    this.overlay(24,140,342,461);
    const isBest=game.score>0 && game.score>=game.best;
    this.star(195,189,21,-.1); this.text('收集完成',195,237,28,C.ink,'center',700);
    this.text(game.lives<=0?'小篮子需要休息啦，下次再来！':'今晚的星光，都属于你。',195,272,13,C.muted,'center');
    this.text(game.score,195,330,64,C.gold,'center',700); this.text('本局得分',195,378,12,C.muted,'center');
    if(isBest){ this.pill(140,398,110,26,'rgba(255,224,153,.1)'); this.text('★ 最佳成绩',195,411,12,C.gold,'center'); }
    else this.text(`最高纪录  ${game.best || 0} 分`,195,411,12,C.muted,'center');
    this.button('restart','再收集一次  →',48,455,294,54,'result',true);
    this.button('home','回到首页',48,523,294,45,'result');
    this.sound('result',options,26); this.text('慢慢来，每颗星星都算数。',195,646,13,'#a9c3b9','center');
  }
}
module.exports = { Renderer };

