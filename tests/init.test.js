'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
function fixture(t) {
  const parent = path.join(root, 'artifacts');
  fs.mkdirSync(parent, { recursive: true });
  const dir = fs.mkdtempSync(path.join(parent, 'init-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const entry of ['tools', 'src', 'assets', 'preview', 'docs', 'release-assets', 'package.json', 'project.config.json', 'game.js', 'game.json']) {
    fs.cpSync(path.join(root, entry), path.join(dir, entry), { recursive: true });
  }
  return dir;
}
test('new project configuration drives identity, namespace, preview, build and ZIP filename', t => {
  const dir = fixture(t);
  // Synthetic format-only AppID; never obtained from a WeChat account.
  const fixtureAppId = 'wx' + Array.from({ length: 16 }, (_, index) => index.toString(16)).join('');
  const result = cp.spawnSync(process.execPath, ['tools/init.js', '--name', 'different-game', '--title', '我的|新游戏', '--version', '2.3.4', '--description', 'Independent game', '--appid', fixtureAppId], { cwd: dir, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json')));
  assert.equal(pkg.name, 'different-game'); assert.equal(pkg.version, '2.3.4');
  const settings = require(path.join(dir, 'src/project-settings.js'));
  assert.equal(settings.storagePrefix, 'different-game-v1:');
  assert.deepEqual(settings.titleLines, ['我的', '新游戏']);
  assert.match(fs.readFileSync(path.join(dir, 'preview/index.html'), 'utf8'), /<title>我的新游戏<\/title>/);
  const packaged = cp.spawnSync(process.execPath, ['tools/package.js'], { cwd: dir, encoding: 'utf8', env: { ...process.env, WECHAT_APPID: '' } });
  assert.equal(packaged.status, 0, packaged.stderr);
  const config = JSON.parse(fs.readFileSync(path.join(dir, 'dist/wechat/project.config.json')));
  assert.equal(config.appid, fixtureAppId); assert.equal(config.projectname, 'different-game');
  assert.ok(fs.existsSync(path.join(dir, 'dist/different-game-2.3.4.zip')));
});
test('invalid initialization leaves project configuration unchanged', t => {
  const dir = fixture(t);
  const before = fs.readFileSync(path.join(dir, 'package.json'), 'utf8');
  const result = cp.spawnSync(process.execPath, ['tools/init.js', '--name', '../escape', '--version', '2.3.4'], { cwd: dir, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.equal(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'), before);
});
