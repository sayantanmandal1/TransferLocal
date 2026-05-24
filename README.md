# Transfer — Local Network File Sharing

A self-hosted, peer-to-peer file transfer application. Share files of any size between devices on your local network with a polished web UI, encrypted connections, and real-time chat.

## Features

- **Zero config** — Run one command, open in browser, done
- **Any file, any size** — Optimized streaming for 10GB+ files with backpressure handling
- **Peer discovery** — Automatically finds other Transfer instances on your LAN
- **Verified connections** — 6-character code handshake prevents unauthorized access
- **Real-time chat** — Send text messages alongside file transfers
- **Folder upload** — Preserves directory structure
- **Drag & drop** — Drop files/folders directly into the browser
- **TLS encrypted** — All peer-to-peer traffic is encrypted (self-signed certs)
- **Dark/light theme** — Smooth animated UI with Framer Motion
- **Cross-platform** — Works on any device with Node.js 18+ and a browser

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build the frontend
npm run build

# 3. Start the server
npm start
```

Then open **https://localhost:53401** in your browser (accept the self-signed certificate warning).

## How It Works

### 1. Start on each device
Run `npm start` on every device you want to connect. Each device gets a unique ID and name.

### 2. Make yourself available
Toggle "Available for connections" to be discoverable by other devices on the same network.

### 3. Connect
Click on a discovered device → "Establish Connection". A 6-character code appears on your screen.

### 4. Verify
On the other device, you'll see the incoming connection request. Enter the 6-character code to verify and establish the connection.

### 5. Transfer
Once connected, you'll enter a shared workspace where you can:
- Upload files (any type, any size)
- Upload entire folders (structure preserved)
- Drag & drop files
- Send text messages in real-time

### 6. End session
Click "End Session" when done, or just close the app.

## Development

```bash
# Run in development mode (hot-reload frontend + server)
npm run dev
```

Frontend: http://localhost:5173 (Vite dev server with proxy to backend)
Backend: https://localhost:53401

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `TRANSFER_PORT` | `53401` | HTTPS server port |

The device identity and name are stored in `server/config.json` (auto-created on first run).

Received files are saved to `~/Transfer-Received/<session-id>/`.

## Network Requirements

- All devices must be on the **same local network** (same subnet)
- **UDP port 53400** must be open for device discovery (broadcast)
- **TCP port 53401** (or custom) must be accessible between devices
- No internet or cloud services required

## Architecture

```
┌─────────────────────┐         UDP Broadcast         ┌─────────────────────┐
│   Device A          │◄─────────────────────────────►│   Device B          │
│                     │                                │                     │
│  Browser ↔ Server   │──── TLS WebSocket (control) ──│  Server ↔ Browser   │
│                     │──── TLS TCP Stream (files) ────│                     │
└─────────────────────┘                                └─────────────────────┘
```

## Security

- Self-signed TLS certificates (auto-generated on first run in `./certs/`)
- 6-character verification code prevents drive-by connections
- Path traversal protection on file receives
- Input validation on all API endpoints
- No secrets stored in code — identity generated per-device

## License

MIT
