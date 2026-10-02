'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
if (args.length % 2) throw new Error('Expected pairs: --name value --title value --appid value --version value --description value');
const options = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace(/^--/, '');
  if (!['name', 'title', 'appid', 'version', 'description'].includes(key) || !args[i].startsWith('--')) throw new Error('Unknown option ' + args[i]);
  options[key] = args[i + 1];
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const config = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'));
const settings = require('../src/project-settings');
if (options.name) pkg.name = options.name;
if (options.version) pkg.version = options.version;
if (options.description) pkg.description = options.description;
if (options.appid) config.appid = options.appid;
if (!/^[a-z0-9][a-z0-9._-]*$/.test(pkg.name)) throw new Error('Use lowercase letters, digits, dots, underscores or hyphens for name');
if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(pkg.version)) throw new Error('Use a version such as 0.1.0');
if (config.appid !== 'touristappid' && !/^wx[a-f\d]{16}$/i.test(config.appid)) throw new Error('Invalid AppID');
if (options.title) {
  const lines = options.title.split('|');
  if (lines.length !== 2 || lines.some(line => !line.trim() || Array.from(line).length > 5)) throw new Error('Title needs two lines of 1-5 characters, separated by |');
  settings.titleLines = lines;
}
settings.storagePrefix = pkg.name + '-v1:';
config.projectname = pkg.name; config.description = pkg.description;
fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'project.config.json'), JSON.stringify(config, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'src/project-settings.js'), "'use strict';\nmodule.exports = " + JSON.stringify(settings, null, 2) + ';\n');
if (options.title) {
  const file = path.join(root, 'preview/index.html');
  const title = settings.titleLines.join('').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const html = fs.readFileSync(file, 'utf8').replace(/<title>[^<]*<\/title>/, '<title>' + title + '</title>').replace(/<footer>[^<]*<\/footer>/, '<footer>' + title + '</footer>');
  fs.writeFileSync(file, html);
}
console.log('Configured ' + pkg.name + ' ' + pkg.version + '; AppID: ' + config.appid);
