'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');
const multer = require('multer');
const os = require('os');

const { ensureCerts } = require('./tls');
const { getIdentity, updateName } = require('./identity');
const { startDiscovery, setAvailable, getPeerList, isAvailable, getLocalIPs } = require('./discovery');
const {
  setSessionEventHandler,
  initiateConnection,
  handleIncomingPeerConnection,
  verifyCode,
  sendChatMessage,
  endSession,
  getSession,
  getPendingRequest,
  getPeerWs,
} = require('./connection');
const {
  startTransferServer,
  sendFile,
  getAllTransfers,
  setTransferEventHandler,
  getReceiveDir,
} = require('./transfer');
const { getWorkspaceState } = require('./workspace');

const SERVER_PORT = parseInt(process.env.TRANSFER_PORT, 10) || 53401;
const app = express();
const certs = ensureCerts();
const server = https.createServer({ cert: certs.cert, key: certs.key }, app);

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// Serve static frontend
const staticDir = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
}

// File upload configuration
const upload = multer({
  dest: path.join(os.tmpdir(), 'transfer-uploads'),
  limits: { fileSize: Infinity },
});

// --- REST API ---

app.get('/api/identity', (req, res) => {
  const identity = getIdentity();
  const localIPs = getLocalIPs();
  res.json({ ...identity, ips: localIPs, port: SERVER_PORT });
});

app.put('/api/identity/name', (req, res) => {
  try {
    const identity = updateName(req.body.name);
    res.json(identity);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/peers', (req, res) => {
  res.json(getPeerList());
});

app.post('/api/available', (req, res) => {
  const { available } = req.body;
  setAvailable(!!available, SERVER_PORT);
  res.json({ available: !!available });
});

app.get('/api/available', (req, res) => {
  res.json({ available: isAvailable() });
});

app.post('/api/connect', async (req, res) => {
  try {
    const { peer } = req.body;
    if (!peer || !peer.ip || !peer.port) {
      return res.status(400).json({ error: 'Peer IP and port required' });
    }
    const result = await initiateConnection(peer, SERVER_PORT);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/verify', (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code is required' });
  }
  const result = verifyCode(code);
  res.json(result);
});

app.get('/api/session', (req, res) => {
  const state = getWorkspaceState();
  if (!state) {
    return res.json({ active: false });
  }
  res.json({ active: true, ...state });
});

app.get('/api/pending-request', (req, res) => {
  const pending = getPendingRequest();
  res.json({ pending: !!pending, request: pending });
});

app.post('/api/session/end', (req, res) => {
  endSession('manual');
  res.json({ ended: true });
});

app.post('/api/chat', (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }
  const success = sendChatMessage(text.substring(0, 10000));
  res.json({ success });
});

app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    const session = getSession();
    if (!session) {
      return res.status(400).json({ error: 'No active session' });
    }

    const peerWs = getPeerWs();
    if (!peerWs) {
      return res.status(400).json({ error: 'Peer not connected' });
    }

    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const relativePaths = req.body.relativePaths
      ? (Array.isArray(req.body.relativePaths) ? req.body.relativePaths : [req.body.relativePaths])
      : files.map(f => f.originalname);

    // Get peer's transfer port (wait up to 3s for it to arrive)
    const peerInfo = session.peer;
    let transferPort = peerInfo.transferPort;

    if (!transferPort) {
      for (let retry = 0; retry < 30 && !transferPort; retry++) {
        await new Promise(r => setTimeout(r, 100));
        transferPort = session.peer.transferPort;
      }
      if (!transferPort) {
        // Clean up temp files
        for (const file of files) fs.unlink(file.path, () => {});
        return res.status(503).json({ error: 'Peer transfer server not ready. Please try again.' });
      }
    }

    if (!peerInfo.ip) {
      for (const file of files) fs.unlink(file.path, () => {});
      return res.status(400).json({ error: 'Peer IP address unknown' });
    }

    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = relativePaths[i] || file.originalname;

      const result = await sendFile(
        peerInfo.ip,
        transferPort,
        file.path,
        relativePath
      );
      results.push(result);

      // Clean up temp file
      fs.unlink(file.path, () => {});
    }

    res.json({ success: true, files: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transfers', (req, res) => {
  res.json(getAllTransfers());
});

