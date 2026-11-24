import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resetStore } from './data/store.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3001;
const MOCK_MODE = (process.env.MOCK_MODE || 'normal').toLowerCase();

/**
 * Recursively transform object/array for MOCK_MODE=empty:
 * Converts every array to []
 */
function makeEmpty(val) {
  if (Array.isArray(val)) {
    return [];
  }
  if (val !== null && typeof val === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = makeEmpty(v);
    }
    return res;
  }
  return val;
}

/**
 * Router managing endpoint registration and parameterized path matching
 */
export class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pattern, handler) {
    const keys = [];
    const regexSource =
      '^' +
      pattern
        .replace(/[:{<]([a-zA-Z0-9_-]+)[}>]?/g, (_, key) => {
          keys.push(key);
          return '([^/?#]+)';
        })
        .replace(/\/$/, '') +
      '/?$';
    this.routes.push({
      method: method.toUpperCase(),
      pattern,
      regex: new RegExp(regexSource),
      keys,
      handler
    });
  }

  get(pattern, handler) {
    this.add('GET', pattern, handler);
  }
  post(pattern, handler) {
    this.add('POST', pattern, handler);
  }
  put(pattern, handler) {
    this.add('PUT', pattern, handler);
  }
  patch(pattern, handler) {
    this.add('PATCH', pattern, handler);
  }
  delete(pattern, handler) {
    this.add('DELETE', pattern, handler);
  }

  match(method, pathname) {
    const cleanPath = pathname.replace(/\/$/, '') || '/';
    for (const r of this.routes) {
      if (r.method !== method.toUpperCase()) continue;
      const m = cleanPath.match(r.regex);
      if (m) {
        const params = {};
        for (let i = 0; i < r.keys.length; i++) {
          params[r.keys[i]] = decodeURIComponent(m[i + 1]);
        }
        return { handler: r.handler, params, pattern: r.pattern };
      }
    }
    return null;
  }
}

const router = new Router();

/**
 * Auto-load all route modules from mock/routes/*.mjs
 */
async function loadRoutes() {
  const routesDir = path.join(__dirname, 'routes');
  if (!fs.existsSync(routesDir)) return;

  const files = fs.readdirSync(routesDir).sort();
  for (const file of files) {
    if (file.endsWith('.mjs') || file.endsWith('.js')) {
      const filePath = path.join(routesDir, file);
      try {
        const mod = await import(pathToFileURL(filePath).href);
        if (typeof mod.register === 'function') {
          mod.register(router);
        }
      } catch (err) {
        console.error(`Error loading route module [${file}]:`, err.message);
      }
    }
  }
}

// Initialize pristine mock store and load dynamic routes
resetStore();
await loadRoutes();

/**
 * Main HTTP Server Request Handler
 */
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Attach status and json response helpers
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };

  res.json = async (data) => {
    // Handle MOCK_MODE=empty
    let outputData = data;
    if (MOCK_MODE === 'empty') {
      outputData = makeEmpty(data);
    }

    // Handle artificial latency per testing mode
    let delayMs = 0;
    if (MOCK_MODE === 'slow') {
      delayMs = 2000;
    } else if (MOCK_MODE === 'normal') {
      delayMs = 150;
    }

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const payload = JSON.stringify(outputData, null, 2);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(payload);

    // Print exact single-line log: <METHOD> <PATH> <STATUS>
    console.log(`${method} ${pathname} ${res.statusCode}`);
  };

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Parse request body
  let bodyBuffer = '';
  try {
    for await (const chunk of req) {
      bodyBuffer += chunk;
    }
    if (bodyBuffer.trim()) {
      try {
        req.body = JSON.parse(bodyBuffer);
      } catch {
        req.body = bodyBuffer;
      }
    } else {
      req.body = {};
    }
  } catch (err) {
    req.body = {};
  }

  // Attach parsed query parameters
  req.query = Object.fromEntries(parsedUrl.searchParams.entries());

  // Check MOCK_MODE=error: returns 500 for all endpoints except /api/auth/login
  if (MOCK_MODE === 'error' && !pathname.endsWith('/login')) {
    let delayMs = MOCK_MODE === 'slow' ? 2000 : 150;
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Mock server error mode: simulated internal server error (500).'
      }
    });
  }

  // Match registered route
  const matched = router.match(method, pathname);
  if (matched) {
    req.params = matched.params;
    try {
      await matched.handler(req, res);
    } catch (err) {
      console.error(`Error processing request ${method} ${pathname}:`, err);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message || 'Internal server error'
        }
      });
    }
  } else {
    // Endpoint not found (404)
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${method} ${pathname} does not exist on Mock Server.`
      }
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`DUKStudio Mock Server listening on http://0.0.0.0:${PORT} [mode: ${MOCK_MODE}]`);
});
