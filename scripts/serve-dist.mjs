import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const root = resolve('dist');
const port = Number.parseInt(process.env.PORT || '3000', 10);
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.ttf', 'font/ttf'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl || '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }

  const candidates = pathname === '/'
    ? ['/index.html']
    : extname(pathname)
      ? [pathname]
      : [pathname, `${pathname}.html`, `${pathname}/index.html`];

  for (const candidate of candidates) {
    const filePath = resolve(root, `.${candidate}`);
    if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) continue;
    if (existsSync(filePath) && statSync(filePath).isFile()) return filePath;
  }
  return null;
}

const server = createServer((request, response) => {
  const filePath = resolveRequestPath(request.url);
  if (!filePath) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': mimeTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Practical Tools is available at http://127.0.0.1:${port}`);
});
