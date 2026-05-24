'use strict';

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const CONFIG_PATH = path.join(__dirname, 'config.json');

let identity = null;

function loadIdentity() {
  if (identity) return identity;

  if (fs.existsSync(CONFIG_PATH)) {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    identity = JSON.parse(raw);
    return identity;
  }

  identity = {
    id: uuidv4(),
    name: `Device-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(identity, null, 2), 'utf8');
  console.log(`[Identity] Created new device identity: ${identity.name} (${identity.id})`);
  return identity;
}

function updateName(newName) {
  if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
    throw new Error('Name must be a non-empty string');
  }
  const sanitized = newName.trim().substring(0, 50);
  identity = loadIdentity();
  identity.name = sanitized;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(identity, null, 2), 'utf8');
  return identity;
}

function getIdentity() {
  return loadIdentity();
}

module.exports = { getIdentity, updateName };
