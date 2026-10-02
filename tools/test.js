'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const files = fs.readdirSync(path.join(root, 'tests')).filter(name => name.endsWith('.test.js')).map(name => path.join(root, 'tests', name));
const result = cp.spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit', cwd: root });
process.exitCode = result.status === null ? 1 : result.status;
