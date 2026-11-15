import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'locations.json');
const ADMIN_PASSWORD = '360063';

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

function readLocations() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveLocations(locations) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(locations, null, 2));
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function sendHTML(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // ========== API: Save location ==========
  if (pathname === '/api/submit' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { name, latitude, longitude } = data;

        if (!name || typeof name !== 'string' || name.trim().length < 1) {
          return sendJSON(res, 400, { error: 'Name is required' });
        }
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          return sendJSON(res, 400, { error: 'Valid latitude and longitude are required' });
        }

        const locations = readLocations();
        const entry = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          name: name.trim().slice(0, 100),
          latitude,
          longitude,
          accuracy: data.accuracy || null,
          timestamp: new Date().toISOString()
        };

        locations.push(entry);
        saveLocations(locations);

        sendJSON(res, 200, { success: true, message: 'Saved successfully' });
      } catch (err) {
        sendJSON(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  // ========== API: Get all locations (password protected) ==========
  if (pathname === '/api/locations' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        if (data.password !== ADMIN_PASSWORD) {
          return sendJSON(res, 401, { error: 'Wrong password' });
        }
        const locations = readLocations();
        sendJSON(res, 200, { locations });
      } catch (err) {
        sendJSON(res, 400, { error: 'Invalid request' });
      }
    });
    return;
  }

  // ========== Serve the main page ==========
  if (pathname === '/' || pathname === '/index.html') {
    const htmlPath = path.join(__dirname, 'index.html');
    fs.readFile(htmlPath, 'utf8', (err, html) => {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading page');
      }
      sendHTML(res, html);
    });
    return;
  }

  // 404
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Admin password: ${ADMIN_PASSWORD}`);
});
