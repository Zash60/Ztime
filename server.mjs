// Dev/static server for the Speedrun Timer app. Plain static files, no
// special headers needed (the WebCodecs engine uses no SharedArrayBuffer).
// Any static server works, e.g. `python3 -m http.server`.
//
// Usage: node server.mjs [port]   (default 8899)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2] || 8899);
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
};

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
    });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`up on ${PORT}`));
