'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');

function fixture(t) {
  const parent = path.join(root, 'artifacts');
  fs.mkdirSync(parent, { recursive: true });
  const dir = fs.mkdtempSync(path.join(parent, 'build-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const folder of ['src', 'assets', 'preview', 'tools', 'docs', 'release-assets']) {
    fs.mkdirSync(path.join(dir, folder), { recursive: true });
  }
  for (const file of ['tools/build.js', 'tools/package.js', 'project.config.json', 'game.json', 'package.json']) {
    fs.copyFileSync(path.join(root, file), path.join(dir, file));
  }
  fs.writeFileSync(path.join(dir, 'game.js'), "require('./src/core');\n");
  fs.writeFileSync(path.join(dir, 'src/core.js'), 'module.exports = { version: 1 };\n');
  fs.writeFileSync(path.join(dir, 'assets/icon.png'), Buffer.from([137, 80, 78, 71]));
  fs.writeFileSync(path.join(dir, 'preview/index.html'), '<script src="bundle.js"></script>');
  fs.writeFileSync(path.join(dir, 'docs/RELEASE.md'), 'Release fixture');
  fs.writeFileSync(path.join(dir, 'docs/CONTRACT.md'), 'Developer-only contract');
  return dir;
}
function run(dir, script) {
  const result = cp.spawnSync(process.execPath, [script], {
    cwd: dir, encoding: 'utf8', env: { ...process.env, WECHAT_APPID: '' }
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}
function localZipEntries(bytes) {
  const files = new Map();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const method = bytes.readUInt16LE(offset + 8);
    const size = bytes.readUInt32LE(offset + 18);
    const nameLength = bytes.readUInt16LE(offset + 26);
    const extraLength = bytes.readUInt16LE(offset + 28);
    const start = offset + 30;
    const name = bytes.subarray(start, start + nameLength).toString('utf8');
    const dataStart = start + nameLength + extraLength;
    const compressed = bytes.subarray(dataStart, dataStart + size);
    files.set(name, method === 8 ? zlib.inflateRawSync(compressed) : compressed);
    offset = dataStart + size;
  }
  assert.equal(bytes.readUInt32LE(offset), 0x02014b50, 'valid ZIP central directory follows entries');
  return files;
}

test('in-place rebuild updates exports, removes stale files, and retains IDE private configuration', t => {
  const dir = fixture(t);
  run(dir, 'tools/build.js');
  const game = path.join(dir, 'dist/wechat');
  const browser = path.join(dir, 'dist/preview');
  const privateText = '{"projectname":"local IDE settings"}\n';
  fs.writeFileSync(path.join(game, 'project.private.config.json'), privateText);
  for (const target of [game, browser]) {
    fs.mkdirSync(path.join(target, 'obsolete/deep'), { recursive: true });
    fs.writeFileSync(path.join(target, 'obsolete/deep/removed.js'), 'obsolete');
  }
  fs.writeFileSync(path.join(game, 'src/removed-module.js'), 'obsolete');
  fs.writeFileSync(path.join(browser, 'preview/removed-page.html'), 'obsolete');
  fs.writeFileSync(path.join(dir, 'src/core.js'), 'module.exports = { version: 2 };\n');
  run(dir, 'tools/build.js');
  for (const target of [game, browser]) {
    assert.equal(fs.existsSync(path.join(target, 'obsolete/deep/removed.js')), false);
  }
  assert.equal(fs.existsSync(path.join(game, 'src/removed-module.js')), false);
  assert.equal(fs.existsSync(path.join(browser, 'preview/removed-page.html')), false);
  assert.equal(fs.readFileSync(path.join(game, 'project.private.config.json'), 'utf8'), privateText);
  for (const file of ['game.js', 'game.json', 'src/core.js', 'assets/icon.png']) {
    assert.deepEqual(fs.readFileSync(path.join(game, file)), fs.readFileSync(path.join(dir, file)), file);
  }
  assert.deepEqual(fs.readFileSync(path.join(browser, 'preview/bundle.js')), fs.readFileSync(path.join(dir, 'preview/bundle.js')));
  assert.match(fs.readFileSync(path.join(browser, 'preview/bundle.js'), 'utf8'), /version: 2/);
  assert.deepEqual(fs.readFileSync(path.join(browser, 'preview/index.html')), fs.readFileSync(path.join(dir, 'preview/index.html')));
  assert.deepEqual(fs.readFileSync(path.join(browser, 'assets/icon.png')), fs.readFileSync(path.join(dir, 'assets/icon.png')));
  assert.equal(JSON.parse(fs.readFileSync(path.join(game, 'project.config.json'))).appid,
    JSON.parse(fs.readFileSync(path.join(dir, 'project.config.json'))).appid);
});

test('release ZIP excludes preserved private IDE configuration and includes exact runtime bytes', t => {
  const dir = fixture(t);
  run(dir, 'tools/build.js');
  const privateFile = path.join(dir, 'dist/wechat/project.private.config.json');
  fs.writeFileSync(privateFile, '{"private":"must stay local"}');
  run(dir, 'tools/package.js');
  const files = localZipEntries(fs.readFileSync(path.join(dir, 'dist/' + JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).name + '-' + JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version + '.zip')));
  assert.equal([...files.keys()].some(name => name.endsWith('project.private.config.json')), false);
  assert.equal(files.has('docs/CONTRACT.md'), false);
  assert.equal(files.has('docs/RELEASE.md'), true);
  assert.deepEqual(files.get('wechat/src/core.js'), fs.readFileSync(path.join(dir, 'src/core.js')));
  assert.deepEqual(files.get('wechat/assets/icon.png'), fs.readFileSync(path.join(dir, 'assets/icon.png')));
  assert.equal(fs.existsSync(privateFile), true, 'packaging must preserve local IDE configuration');
});
