const API_BASE = '';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  getIdentity: () => request('/api/identity'),
  updateName: (name) => request('/api/identity/name', { method: 'PUT', body: JSON.stringify({ name }) }),
  getPeers: () => request('/api/peers'),
  setAvailable: (available) => request('/api/available', { method: 'POST', body: JSON.stringify({ available }) }),
  getAvailable: () => request('/api/available'),
  connect: (peer) => request('/api/connect', { method: 'POST', body: JSON.stringify({ peer }) }),
  verify: (code) => request('/api/verify', { method: 'POST', body: JSON.stringify({ code }) }),
  getSession: () => request('/api/session'),
  getPendingRequest: () => request('/api/pending-request'),
  endSession: () => request('/api/session/end', { method: 'POST' }),
  sendChat: (text) => request('/api/chat', { method: 'POST', body: JSON.stringify({ text }) }),
  getTransfers: () => request('/api/transfers'),
  getReceivedFiles: () => request('/api/received-files'),

  uploadFiles: async (files, relativePaths) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    if (relativePaths) {
      for (const p of relativePaths) {
        formData.append('relativePaths', p);
      }
    }
    const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(body.error || 'Upload failed');
    }
    return res.json();
  },
};
