'use strict';

const { exec } = require('child_process');
const os = require('os');
const dns = require('dns');

/**
 * Check network status: 'online' | 'local' | 'offline'
 * - online: has internet connectivity
 * - local: has local network (WiFi/hotspot) but no internet
 * - offline: no network interfaces active
 */
function getNetworkStatus() {
  return new Promise((resolve) => {
    // Check if we have any non-internal IPv4 addresses
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

    // Check internet connectivity by DNS lookup
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
 * Get mobile hotspot status on Windows
 */
function getHotspotStatus() {
  return new Promise((resolve) => {
    if (os.platform() !== 'win32') {
      resolve({ supported: false, reason: 'Only Windows supported' });
      return;
    }

    exec('powershell -Command "Get-NetAdapter | Where-Object { $_.InterfaceDescription -like \'*Wi-Fi Direct*\' -or $_.InterfaceDescription -like \'*Microsoft Wi-Fi Direct Virtual*\' } | Select-Object -First 1 Status"', (err, stdout) => {
      if (err) {
        // Try alternative check
        exec('netsh wlan show hostednetwork', (err2, stdout2) => {
          if (err2) {
            resolve({ supported: false, active: false });
            return;
          }
          const active = stdout2.includes('Started') || stdout2.includes('started');
          resolve({ supported: true, active });
        });
        return;
      }
      const active = stdout.includes('Up');
      resolve({ supported: true, active });
    });
  });
}

/**
 * Get hotspot info (SSID and password) from Windows settings
 */
function getHotspotInfo() {
  return new Promise((resolve) => {
    if (os.platform() !== 'win32') {
      resolve(null);
      return;
    }

    // Use PowerShell to read mobile hotspot settings from registry
    const cmd = `powershell -Command "
      try {
        $tetheringManager = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager,Windows.Networking.NetworkOperators,ContentType=WindowsRuntime]
        $connectionProfile = [Windows.Networking.Connectivity.NetworkInformation,Windows.Networking.Connectivity,ContentType=WindowsRuntime]::GetInternetConnectionProfile()
        if ($connectionProfile) {
          $manager = $tetheringManager::CreateFromConnectionProfile($connectionProfile)
          $config = $manager.GetCurrentAccessPointConfiguration()
          Write-Output (ConvertTo-Json @{ ssid = $config.Ssid; password = $config.Passphrase; band = $config.Band.ToString() })
        } else {
          Write-Output '{}'
        }
      } catch {
        Write-Output '{}'
      }
    "`;

    exec(cmd, { timeout: 5000 }, (err, stdout) => {
      if (err || !stdout.trim()) {
        // Fallback: try netsh
        exec('netsh wlan show hostednetwork', (err2, stdout2) => {
          if (err2) {
            resolve(null);
            return;
          }
          const ssidMatch = stdout2.match(/SSID name\s*:\s*"?(.+?)"?\s*$/m);
          resolve(ssidMatch ? { ssid: ssidMatch[1], password: null } : null);
        });
        return;
      }
      try {
        const info = JSON.parse(stdout.trim());
        if (info.ssid) {
          resolve(info);
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    });
  });
}

/**
 * Enable mobile hotspot on Windows
 */
function enableHotspot() {
  return new Promise((resolve, reject) => {
    if (os.platform() !== 'win32') {
      reject(new Error('Only Windows supported'));
      return;
    }

    const cmd = `powershell -Command "
      try {
        Add-Type -AssemblyName System.Runtime.WindowsRuntime
        $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
        
        $connectionProfile = [Windows.Networking.Connectivity.NetworkInformation,Windows.Networking.Connectivity,ContentType=WindowsRuntime]::GetInternetConnectionProfile()
        $tetheringManager = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager,Windows.Networking.NetworkOperators,ContentType=WindowsRuntime]::CreateFromConnectionProfile($connectionProfile)
        
        $startOp = $tetheringManager.StartTetheringAsync()
        $task = $asTask.MakeGenericMethod([Windows.Networking.NetworkOperators.NetworkOperatorTetheringOperationResult]).Invoke($null, @($startOp))
        $task.Wait()
        
        if ($task.Result.Status -eq 'Success') {
          Write-Output 'SUCCESS'
        } else {
          Write-Output ('FAILED:' + $task.Result.Status)
        }
      } catch {
        Write-Output ('ERROR:' + $_.Exception.Message)
      }
    "`;

    exec(cmd, { timeout: 15000 }, (err, stdout) => {
      if (err) {
        reject(new Error('Failed to enable hotspot. Try enabling manually in Settings > Mobile hotspot.'));
        return;
      }
      const result = stdout.trim();
      if (result === 'SUCCESS') {
        resolve(true);
      } else {
        reject(new Error(`Hotspot enable failed: ${result}. Try enabling manually in Settings > Mobile hotspot.`));
      }
    });
  });
}

/**
 * Disable mobile hotspot on Windows
 */
function disableHotspot() {
  return new Promise((resolve, reject) => {
    if (os.platform() !== 'win32') {
      reject(new Error('Only Windows supported'));
      return;
    }

    const cmd = `powershell -Command "
      try {
        Add-Type -AssemblyName System.Runtime.WindowsRuntime
        $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
        
        $connectionProfile = [Windows.Networking.Connectivity.NetworkInformation,Windows.Networking.Connectivity,ContentType=WindowsRuntime]::GetInternetConnectionProfile()
        $tetheringManager = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager,Windows.Networking.NetworkOperators,ContentType=WindowsRuntime]::CreateFromConnectionProfile($connectionProfile)
        
        $stopOp = $tetheringManager.StopTetheringAsync()
        $task = $asTask.MakeGenericMethod([Windows.Networking.NetworkOperators.NetworkOperatorTetheringOperationResult]).Invoke($null, @($stopOp))
        $task.Wait()
        Write-Output 'SUCCESS'
      } catch {
        Write-Output ('ERROR:' + $_.Exception.Message)
      }
    "`;

    exec(cmd, { timeout: 10000 }, (err, stdout) => {
      if (err) {
        reject(new Error('Failed to disable hotspot'));
        return;
      }
      resolve(true);
    });
  });
}

/**
 * Get the local IP on the hotspot network
 */
function getHotspotIP() {
  const interfaces = os.networkInterfaces();
  for (const [name, iface] of Object.entries(interfaces)) {
    // Mobile hotspot adapters on Windows typically use 192.168.137.x
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal && addr.address.startsWith('192.168.137.')) {
        return addr.address;
      }
    }
  }
  // Fallback: return any local IP
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
