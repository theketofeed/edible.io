import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';

const DIST = join(process.cwd(), 'dist');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };

const server = createServer(async (req, res) => {
  let url = req.url.split('?')[0];
  let filePath = join(DIST, url);
  try {
    const stat = (await import('fs')).statSync(filePath);
    if (stat.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    filePath = join(DIST, url.endsWith('/') ? url + 'index.html' : url + '/index.html');
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'text/html' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});
server.listen(3456, () => console.log('Serving on http://localhost:3456'));
