'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');
const project = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!/^[a-z0-9][a-z0-9._-]*$/.test(project.name) || !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(project.version)) throw new Error('Invalid package name or version');
require('./build').build();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) { c ^= b; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); } return (c ^ 0xffffffff) >>> 0; }
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
const entries = [];
for (const folder of ['dist/wechat', 'docs', 'release-assets']) {
  const dir = path.join(root, folder);
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    if (file.endsWith('CONTRACT.md') || file.endsWith('project.private.config.json')) continue;
    entries.push({ name: path.relative(root, file).replace(/\\/g, '/').replace(/^dist\//, ''), data: fs.readFileSync(file) });
  }
}
entries.push({ name: 'icon.png', data: fs.readFileSync(path.join(root, 'assets/icon.png')) });
const local = [], central = [];
let offset = 0;
for (const { name, data } of entries) {
  const filename = Buffer.from(name), compressed = zlib.deflateRawSync(data), crc = crc32(data);
  const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x800, 6); h.writeUInt16LE(8, 8); h.writeUInt16LE(23874, 12);
  h.writeUInt32LE(crc, 14); h.writeUInt32LE(compressed.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(filename.length, 26);
  local.push(h, filename, compressed);
  const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x800, 8); c.writeUInt16LE(8, 10); c.writeUInt16LE(23874, 14);
  c.writeUInt32LE(crc, 16); c.writeUInt32LE(compressed.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(filename.length, 28); c.writeUInt32LE(offset, 42);
  central.push(c, filename); offset += h.length + filename.length + compressed.length;
}
const index = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(index.length, 12); end.writeUInt32LE(offset, 16);
const target = path.join(root, 'dist/' + project.name + '-' + project.version + '.zip');
fs.writeFileSync(target, Buffer.concat([...local, index, end]));
console.log(`Packaged ${entries.length} files: ${target}`);
