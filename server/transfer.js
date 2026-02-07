'use strict';

const fs = require('fs');
const path = require('path');
const tls = require('tls');
const crypto = require('crypto');
const crc32 = require('crc-32');
const { ensureCerts } = require('./tls');

const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks for better throughput
const TRANSFER_PORT_BASE = 53410;
let transferPort = TRANSFER_PORT_BASE;
let transferServer = null;
const activeTransfers = new Map();
let onTransferEvent = null;

function getReceiveDir(sessionId) {
  const homeDir = require('os').homedir();
  const dir = path.join(homeDir, 'Transfer-Received', sessionId || 'default');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function setTransferEventHandler(handler) {
  onTransferEvent = handler;
}

function startTransferServer(sessionId) {
  const certs = ensureCerts();

  transferServer = tls.createServer({
    cert: certs.cert,
    key: certs.key,
    rejectUnauthorized: false,
  }, (socket) => {
    handleIncomingTransfer(socket, sessionId);
  });

  return new Promise((resolve, reject) => {
    transferServer.listen(0, () => {
      transferPort = transferServer.address().port;
      console.log(`[Transfer] Server listening on port ${transferPort}`);
      resolve(transferPort);
    });
    transferServer.on('error', reject);
  });
}

function handleIncomingTransfer(socket, sessionId) {
  let headerReceived = false;
  let fileInfo = null;
  let writeStream = null;
  let receivedBytes = 0;
  let headerBuf = Buffer.alloc(0);
  let transferId = null;
  let fileCrc = 0;

  socket.on('data', (data) => {
    if (!headerReceived) {
      headerBuf = Buffer.concat([headerBuf, data]);

      // SECURITY: Limit header size to prevent memory exhaustion
      if (headerBuf.length > 65536) {
        socket.destroy();
        return;
      }

      const nullIdx = headerBuf.indexOf(0);
      if (nullIdx === -1) return;

      try {
        const headerStr = headerBuf.slice(0, nullIdx).toString('utf8');
        fileInfo = JSON.parse(headerStr);
      } catch {
        socket.destroy();
        return;
      }

      headerReceived = true;
      transferId = fileInfo.transferId || crypto.randomUUID();

      const receiveDir = getReceiveDir(sessionId);
      const relativePath = fileInfo.relativePath || fileInfo.name;
      // SECURITY: Prevent path traversal
      const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
      const filePath = path.join(receiveDir, safePath);

      // Double-check path is within receiveDir
      if (!filePath.startsWith(receiveDir)) {
        socket.destroy();
        return;
      }

      const fileDir = path.dirname(filePath);
      try {
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        writeStream = fs.createWriteStream(filePath);
      } catch (err) {
        console.error('[Transfer] Cannot create file:', err.message);
        socket.destroy();
        return;
      }

      activeTransfers.set(transferId, {
        id: transferId,
        name: fileInfo.name,
        size: fileInfo.size,
        received: 0,
        status: 'receiving',
        path: filePath,
      });

      if (onTransferEvent) {
        onTransferEvent({
          type: 'file_receiving',
          transferId,
          name: fileInfo.name,
          size: fileInfo.size,
        });
      }

      // Process remaining data after header
      const remaining = headerBuf.slice(nullIdx + 1);
      if (remaining.length > 0) {
        processChunk(remaining);
      }
    } else {
      processChunk(data);
    }
  });

  socket.on('end', () => {
    if (writeStream) {
      writeStream.end(() => {
        if (transferId && activeTransfers.has(transferId)) {
          const transfer = activeTransfers.get(transferId);
          transfer.status = 'complete';
          transfer.crc = fileCrc;

          // Verify CRC if sender included one
          const crcValid = !fileInfo.crc || fileInfo.crc === fileCrc;
          transfer.verified = crcValid;

          if (onTransferEvent) {
            onTransferEvent({
              type: 'file_received',
              transferId,
              file: transfer,
              verified: crcValid,
            });
          }

          if (!crcValid) {
            console.warn(`[Transfer] CRC mismatch for ${fileInfo.name}: expected ${fileInfo.crc}, got ${fileCrc}`);
          }
        }
      });
    }
  });

  socket.on('error', (err) => {
    console.error('[Transfer] Receive error:', err.message);
    if (writeStream) writeStream.end();
    if (transferId && activeTransfers.has(transferId)) {
      activeTransfers.get(transferId).status = 'error';
    }
  });

  function processChunk(data) {
    if (!writeStream) return;
    receivedBytes += data.length;

    // Compute running CRC32
    fileCrc = crc32.buf(data, fileCrc);

    // Backpressure: check if writeStream can accept more
    const canWrite = writeStream.write(data);

    const transfer = activeTransfers.get(transferId);
    if (transfer) {
      transfer.received = receivedBytes;
      if (onTransferEvent) {
        onTransferEvent({
          type: 'transfer_progress',
          transferId,
          received: receivedBytes,
          total: fileInfo.size,
          percent: Math.round((receivedBytes / fileInfo.size) * 100),
        });
      }
    }

    if (!canWrite) {
      socket.pause();
      writeStream.once('drain', () => socket.resume());
    }
  }
}

function sendFile(targetIp, targetPort, filePath, relativePath, transferId) {
  return new Promise((resolve, reject) => {
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const id = transferId || crypto.randomUUID();

    // Compute CRC32 of file first for integrity verification
    let fileCrc = 0;
    const crcStream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });
    crcStream.on('data', (chunk) => { fileCrc = crc32.buf(chunk, fileCrc); });
    crcStream.on('end', () => {
      const header = JSON.stringify({
        transferId: id,
        name: fileName,
        relativePath: relativePath || fileName,
        size: stats.size,
        crc: fileCrc,
        mimeType: require('mime-types').lookup(filePath) || 'application/octet-stream',
      });

      const headerBuf = Buffer.concat([Buffer.from(header, 'utf8'), Buffer.alloc(1, 0)]);

      activeTransfers.set(id, {
        id,
        name: fileName,
        size: stats.size,
        sent: 0,
        status: 'sending',
        path: filePath,
      });

      if (onTransferEvent) {
        onTransferEvent({ type: 'file_sending', transferId: id, name: fileName, size: stats.size });
      }

      const socket = tls.connect({
        host: targetIp,
        port: targetPort,
        rejectUnauthorized: false,
      }, () => {
        socket.write(headerBuf);

        const readStream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });
        let sentBytes = 0;

        readStream.on('data', (chunk) => {
          sentBytes += chunk.length;
          const canContinue = socket.write(chunk);

          const transfer = activeTransfers.get(id);
          if (transfer) transfer.sent = sentBytes;

          if (onTransferEvent) {
            onTransferEvent({
              type: 'transfer_progress',
              transferId: id,
              sent: sentBytes,
              total: stats.size,
              percent: Math.round((sentBytes / stats.size) * 100),
            });
          }

          if (!canContinue) {
            readStream.pause();
            socket.once('drain', () => readStream.resume());
          }
        });

        readStream.on('end', () => {
          socket.end();
          const transfer = activeTransfers.get(id);
          if (transfer) transfer.status = 'complete';
          if (onTransferEvent) {
            onTransferEvent({ type: 'file_sent', transferId: id, name: fileName, size: stats.size });
          }
          resolve({ transferId: id, name: fileName, size: stats.size });
        });

        readStream.on('error', (err) => {
          socket.destroy();
          const transfer = activeTransfers.get(id);
          if (transfer) transfer.status = 'error';
          reject(err);
        });
      });

      socket.on('error', (err) => {
        const transfer = activeTransfers.get(id);
        if (transfer) transfer.status = 'error';
        reject(err);
      });
    });
    crcStream.on('error', (err) => reject(err));
  });
}

function getTransferStatus(transferId) {
  return activeTransfers.get(transferId) || null;
}

function getAllTransfers() {
  return Array.from(activeTransfers.values());
}

function stopTransferServer() {
  if (transferServer) {
    transferServer.close();
    transferServer = null;
  }
}

module.exports = {
  startTransferServer,
  sendFile,
  getTransferStatus,
  getAllTransfers,
  setTransferEventHandler,
  stopTransferServer,
  getReceiveDir,
  CHUNK_SIZE,
};
