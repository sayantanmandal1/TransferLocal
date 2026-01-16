'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const CONFIG_PATH = path.join(__dirname, 'config.json');

let identity = null;

// Loads or creates device identity, regenerating if copied from another machine
function loadIdentity() {
  if (identity) return identity;

  if (fs.existsSync(CONFIG_PATH)) {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const stored = JSON.parse(raw);

    // If config was copied from another machine, regenerate identity
    if (stored.hostname && stored.hostname !== os.hostname()) {
      console.log(`[Identity] Config from different host (${stored.hostname}), regenerating...`);
      identity = createNewIdentity();
      return identity;
    }

    identity = stored;
    return identity;
  }

  identity = createNewIdentity();
  return identity;
}

function createNewIdentity() {
  const newIdentity = {
    id: uuidv4(),
    name: `Device-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    hostname: os.hostname(),
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(newIdentity, null, 2), 'utf8');
  console.log(`[Identity] Created new device identity: ${newIdentity.name} (${newIdentity.id})`);
  return newIdentity;
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
