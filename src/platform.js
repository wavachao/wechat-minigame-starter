'use strict';
const STORAGE_PREFIX = require('./project-settings').storagePrefix;
function createPlatform() {
  const isWechat = typeof wx !== 'undefined' && typeof wx.createCanvas === 'function';
  const sounds = {};
  let canvas;
  function makeSound(type) {
    if (sounds[type]) return sounds[type];
    try {
      const audio = isWechat ? wx.createInnerAudioContext() : new Audio();
      audio.src = (isWechat ? 'assets/' : '../assets/') + type + '.wav';
      audio.volume = type === 'hit' ? 0.25 : 0.35;
      if (isWechat) { audio.obeyMuteSwitch = true; audio.onError(() => {}); }
      sounds[type] = audio;
      return audio;
    } catch (_) { return null; }
  }
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }
  return {
    createCanvas() {
      canvas = isWechat ? wx.createCanvas() : document.getElementById('game');
      return canvas;
    },
    getSize() {
      if (isWechat) {
        const info = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : wx.getSystemInfoSync();
        let safeTop = info.safeArea ? info.safeArea.top : 0;
        let safeBottom = info.safeArea ? Math.max(0, info.windowHeight - info.safeArea.bottom) : 0;
        // Leave the platform capsule and system gestures clear.
        try {
          const capsule = wx.getMenuButtonBoundingClientRect();
          if (capsule && capsule.bottom > 0) safeTop = Math.max(safeTop, capsule.bottom + 8);
        } catch (_) {}
        return { width: info.windowWidth, height: info.windowHeight, dpr: Math.min(info.pixelRatio || 1, 3), safeTop, safeBottom };
      }
      const rect = canvas.getBoundingClientRect();
      return { width: rect.width, height: rect.height, dpr: Math.min(window.devicePixelRatio || 1, 3), safeTop: 0, safeBottom: 0 };
    },
    read(key, fallback) {
      try {
        if (isWechat) {
          const value = wx.getStorageSync(STORAGE_PREFIX + key);
          return value === '' || value === undefined ? fallback : value;
        }
        const raw = localStorage.getItem(STORAGE_PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (_) { return fallback; }
    },
    write(key, value) {
      try {
        if (isWechat) wx.setStorageSync(STORAGE_PREFIX + key, value);
        else localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      } catch (_) {}
    },
    requestFrame(callback) {
      if (isWechat) requestAnimationFrame(callback);
      else window.requestAnimationFrame(callback);
    },
    onPointer(handlers) {
      if (isWechat) {
        wx.onTouchStart(e => { const p = e.touches[0]; if (p) handlers.down(p.clientX, p.clientY); });
        wx.onTouchMove(e => { const p = e.touches[0]; if (p) handlers.move(p.clientX, p.clientY); });
        wx.onTouchEnd(handlers.up);
        wx.onTouchCancel(handlers.up);
      } else {
        canvas.addEventListener('pointerdown', e => { e.preventDefault(); canvas.setPointerCapture(e.pointerId); handlers.down(...point(e)); });
        canvas.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') handlers.move(...point(e)); });
        canvas.addEventListener('pointerup', handlers.up);
        canvas.addEventListener('pointercancel', handlers.up);
      }
    },
    onKey(handler) {
      if (!isWechat) {
        window.addEventListener('keydown', e => { if (['ArrowLeft', 'ArrowRight', ' ', 'Enter', 'Escape', 'p', 'a', 'd'].includes(e.key)) { e.preventDefault(); if (!e.repeat) handler(e.key, true); } });
        window.addEventListener('keyup', e => handler(e.key, false));
      }
    },
    onHide(handler) {
      if (isWechat) wx.onHide(handler);
      else { document.addEventListener('visibilitychange', () => { if (document.hidden) handler(); }); window.addEventListener('blur', handler); }
    },
    onShow(handler) {
      if (isWechat) wx.onShow(handler);
      else document.addEventListener('visibilitychange', () => { if (!document.hidden) handler(); });
    },
    onResize(handler) { if (isWechat && wx.onWindowResize) wx.onWindowResize(handler); else if (!isWechat) window.addEventListener('resize', handler); },
    unlockSound() {
      ['catch', 'hit', 'end'].forEach(makeSound);
      if (!isWechat) {
        Object.values(sounds).forEach(audio => { audio.muted = true; const p = audio.play(); if (p && p.then) p.then(() => { audio.pause(); audio.currentTime = 0; audio.muted = false; }).catch(() => { audio.muted = false; }); });
      }
    },
    play(type) {
      const audio = makeSound(type);
      if (!audio) return;
      try {
        if (isWechat) { audio.stop(); audio.play(); }
        else { audio.currentTime = 0; const p = audio.play(); if (p && p.catch) p.catch(() => {}); }
      } catch (_) {}
    },
    stopSound() { Object.values(sounds).forEach(audio => { try { if (isWechat) audio.stop(); else audio.pause(); } catch (_) {} }); }
  };
}
module.exports = { createPlatform };
