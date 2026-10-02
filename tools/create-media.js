'use strict';
// Original procedural sounds and original vector artwork. No downloaded assets.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'assets');
fs.mkdirSync(dir, { recursive: true });
function wav(name, notes) {
  const rate = 22050, duration = notes.reduce((n, note) => n + note[1], 0);
  const samples = Math.ceil(rate * duration);
  const data = Buffer.alloc(44 + samples * 2);
  data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVE', 8);
  data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(samples * 2, 40);
  let offset = 0;
  for (const [freq, seconds] of notes) {
    const count = Math.floor(rate * seconds);
    for (let i = 0; i < count && offset < samples; i++, offset++) {
      const t = i / rate, envelope = Math.min(1, t / 0.012) * Math.pow(1 - i / count, 1.7);
      const value = (Math.sin(t * freq * Math.PI * 2) + 0.16 * Math.sin(t * freq * Math.PI * 4)) * envelope * 0.45;
      data.writeInt16LE(Math.round(value * 32767), 44 + offset * 2);
    }
  }
  fs.writeFileSync(path.join(dir, name + '.wav'), data);
}
wav('catch', [[880, 0.09], [1174.66, 0.12]]);
wav('hit', [[164.8, 0.08], [110, 0.18]]);
wav('end', [[523.25, 0.13], [659.25, 0.13], [783.99, 0.13], [1046.5, 0.3]]);
// Dependency-free PNG generator. Draw at 2x then average pixels for smooth edges.
function crc32(buf) { let c = 0xffffffff; for (const b of buf) { c ^= b; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); } return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const t = Buffer.from(type), len = Buffer.alloc(4), crc = Buffer.alloc(4); len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, crc]); }
function polygon(px, py, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) { const a = vertices[i], b = vertices[j]; if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; }
  return inside;
}
function star(x, y, r) { return Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.48 : r; return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]; }); }
function artwork(name, w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h), scale = Math.min(w, h);
  const shapes = [
    { polygon: star(w * .5, h * .32, scale * .145), color: [255, 224, 153] },
    { polygon: star(w * .25, h * .49, scale * .058), color: [255, 224, 153] },
    { polygon: star(w * .76, h * .44, scale * .071), color: [255, 224, 153] },
    { polygon: [[w*.29,h*.64],[w*.71,h*.64],[w*.66,h*.8],[w*.34,h*.8]], color: [125, 225, 190] },
    { polygon: [[w*.28,h*.625],[w*.72,h*.625],[w*.72,h*.65],[w*.28,h*.65]], color: [192,255,231] }
  ];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sums = [0, 0, 0];
      for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
        const px = x + (sx + .5) / 2, py = y + (sy + .5) / 2;
        const t = py / h; let rgb = [16 + t * 13, 25 + t * 38, 45 + t * 14];
        for (let i = 0; i < 42; i++) { const xx = (i * 97 + 17) % w, yy = (i * 61 + 31) % h; if ((px-xx)**2+(py-yy)**2 < (i % 7 === 0 ? 2.2 : 1.2)**2) rgb = [159,181,197]; }
        const glow = Math.max(0, 1 - Math.hypot(px-w*.5, py-h*.32)/(scale*.32)) * .16;
        rgb = rgb.map((c, i) => c * (1-glow) + [255,224,153][i]*glow);
        const dx = (px - w*.5)/(scale*.14), dy = (py-h*.64)/(scale*.14);
        if (py < h*.64 && Math.abs(Math.hypot(dx,dy)-1) < .055) rgb=[115,200,172];
        for (const shape of shapes) if (polygon(px, py, shape.polygon)) rgb = shape.color;
        if (py > h*.67 && py < h*.77 && [w*.43,w*.5,w*.57].some(xx=>Math.abs(px-xx)<scale*.004)) rgb=[70,166,136];
        for (let c=0;c<3;c++) sums[c] += rgb[c];
      }
      const index=y*(w*3+1)+1+x*3; for(let c=0;c<3;c++)raw[index+c]=Math.round(sums[c]/4);
    }
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=2;
  fs.writeFileSync(path.join(dir,name+'.png'),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
}
artwork('icon',512,512);
artwork('share',640,512);
console.log('Created original icon, share artwork and 3 sound effects.');
