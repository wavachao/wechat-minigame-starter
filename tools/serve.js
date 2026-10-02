'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
require('./build').build();
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.wav':'audio/wav','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8'};
http.createServer((req,res) => {
  let name;
  try {name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);} catch {res.writeHead(400);res.end('Bad request');return;}
  if (name === '/') {res.writeHead(302, {Location:'/preview/index.html'});res.end();return;}
  const file = path.resolve(root, '.' + (name === '/' ? '/preview/index.html' : name));
  if (!file.startsWith(root + path.sep) || !/^(preview|assets)[\\/]/.test(path.relative(root,file))) {res.writeHead(404);res.end('Not found');return;}
  fs.readFile(file,(error,data) => {
    if (error) {res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  });
}).listen(port,'127.0.0.1',() => console.log(`Game preview: http://127.0.0.1:${port}`));
