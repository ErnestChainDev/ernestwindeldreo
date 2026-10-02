import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

// Frontend audit server: no credentials, live database writes, or AI calls.
// Extensionless paths use the same SPA fallback as Vercel; missing files return 404.
export function createAuditServer(port = 4173) {
  const root = path.resolve('dist');
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.pdf': 'application/pdf' };
  const counts = { views: 0, visitors: 0, likes: 0, liked: false, revision: 0 };
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (['/api/site-stats', '/api/site-stats/visit', '/api/site-stats/like'].includes(pathname)) {
      request.resume();
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(counts));
      return;
    }
    const filename = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!filename.startsWith(`${root}${path.sep}`)) { response.writeHead(404); response.end(); return; }
    let content;
    let extension = path.extname(filename);
    try { content = await readFile(filename); }
    catch {
      if (extension || pathname.startsWith('/api/') || pathname.startsWith('/.well-known/')) { response.writeHead(404); response.end(); return; }
      content = await readFile(path.join(root, 'index.html'));
      extension = '.html';
    }
    const headers = { 'Content-Type': types[extension] ?? 'application/octet-stream', 'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' };
    if (/text\/|application\/(json|xml)/.test(headers['Content-Type']) && request.headers['accept-encoding']?.includes('gzip')) {
      content = gzipSync(content);
      headers['Content-Encoding'] = 'gzip';
      headers.Vary = 'Accept-Encoding';
    }
    response.writeHead(200, headers);
    response.end(content);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await createAuditServer();
  console.log('Production frontend with fixture stats: http://127.0.0.1:4173/');
}
