'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const project = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
function html(text) { return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function listFiles(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => entry.isDirectory() ? listFiles(path.join(dir,entry.name)) : [path.join(dir,entry.name)]);
}
function pruneFiles(dir, allowed) {
  for (const file of listFiles(dir)) {
    const rel = path.relative(dir,file).replace(/\\/g,'/');
    if (!allowed.has(rel) && rel !== 'project.private.config.json') fs.unlinkSync(file);
  }
}
function bundle(entry) {
  const modules = new Map();
  function visit(file) {
    const key = path.relative(root, file).replace(/\\/g, '/');
    if (modules.has(key)) return key;
    modules.set(key, '');
    const code = fs.readFileSync(file, 'utf8').replace(/require\(['"](\.[^'"]*)['"]\)/g, (_, rel) => {
      let resolved = path.resolve(path.dirname(file), rel);
      if (!path.extname(resolved)) resolved += '.js';
      if (!resolved.startsWith(root + path.sep)) throw new Error('Module is outside project: ' + rel);
      return `require(${JSON.stringify(visit(resolved))})`;
    });
    modules.set(key, code);
    return key;
  }
  const first = visit(path.resolve(root, entry));
  return `(function(){'use strict';var modules={${[...modules].map(([k,v]) => `${JSON.stringify(k)}:function(require,module,exports){\n${v}\n}`).join(',\n')}};var cache={};function require(id){if(cache[id])return cache[id].exports;if(!modules[id])throw new Error('Unknown module '+id);var module=cache[id]={exports:{}};modules[id](require,module,module.exports);return module.exports;}require(${JSON.stringify(first)});})();\n`;
}
function build() {
  const argIndex = process.argv.indexOf('--appid');
  if (argIndex >= 0 && !process.argv[argIndex + 1]) throw new Error('--appid requires a value');
  const config = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'));
  config.projectname = project.name;
  config.description = project.description;
  config.appid = (argIndex >= 0 ? process.argv[argIndex + 1] : process.env.WECHAT_APPID) || config.appid;
  if (config.appid !== 'touristappid' && !/^wx[a-f\d]{16}$/i.test(config.appid)) throw new Error('Invalid WeChat AppID format');
  const preview = path.join(root, 'preview');
  fs.mkdirSync(preview, {recursive: true});
  fs.writeFileSync(path.join(preview, 'bundle.js'), bundle('game.js'));
  const target = path.join(root, 'dist', 'wechat');
  const targetPreview = path.join(root, 'dist', 'preview');
  for (const dir of [target, targetPreview]) {
    if (!dir.startsWith(root + path.sep)) throw new Error('Unsafe build path');
    // An open Windows IDE watches and locks the project directory. Update files
    // in place rather than removing that directory or its watched children.
    fs.mkdirSync(dir, {recursive: true});
  }
  for (const file of ['game.js', 'game.json', 'src']) fs.cpSync(path.join(root, file), path.join(target, file), {recursive: true});
  if (fs.existsSync(path.join(root, 'assets'))) fs.cpSync(path.join(root, 'assets'), path.join(target, 'assets'), {recursive: true});
  config.packOptions = {ignore: []};
  fs.writeFileSync(path.join(target, 'project.config.json'), JSON.stringify(config, null, 2) + '\n');
  fs.cpSync(preview, path.join(targetPreview, 'preview'), {recursive: true});
  fs.writeFileSync(path.join(targetPreview, 'index.html'), '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=preview/index.html"><title>' + html(project.description || project.name) + '</title><a href="preview/index.html">打开游戏</a></html>\n');
  if (fs.existsSync(path.join(root, 'assets'))) fs.cpSync(path.join(root, 'assets'), path.join(targetPreview, 'assets'), {recursive: true});
  const gameFiles = new Set(['game.js','game.json','project.config.json']);
  const previewFiles = new Set(['index.html']);
  for (const folder of ['src','assets']) {
    const source = path.join(root,folder);
    if (fs.existsSync(source)) for (const file of listFiles(source)) gameFiles.add(path.relative(root,file).replace(/\\/g,'/'));
  }
  for (const folder of ['preview','assets']) {
    const source = path.join(root,folder);
    if (fs.existsSync(source)) for (const file of listFiles(source)) previewFiles.add(path.relative(root,file).replace(/\\/g,'/'));
  }
  pruneFiles(target,gameFiles);
  pruneFiles(targetPreview,previewFiles);
  console.log('Built dist/wechat and dist/preview. AppID: ' + config.appid);
  if (config.appid === 'touristappid') console.log('Preview only: supply your registered AppID before uploading.');
}
if (require.main === module) build();
module.exports = {bundle, build};
