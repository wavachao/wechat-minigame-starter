'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
function scan(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?scan(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files = ['game.js', ...scan(path.join(root,'src')), ...scan(__dirname), ...scan(path.join(root,'tests'))].map(f=>path.resolve(root,f)).filter(f=>f.endsWith('.js'));
for (const file of files) {const result=cp.spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);}
const config = JSON.parse(fs.readFileSync(path.join(root,'project.config.json'),'utf8'));
const game = JSON.parse(fs.readFileSync(path.join(root,'game.json'),'utf8'));
if (config.compileType!=='game' || game.deviceOrientation!=='portrait') throw new Error('Expected portrait WeChat game configuration');
require('./build').build();
const releaseFiles=scan(path.join(root,'dist','wechat'));
if(releaseFiles.some(f=>/(?:^|[\\/])(?:tests|docs|tools|preview|node_modules|\.git)(?:[\\/]|$)/.test(f)))throw new Error('Development files in game package');
console.log(`Check passed: ${files.length} JavaScript files; release package ${(releaseFiles.reduce((n,f)=>n+fs.statSync(f).size,0)/1024).toFixed(1)} KiB.`);
