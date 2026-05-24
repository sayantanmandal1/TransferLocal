import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Radio, Shield, Monitor, Smartphone, ArrowRight, RefreshCw, Copy, Check } from 'lucide-react';
import { api } from '../utils/api';
import { useApp } from '../context/AppContext';

export default function OfflineMode() {
  const { state } = useApp();
  const [networkStatus, setNetworkStatus] = useState(null);
  const [hotspotInfo, setHotspotInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState(null); // 'host' | 'join'

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const status = await api.getNetworkStatus();
      setNetworkStatus(status);
      if (status.hotspot?.active) {
        const info = await api.getHotspotInfo();
        setHotspotInfo(info);
      }
    } catch {
      // Server not reachable
    }
    setLoading(false);
  };

  const handleEnableHotspot = async () => {
    setEnabling(true);
    setError(null);
    try {
      const result = await api.enableHotspot();
      setHotspotInfo(result.info ? { ...result.info, ip: result.ip, port: result.port } : null);
      await checkStatus();
    } catch (err) {
      setError(err.message);
    }
    setEnabling(false);
  };

  const handleDisableHotspot = async () => {
    try {
      await api.disableHotspot();
      setHotspotInfo(null);
      await checkStatus();
    } catch (err) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = () => {
    if (!networkStatus) return 'text-muted-foreground';
    if (networkStatus.status === 'online') return 'text-emerald-400';
    if (networkStatus.status === 'local') return 'text-amber-400';
    return 'text-red-400';
  };

  const getStatusText = () => {
    if (!networkStatus) return 'Checking...';
    if (networkStatus.status === 'online') return 'Online (Internet)';
    if (networkStatus.status === 'local') return 'Local Network Only';
    return 'No Network';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  // Role selection screen
  if (!role) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4 bg-secondary border border-border rounded-lg flex items-center justify-center">
            <WifiOff className="w-6 h-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Offline Transfer Mode</h2>
          <p className="text-sm text-muted-foreground">
            Transfer files without internet using a local WiFi hotspot
          </p>
        </div>

        {/* Network Status */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${networkStatus?.status === 'online' ? 'bg-emerald-400' : networkStatus?.status === 'local' ? 'bg-amber-400' : 'bg-red-400'}`} />
              <span className="text-sm">{getStatusText()}</span>
            </div>
            <button onClick={checkStatus} className="p-1.5 rounded hover:bg-secondary transition-colors">
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setRole('host')}
            className="card !p-6 text-left hover:border-neutral-500 transition-colors"
          >
            <Monitor className="w-8 h-8 text-neutral-400 mb-3" />
            <h3 className="text-sm font-semibold mb-1">Host Hotspot</h3>
            <p className="text-xs text-muted-foreground">
              This device creates the WiFi hotspot. The other device connects to it.
            </p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setRole('join')}
            className="card !p-6 text-left hover:border-neutral-500 transition-colors"
          >
            <Smartphone className="w-8 h-8 text-neutral-400 mb-3" />
            <h3 className="text-sm font-semibold mb-1">Join Hotspot</h3>
            <p className="text-xs text-muted-foreground">
              Connect this device to the other device's hotspot network.
            </p>
          </motion.button>
        </div>

        {/* How it works */}
        <div className="mt-8 card !bg-secondary/50">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">How it works</h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-neutral-500 font-mono">1.</span>
              <span>One device creates a WiFi hotspot (no internet needed)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-neutral-500 font-mono">2.</span>
              <span>The other device connects to that hotspot</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-neutral-500 font-mono">3.</span>
              <span>Both devices discover each other on the local network</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-neutral-500 font-mono">4.</span>
              <span>Transfer files at full WiFi speed — no internet used</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Host view
  if (role === 'host') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => setRole(null)} className="text-xs text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1">
          ← Back
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-4 bg-secondary border border-border rounded-lg flex items-center justify-center">
            <Radio className="w-6 h-6 text-neutral-400" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Host Mode</h2>
          <p className="text-sm text-muted-foreground">Create a hotspot for the other device to connect</p>
        </div>

        {/* Hotspot Control */}
        <div className="card mb-4">
          {networkStatus?.hotspot?.active || hotspotInfo?.active ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-emerald-400">Hotspot Active</span>
              </div>

              {hotspotInfo && (
                <div className="bg-secondary border border-border rounded-md p-4 space-y-3">
                  {hotspotInfo.ssid && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Network Name</p>
                        <p className="text-sm font-mono font-medium">{hotspotInfo.ssid}</p>
                      </div>
                      <button onClick={() => copyToClipboard(hotspotInfo.ssid)} className="p-1.5 rounded hover:bg-card">
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  )}
                  {hotspotInfo.password && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Password</p>
                        <p className="text-sm font-mono font-medium">{hotspotInfo.password}</p>
                      </div>
                      <button onClick={() => copyToClipboard(hotspotInfo.password)} className="p-1.5 rounded hover:bg-card">
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                  {(hotspotInfo.ip || networkStatus?.hotspotIP) && (
                    <div>
                      <p className="text-xs text-muted-foreground">Access Transfer at</p>
                      <p className="text-sm font-mono font-medium">http://{hotspotInfo.ip || networkStatus.hotspotIP}:{hotspotInfo.port || 53401}</p>
                    </div>
                  )}
                </div>
              )}

              <button onClick={handleDisableHotspot} className="btn-secondary w-full">
                Disable Hotspot
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enable the mobile hotspot so the other device can connect to your local network.
              </p>

              <button
                onClick={handleEnableHotspot}
                disabled={enabling}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {enabling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Enabling...
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4" />
                    Enable Hotspot
                  </>
                )}
              </button>

              {error && (
                <div className="bg-red-950/30 border border-red-900/50 rounded-md p-3">
                  <p className="text-xs text-red-400">{error}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You can also enable it manually: Settings → Network → Mobile hotspot
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual Instructions */}
        <div className="card !bg-secondary/50">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Manual Setup (Recommended)</h4>
          <div className="bg-amber-950/20 border border-amber-900/30 rounded-md p-2.5 mb-3">
            <p className="text-xs text-amber-400">⚠ WiFi adapter must stay ON. You don't need internet — just the adapter.</p>
          </div>
          <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
            <li>Keep WiFi adapter ON (disconnect from any network if you want)</li>
            <li>Open Settings → Network & Internet → Mobile hotspot</li>
            <li>Toggle it ON — it works without internet</li>
            <li>Note the network name and password</li>
            <li>On the other device, connect to that WiFi network</li>
            <li>Turn on "Available for connections" on both devices</li>
            <li>They'll auto-discover each other — switch back to Online mode to connect</li>
          </ol>
        </div>

        {/* Peer status */}
        {state.peers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card mt-4 border-emerald-900/50"
          >
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Device Connected!</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {state.peers.length} peer(s) found. Go back to Home to connect and transfer files.
            </p>
          </motion.div>
        )}
      </div>
    );
  }

  // Join view
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => setRole(null)} className="text-xs text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1">
        ← Back
      </button>

      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-4 bg-secondary border border-border rounded-lg flex items-center justify-center">
          <Smartphone className="w-6 h-6 text-neutral-400" />
        </div>
        <h2 className="text-lg font-semibold mb-1">Join Mode</h2>
        <p className="text-sm text-muted-foreground">Connect to the host device's hotspot</p>
      </div>

      {/* Connection Status */}
      <div className="card mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-2 h-2 rounded-full ${networkStatus?.status !== 'offline' ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-sm">{getStatusText()}</span>
        </div>

        {networkStatus?.status === 'offline' ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect to the host's WiFi hotspot to proceed.
            </p>
            <div className="bg-secondary border border-border rounded-md p-4">
              <h4 className="text-xs font-medium mb-2">Steps:</h4>
              <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                <li>Open your WiFi settings</li>
                <li>Find and connect to the host's hotspot network</li>
                <li>Enter the password provided by the host</li>
                <li>Come back here — devices will auto-discover</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {state.peers.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-emerald-950/20 border border-emerald-900/40 rounded-md p-3"
              >
                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">Connected & Peer Found!</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {state.peers.length} peer(s) discovered. Go back to Home to connect and transfer files.
                </p>
              </motion.div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Connected to local network. Searching for peers...
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Scanning...</span>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Make sure "Available for connections" is turned ON on both devices.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Security note */}
      <div className="card !bg-secondary/50">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-medium mb-1">Secure & Private</h4>
            <p className="text-xs text-muted-foreground">
              All transfers happen directly between devices over the local hotspot. No data leaves the network. Transfers are encrypted with TLS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}