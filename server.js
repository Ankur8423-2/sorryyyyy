const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const FORMSPREE_ENDPOINT = process.env.FORMSPREE_ENDPOINT;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/submit-response') {
    if (!FORMSPREE_ENDPOINT) {
      return sendJson(res, 500, { ok: false, error: 'Server is missing FORMSPREE_ENDPOINT' });
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.socket.destroy();
      }
    });

    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const response = await fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(parsed)
        });

        if (!response.ok) {
          const text = await response.text();
          return sendJson(res, response.status, { ok: false, error: text || 'Formspree request failed' });
        }

        return sendJson(res, 200, { ok: true });
      } catch (error) {
        return sendJson(res, 400, { ok: false, error: 'Invalid payload' });
      }
    });

    return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Could not load index.html');
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(content);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
