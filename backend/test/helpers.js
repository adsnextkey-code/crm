const { spawn, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 5555;
const BASE = `http://localhost:${PORT}/api`;
const SECRET = 'test-secret-key-for-integration-tests-only';
let serverProc = null;
let dataDir = null;

const request = async (method, urlPath, { token, body } = {}) => {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, data: json };
};

const login = async (email, password) => {
  const r = await request('POST', '/auth/login', { body: { email, password } });
  return r.data.token;
};

module.exports = {
  BASE,
  request,
  login,

  start: async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-test-'));
    const testEnv = {
      ...process.env,
      DATA_DIR: dataDir,
      JWT_SECRET: SECRET,
      SEED_PROFILE: 'demo',
      SUPERADMIN_EMAIL: 'owner@agency.com',
      SUPERADMIN_PASSWORD: 'Own3r!Secret-2026'
    };
    execSync('node src/seed.js', {
      cwd: path.join(__dirname, '..'),
      env: testEnv,
      stdio: 'pipe'
    });
    serverProc = spawn('node', ['src/server.js'], {
      cwd: path.join(__dirname, '..'),
      env: { ...testEnv, PORT: String(PORT) },
      stdio: 'pipe'
    });
    for (let i = 0; i < 30; i++) {
      try {
        const r = await fetch(`${BASE}/health`);
        if (r.ok) return;
      } catch {}
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error('Test server failed to start');
  },

  stop: async () => {
    if (serverProc) serverProc.kill();
    if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
  }
};
