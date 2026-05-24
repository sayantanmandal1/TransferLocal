'use strict';

const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

const CERTS_DIR = path.join(__dirname, '..', 'certs');
const CERT_PATH = path.join(CERTS_DIR, 'cert.pem');
const KEY_PATH = path.join(CERTS_DIR, 'key.pem');

function ensureCerts() {
  if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
    return {
      cert: fs.readFileSync(CERT_PATH, 'utf8'),
      key: fs.readFileSync(KEY_PATH, 'utf8'),
    };
  }

  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true });
  }

  const attrs = [{ name: 'commonName', value: 'Transfer Local' }];
  const opts = {
    days: 3650,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      { name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }, { type: 7, ip: '127.0.0.1' }] },
    ],
  };

  const pems = selfsigned.generate(attrs, opts);

  fs.writeFileSync(CERT_PATH, pems.cert, 'utf8');
  fs.writeFileSync(KEY_PATH, pems.private, 'utf8');

  console.log('[TLS] Generated self-signed certificates in ./certs/');

  return { cert: pems.cert, key: pems.private };
}

module.exports = { ensureCerts, CERT_PATH, KEY_PATH };
