'use strict';

const { exec } = require('child_process');
const os = require('os');
const dns = require('dns');

/**
 * Check network status: 'online' | 'local' | 'offline'
 */
function getNetworkStatus() {
  return new Promise((resolve) => {
    const interfaces = os.networkInterfaces();
    let hasLocalNetwork = false;

    for (const iface of Object.values(interfaces)) {
      for (const addr of iface) {
        if (addr.family === 'IPv4' && !addr.internal) {
          hasLocalNetwork = true;
          break;
        }
      }
      if (hasLocalNetwork) break;
    }

    if (!hasLocalNetwork) {
      resolve('offline');
      return;
    }

    dns.resolve('dns.google', (err) => {
      if (err) {
        resolve('local');
      } else {
        resolve('online');
      }
    });
  });
}

/**
 * Detect if mobile hotspot is active by checking for the 192.168.137.x interface
 */
function getHotspotStatus() {
  return new Promise((resolve) => {
    if (os.platform() !== 'win32') {
      resolve({ supported: false, active: false });
      return;
    }

    const interfaces = os.networkInterfaces();
    let hotspotActive = false;

    for (const iface of Object.values(interfaces)) {
      for (const addr of iface) {
        if (addr.family === 'IPv4' && addr.address.startsWith('192.168.137.')) {
          hotspotActive = true;
          break;
        }
      }
      if (hotspotActive) break;
    }

    resolve({ supported: true, active: hotspotActive });
  });
}

/**
 * Get hotspot network info using netsh
 */
function getHotspotInfo() {
  return new Promise((resolve) => {
    if (os.platform() !== 'win32') {
      resolve(null);
      return;
    }

    // Try to get hosted network info
    exec('netsh wlan show hostednetwork', { timeout: 5000 }, (err, stdout) => {
      if (!err && stdout) {
        const ssidMatch = stdout.match(/SSID name\s*:\s*"(.+?)"/);
        const statusMatch = stdout.match(/Status\s*:\s*(\S+)/);
        if (ssidMatch) {
          resolve({
            ssid: ssidMatch[1],
            active: statusMatch ? statusMatch[1].toLowerCase() === 'started' : false,
            method: 'hostednetwork',
          });
          return;
        }
      }

      // Try PowerShell to read Mobile Hotspot settings from registry
      exec(`powershell -Command "Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\icssvc\\Settings' -ErrorAction SilentlyContinue | Select-Object -Property TetheringSSID,TetheringPassword | ConvertTo-Json"`, { timeout: 5000 }, (err2, stdout2) => {
        if (!err2 && stdout2.trim()) {
          try {
            const data = JSON.parse(stdout2.trim());
            if (data.TetheringSSID) {
              resolve({
                ssid: data.TetheringSSID,
                password: data.TetheringPassword || null,
                method: 'mobile-hotspot',
              });
              return;
            }
          } catch {}
        }
        resolve(null);
      });
    });
  });
}

/**
 * Enable hotspot using netsh hosted network (works without internet)
 */
function enableHotspot() {
  return new Promise((resolve, reject) => {
    if (os.platform() !== 'win32') {
      reject(new Error('Only Windows supported'));
      return;
    }

    // First check if WiFi adapter is available
    exec('netsh wlan show interfaces', { timeout: 5000 }, (err, stdout) => {
      if (err || !stdout.includes('State')) {
        reject(new Error('WiFi adapter not found. Make sure WiFi is turned ON (you don\'t need internet, just the adapter).'));
        return;
      }

      if (stdout.includes('Hardware Off') || stdout.includes('disconnected')) {
        // WiFi adapter exists but may be off - that's ok for hosted network
      }

      // Generate a random password
      const password = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 4).toUpperCase();
      const ssid = `Transfer-${os.hostname().substring(0, 8)}`;

      // Set up and start hosted network
      const setupCmd = `netsh wlan set hostednetwork mode=allow ssid="${ssid}" key="${password}"`;
      exec(setupCmd, { timeout: 5000 }, (err2, stdout2, stderr2) => {
        if (err2) {
          // Hosted network not supported, try Mobile Hotspot via settings
          reject(new Error(`Hosted network not supported on this adapter. Please enable Mobile Hotspot manually:\n\nSettings → Network & Internet → Mobile hotspot → Turn ON\n\nKeep WiFi adapter ON (no internet needed).`));
          return;
        }

        exec('netsh wlan start hostednetwork', { timeout: 5000 }, (err3, stdout3) => {
          if (err3 || (stdout3 && stdout3.includes('cannot'))) {
            reject(new Error(`Could not start hotspot. Try manually:\n\nSettings → Network & Internet → Mobile hotspot → Turn ON\n\nMake sure WiFi adapter is ON.`));
            return;
          }

          // Wait for interface to come up
          setTimeout(() => {
            resolve({ ssid, password, method: 'hostednetwork' });
          }, 2000);
        });
      });
    });
  });
}

/**
 * Disable hotspot
 */
function disableHotspot() {
  return new Promise((resolve, reject) => {
    if (os.platform() !== 'win32') {
      reject(new Error('Only Windows supported'));
      return;
    }

    exec('netsh wlan stop hostednetwork', { timeout: 5000 }, (err) => {
      resolve(true); // Don't fail even if it errors
    });
  });
}

/**
 * Get the local IP on the hotspot network (192.168.137.x)
 */
function getHotspotIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal && addr.address.startsWith('192.168.137.')) {
        return addr.address;
      }
    }
  }
  // Fallback: any non-internal IPv4
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return null;
}

module.exports = {
  getNetworkStatus,
  getHotspotStatus,
  getHotspotInfo,
  enableHotspot,
  disableHotspot,
  getHotspotIP,
};