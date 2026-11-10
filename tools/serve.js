// Servidor local mínimo para probar el juego: node tools/serve.js  →  http://localhost:8080
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), port = process.env.PORT || 8080;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };
http.createServer((req, res) => {
  let f = path.normalize(path.join(root, decodeURIComponent(req.url.split('?')[0])));
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': (types[path.extname(f)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, () => console.log('Hordas del Vacío en http://localhost:' + port));
