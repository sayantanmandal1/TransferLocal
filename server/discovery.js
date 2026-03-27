'use strict';

const dgram = require('dgram');
const os = require('os');
const { getIdentity } = require('./identity');

const DISCOVERY_PORT = 53400;
const BROADCAST_INTERVAL = 2000;
const PEER_TIMEOUT = 8000; // increased for reliability

let socket = null;
let broadcastTimer = null;
let available = false;
const peers = new Map();
let onPeersChanged = null;

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ips.push(addr.address);
      }
    }
  }
  return ips;
}

function getBroadcastAddresses() {
  const interfaces = os.networkInterfaces();
  const broadcasts = [];
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal && addr.netmask) {
        const ip = addr.address.split('.').map(Number);
        const mask = addr.netmask.split('.').map(Number);
        const broadcast = ip.map((octet, i) => (octet | (~mask[i] & 255)));
        broadcasts.push(broadcast.join('.'));
      }
    }
  }
  return broadcasts.length > 0 ? broadcasts : ['255.255.255.255'];
}

function startDiscovery(serverPort, changeCallback) {
  onPeersChanged = changeCallback;

  socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

  socket.on('message', (msg, rinfo) => {
    try {
      const data = JSON.parse(msg.toString());
      const identity = getIdentity();

      if (data.id === identity.id) return;
      if (data.type !== 'transfer-beacon') return;

      const peerId = data.id;
      const isNew = !peers.has(peerId);

      peers.set(peerId, {
        id: data.id,
        name: data.name,
        ip: rinfo.address,
        port: data.port,
        lastSeen: Date.now(),
      });

      if (isNew && onPeersChanged) {
        onPeersChanged(getPeerList());
      }
    } catch {
      // Ignore malformed packets
    }
  });

  socket.on('error', (err) => {
    console.error('[Discovery] Socket error:', err.message);
  });

  socket.bind(DISCOVERY_PORT, () => {
    socket.setBroadcast(true);
    console.log(`[Discovery] Listening on UDP port ${DISCOVERY_PORT}`);
  });

  // Prune stale peers periodically
  setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [id, peer] of peers) {
      if (now - peer.lastSeen > PEER_TIMEOUT) {
        peers.delete(id);
        changed = true;
      }
    }
    if (changed && onPeersChanged) {
      onPeersChanged(getPeerList());
    }
  }, 2000);
}

function setAvailable(isAvailable, serverPort) {
  available = isAvailable;

  if (available && !broadcastTimer) {
    const broadcast = () => {
      if (!available || !socket) return;
      const identity = getIdentity();
      const message = JSON.stringify({
        type: 'transfer-beacon',
        id: identity.id,
        name: identity.name,
        port: serverPort,
        version: '1.0.0',
      });
      const buf = Buffer.from(message);
      const broadcasts = getBroadcastAddresses();
      for (const addr of broadcasts) {
        socket.send(buf, 0, buf.length, DISCOVERY_PORT, addr);
      }
    };
    broadcast();
    broadcastTimer = setInterval(broadcast, BROADCAST_INTERVAL);
    console.log('[Discovery] Broadcasting started');
  } else if (!available && broadcastTimer) {
    clearInterval(broadcastTimer);
    broadcastTimer = null;
    console.log('[Discovery] Broadcasting stopped');
  }
}

function getPeerList() {
  return Array.from(peers.values());
}

function isAvailable() {
  return available;
}

function stopDiscovery() {
  if (broadcastTimer) {
    clearInterval(broadcastTimer);
    broadcastTimer = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
}

module.exports = { startDiscovery, setAvailable, getPeerList, isAvailable, stopDiscovery, getLocalIPs };
