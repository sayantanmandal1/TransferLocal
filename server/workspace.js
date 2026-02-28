'use strict';

const { getSession } = require('./connection');
const { getAllTransfers } = require('./transfer');

/** Returns the full workspace state including session, files, messages and transfers */
function getWorkspaceState() {
  const session = getSession();
  if (!session) return null;

  return {
    sessionId: session.id,
    peer: session.peer,
    startedAt: session.startedAt,
    files: session.files || [],
    messages: session.messages || [],
    transfers: getAllTransfers(),
  };
}

function addFileToSession(fileInfo) {
  const session = getSession();
  if (!session) return false;
  session.files.push(fileInfo);
  return true;
}

function getMessages() {
  const session = getSession();
  if (!session) return [];
  return session.messages || [];
}

module.exports = { getWorkspaceState, addFileToSession, getMessages };
