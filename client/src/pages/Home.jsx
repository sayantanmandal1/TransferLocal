import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Edit3, Copy, Check, Monitor } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';
import PeerCard from '../components/PeerCard';
import Toggle from '../components/Toggle';

export default function Home() {
  const { state, dispatch } = useApp();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.identity) {
      setNameInput(state.identity.name);
    }
  }, [state.identity]);

  const handleNameSave = async () => {
    if (nameInput.trim() && nameInput !== state.identity?.name) {
      try {
        const updated = await api.updateName(nameInput.trim());
        dispatch({ type: 'SET_IDENTITY', data: updated });
      } catch {
        setNameInput(state.identity?.name || '');
      }
    }
    setEditing(false);
  };

  const handleToggleAvailable = async (val) => {
    try {
      await api.setAvailable(val);
      dispatch({ type: 'SET_AVAILABLE', data: val });
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  const copyId = () => {
    if (state.identity?.id) {
      navigator.clipboard.writeText(state.identity.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!state.identity) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Identity Card */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-neutral-800 border border-border rounded-lg flex items-center justify-center">
              <Monitor className="w-5 h-5 text-neutral-300" />
            </div>
            <div>
              {editing ? (
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                  onBlur={handleNameSave}
                  className="input text-base font-medium w-44"
                  maxLength={50}
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-medium">{state.identity.name}</h2>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1 rounded hover:bg-accent transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <code className="text-xs text-muted-foreground font-mono">
                  {state.identity.id.substring(0, 8)}
                </code>
                <button
                  onClick={copyId}
                  className="p-0.5 rounded hover:bg-accent transition-colors"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>
              </div>
              {state.identity.ips && (
                <p className="text-xs text-muted-foreground mt-1">
                  {state.identity.ips.join(' · ')} : {state.identity.port}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Available Toggle */}
        <div className="mt-5 pt-5 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {state.available ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">Available for connections</p>
                <p className="text-xs text-muted-foreground">
                  {state.available ? 'Visible to nearby devices' : 'Hidden from network'}
                </p>
              </div>
            </div>
            <Toggle checked={state.available} onChange={handleToggleAvailable} />
          </div>
        </div>
      </motion.div>

      {/* Peers Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Nearby Devices</h3>
          <span className="text-xs text-muted-foreground">
            {state.peers.length} found
          </span>
        </div>

        {state.peers.length === 0 ? (
          <div className="card text-center py-10">
            <Wifi className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No devices found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {state.available
                ? 'Ensure other devices are running Transfer'
                : 'Toggle availability to discover devices'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {state.peers.map((peer) => (
                <PeerCard key={peer.id} peer={peer} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
