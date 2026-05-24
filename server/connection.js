'use strict';

const crypto = require('crypto');
const WebSocket = require('ws');
const { getIdentity } = require('./identity');
const { getLocalIPs } = require('./discovery');

let activeSession = null;
let pendingRequest = null;
let verificationCode = null;
let codeTimeout = null;
let peerWs = null;
let onSessionEvent = null;
let targetPeerInfo = null;

function generateCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function setSessionEventHandler(handler) {
  onSessionEvent = handler;
}

function initiateConnection(targetPeer, serverPort) {
  return new Promise((resolve, reject) => {
    if (activeSession) {
      reject(new Error('Already in an active session'));
      return;
    }

    const identity = getIdentity();
    const localIPs = getLocalIPs();
    verificationCode = generateCode();

    targetPeerInfo = { id: targetPeer.id, name: targetPeer.name, ip: targetPeer.ip, port: targetPeer.port };

    const wsUrl = `ws://${targetPeer.ip}:${targetPeer.port}/ws/peer`;

    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'connect_request',
        from: {
          id: identity.id,
          name: identity.name,
          ip: localIPs[0] || '0.0.0.0',
          port: serverPort,
        },
      }));

      peerWs = ws;

      // Set code expiry (60s)
      codeTimeout = setTimeout(() => {
        if (!activeSession) {
          ws.close();
          peerWs = null;
          verificationCode = null;
          if (onSessionEvent) onSessionEvent({ type: 'code_expired' });
        }
      }, 60000);

      resolve({ code: verificationCode, target: targetPeer });
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handlePeerMessage(msg, ws);
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      if (activeSession) {
        endSession('peer_disconnected');
      }
      peerWs = null;
    });

    ws.on('error', (err) => {
      reject(new Error(`Connection failed: ${err.message}`));
    });
  });
}

function handleIncomingPeerConnection(ws) {
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handlePeerMessage(msg, ws);
    } catch {
      // Ignore malformed messages
    }
  });

  ws.on('close', () => {
    if (activeSession && peerWs === ws) {
      endSession('peer_disconnected');
    }
    if (pendingRequest && pendingRequest.ws === ws) {
      pendingRequest = null;
      if (onSessionEvent) onSessionEvent({ type: 'request_cancelled' });
    }
  });
}

function handlePeerMessage(msg, ws) {
  switch (msg.type) {
    case 'connect_request':
      pendingRequest = { ...msg.from, ws };
      if (onSessionEvent) {
        onSessionEvent({ type: 'incoming_request', from: msg.from });
      }
      break;

    case 'verify_code':
      if (verificationCode && msg.code === verificationCode) {
        clearTimeout(codeTimeout);
        codeTimeout = null;
        verificationCode = null;

        // Initiator side: peer info comes from msg.peer (receiver's identity + IP from targetPeerInfo)
        activeSession = {
          id: crypto.randomUUID(),
          peer: {
            id: msg.peer?.id || targetPeerInfo?.id,
            name: msg.peer?.name || targetPeerInfo?.name,
            ip: msg.peer?.ip || targetPeerInfo?.ip,
            port: msg.peer?.port || targetPeerInfo?.port,
          },
          startedAt: Date.now(),
          files: [],
          messages: [],
        };
        targetPeerInfo = null;

        ws.send(JSON.stringify({ type: 'connection_established', session: activeSession.id }));
        peerWs = ws;

        if (onSessionEvent) {
          onSessionEvent({ type: 'session_started', session: activeSession });
        }
      } else {
        ws.send(JSON.stringify({ type: 'code_rejected' }));
        if (onSessionEvent) onSessionEvent({ type: 'code_rejected' });
      }
      break;

    case 'connection_established':
      // Receiver side: peer info comes from pendingRequest (initiator's connect_request data)
      activeSession = {
        id: msg.session,
        peer: pendingRequest ? { id: pendingRequest.id, name: pendingRequest.name, ip: pendingRequest.ip, port: pendingRequest.port } : {},
        startedAt: Date.now(),
        files: [],
        messages: [],
      };
      pendingRequest = null;
      peerWs = ws;
      if (onSessionEvent) {
        onSessionEvent({ type: 'session_started', session: activeSession });
      }
      break;

    case 'chat_message':
      if (activeSession) {
        const chatMsg = { from: 'peer', text: msg.text, timestamp: Date.now() };
        activeSession.messages.push(chatMsg);
        if (onSessionEvent) onSessionEvent({ type: 'chat_message', message: chatMsg });
      }
      break;

    case 'transfer_port':
      if (activeSession) {
        activeSession.peer.transferPort = msg.port;
        if (onSessionEvent) onSessionEvent({ type: 'transfer_port', port: msg.port });
      }
      break;

    case 'file_incoming':
      if (onSessionEvent) onSessionEvent({ type: 'file_incoming', file: msg.file });
      break;

    case 'file_chunk':
      if (onSessionEvent) onSessionEvent({ type: 'file_chunk', ...msg });
      break;

    case 'file_complete':
      if (activeSession) {
        activeSession.files.push(msg.file);
        if (onSessionEvent) onSessionEvent({ type: 'file_complete', file: msg.file });
      }
      break;

    case 'code_rejected':
      if (onSessionEvent) onSessionEvent({ type: 'code_rejected' });
      break;

    case 'session_end':
      endSession('peer_ended');
      break;

    default:
      if (onSessionEvent) onSessionEvent({ type: 'peer_message', msg });
      break;
  }
}

function verifyCode(code) {
  if (!pendingRequest) {
    return { success: false, error: 'No pending request' };
  }

  const identity = getIdentity();
  const localIPs = getLocalIPs();
  const ws = pendingRequest.ws;

  ws.send(JSON.stringify({
    type: 'verify_code',
    code: code.toUpperCase(),
    peer: {
      id: identity.id,
      name: identity.name,
      ip: localIPs[0] || '0.0.0.0',
      port: parseInt(process.env.TRANSFER_PORT, 10) || 53401,
    },
  }));

  return { success: true, waiting: true };
}

function sendChatMessage(text) {
  if (!activeSession || !peerWs || peerWs.readyState !== WebSocket.OPEN) {
    return false;
  }

  const msg = { from: 'self', text, timestamp: Date.now() };
  activeSession.messages.push(msg);
  peerWs.send(JSON.stringify({ type: 'chat_message', text }));

  if (onSessionEvent) onSessionEvent({ type: 'chat_message', message: msg });
  return true;
}

function endSession(reason = 'manual') {
  if (peerWs && peerWs.readyState === WebSocket.OPEN) {
    peerWs.send(JSON.stringify({ type: 'session_end', reason }));
    peerWs.close();
  }

  const session = activeSession;
  activeSession = null;
  peerWs = null;
  pendingRequest = null;
  verificationCode = null;

  if (codeTimeout) {
    clearTimeout(codeTimeout);
    codeTimeout = null;
  }

  if (onSessionEvent) {
    onSessionEvent({ type: 'session_ended', reason, session });
  }
}

function getSession() {
  return activeSession;
}

function getPendingRequest() {
  return pendingRequest ? { id: pendingRequest.id, name: pendingRequest.name, ip: pendingRequest.ip, port: pendingRequest.port } : null;
}

function getPeerWs() {
  return peerWs;
}

module.exports = {
  setSessionEventHandler,
  initiateConnection,
  handleIncomingPeerConnection,
  verifyCode,
  sendChatMessage,
  endSession,
  getSession,
  getPendingRequest,
  getPeerWs,
  generateCode,
};