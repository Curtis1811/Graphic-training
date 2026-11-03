// Minimal static file server for web/ — no dependencies, works on Windows, macOS and Linux.
//   npm run serve            -> http://localhost:8080
//   PORT=3000 npm run serve  (PowerShell: $env:PORT=3000; npm run serve)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../web', import.meta.url)));
const port = Number(process.env.PORT) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(root, path));
    // Refuse anything that escapes the web/ folder (e.g. /../package.json).
    if (file !== root && !file.startsWith(root + sep)) throw Object.assign(new Error(), { code: 'ENOENT' });
    if ((await stat(file)).isDirectory()) throw Object.assign(new Error(), { code: 'ENOENT' });
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch (err) {
    res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
    res.end(err.code === 'ENOENT' ? 'Not found' : 'Server error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`GL Trainer running at http://localhost:${port}  (Ctrl+C to stop)`);
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`Port ${port} is busy. Try: set PORT=3000 && npm run serve`);
  else console.error(err.message);
  process.exit(1);
});