app.get('/api/received-files', (req, res) => {
  const session = getSession();
  if (!session) return res.json([]);
  const dir = getReceiveDir(session.id);
  try {
    const files = listFilesRecursive(dir, dir);
    res.json(files);
  } catch {
    res.json([]);
  }
});

app.get('/api/download/:filename(*)', (req, res) => {
  const session = getSession();
  if (!session) return res.status(404).json({ error: 'No session' });
  const dir = getReceiveDir(session.id);
  const requestedPath = decodeURIComponent(req.params.filename);
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(dir, safePath);
  // SECURITY: prevent path traversal
  if (!filePath.startsWith(dir)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.download(filePath);
});

// SPA fallback
app.get('*', (req, res) => {
  const indexPath = path.join(staticDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Frontend not built. Run: npm run build' });
  }
});

// --- WebSocket ---

const wss = new WebSocketServer({ server, path: '/ws' });
const peerWss = new WebSocketServer({ server, path: '/ws/peer' });
const browserClients = new Set();

wss.on('connection', (ws) => {
  browserClients.add(ws);

  // Send initial state
  ws.send(JSON.stringify({ type: 'identity', data: getIdentity() }));
  ws.send(JSON.stringify({ type: 'peers', data: getPeerList() }));
  ws.send(JSON.stringify({ type: 'available', data: isAvailable() }));

  const session = getSession();
  if (session) {
    ws.send(JSON.stringify({ type: 'session', data: getWorkspaceState() }));
  }

  ws.on('close', () => browserClients.delete(ws));
});

peerWss.on('connection', (ws) => {
  handleIncomingPeerConnection(ws);
});

function broadcastToBrowsers(event) {
  const message = JSON.stringify(event);
  for (const client of browserClients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}

// Session events → browser
setSessionEventHandler((event) => {
  broadcastToBrowsers(event);

  // When session starts, start transfer server and share port
  if (event.type === 'session_started') {
    startTransferServer(event.session.id)
      .then((port) => {
        const peerWs = getPeerWs();
        if (peerWs && peerWs.readyState === 1) {
          peerWs.send(JSON.stringify({ type: 'transfer_port', port }));
        }
        broadcastToBrowsers({ type: 'transfer_ready', port });
      })
      .catch((err) => {
        console.error('[Transfer] Server startup failed:', err.message);
        broadcastToBrowsers({ type: 'transfer_error', error: err.message });
      });
  }
});

// Transfer events → browser
setTransferEventHandler((event) => {
  broadcastToBrowsers(event);
});

// Discovery peer list changes → browser
startDiscovery(SERVER_PORT, (peers) => {
  broadcastToBrowsers({ type: 'peers', data: peers });
});

// --- Start ---

server.listen(SERVER_PORT, '0.0.0.0', () => {
  const identity = getIdentity();
  const localIPs = getLocalIPs();
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║           Transfer - File Sharing App            ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Device: ${identity.name.padEnd(39)}║`);
  console.log(`║  ID:     ${identity.id.substring(0, 8).padEnd(39)}║`);
  console.log(`║  Port:   ${String(SERVER_PORT).padEnd(39)}║`);
  console.log('╠══════════════════════════════════════════════════╣');
  localIPs.forEach(ip => {
    console.log(`║  → https://${ip}:${SERVER_PORT}`.padEnd(51) + '║');
  });
  console.log(`║  → https://localhost:${SERVER_PORT}`.padEnd(51) + '║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  endSession('shutdown');
  server.close();
  process.exit(0);
});

// --- Helpers ---

function listFilesRecursive(dir, baseDir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(fullPath, baseDir));
    } else {
      results.push({
        name: entry.name,
        path: path.relative(baseDir, fullPath),
        size: fs.statSync(fullPath).size,
      });
    }
  }
  return results;
}
