'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const project = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const command = process.argv[2] || 'open';
if (!['open', 'login', 'status', 'preview', 'upload'].includes(command)) {
  console.error('Usage: npm run wechat -- open|login|status|preview|upload');
  process.exit(1);
}
if (process.platform !== 'win32') throw new Error('This helper uses the Windows WeChat developer tools. Import dist/wechat manually on other systems.');
const cli = path.join(process.env.WECHAT_DEVTOOLS || path.join(root, '.tools/wechat-devtools'), 'cli.bat');
if (!fs.existsSync(cli)) throw new Error('WeChat developer tools not found; set WECHAT_DEVTOOLS to the installed directory.');
if (command === 'upload' && JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8')).appid === 'touristappid' && !process.env.WECHAT_APPID) throw new Error('Configure a real AppID before upload');
const artifacts = path.join(root, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });
let args = [command === 'status' ? 'islogin' : command, '--lang', 'zh'];
if (['open', 'preview', 'upload'].includes(command)) {
  require('./build').build();
  args.push('--project', path.join(root, 'dist/wechat'));
}
if (command === 'login') args.push('--qr-format', 'image', '--qr-output', path.join(artifacts, 'wechat-login.png'));
if (command === 'preview') args.push('--qr-format', 'image', '--qr-output', path.join(artifacts, 'wechat-preview.png'), '--info-output', path.join(artifacts, 'wechat-preview-info.json'));
if (command === 'upload') args.push('--version', project.version, '--desc', process.env.WECHAT_UPLOAD_DESC || project.description || project.name, '--info-output', path.join(artifacts, 'wechat-upload-info.json'));
function quote(value) { if (/["&|<>^%\r\n]/.test(value)) throw new Error('Unsupported shell characters in CLI argument'); return '"' + value + '"'; }
const line = '"' + [cli, ...args].map(quote).join(' ') + '"';
const result = cp.spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', line], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, cwd: root, windowsVerbatimArguments: true });
if (result.error) throw result.error;
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
// Official CLI can return exit code 0 even when the platform rejects a project.
process.exitCode = /\[error\]/i.test((result.stdout || '') + (result.stderr || '')) ? 1 : result.status === null ? 1 : result.status;
