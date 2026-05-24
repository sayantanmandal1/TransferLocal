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
        <div className="animate-spin w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Identity Card */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Monitor className="w-7 h-7 text-white" />
            </div>
            <div>
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                    onBlur={handleNameSave}
                    className="input text-lg font-semibold w-48"
                    maxLength={50}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{state.identity.name}</h2>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                  >
                    <Edit3 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {state.identity.id.substring(0, 8)}...
                </code>
                <button
                  onClick={copyId}
                  className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>
              </div>
              {state.identity.ips && (
                <p className="text-xs text-gray-400 mt-1">
                  {state.identity.ips.join(' • ')} : {state.identity.port}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Available Toggle */}
        <div className="mt-6 pt-6 border-t border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {state.available ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="font-medium">Available for connections</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {state.available ? 'Other devices can see you' : 'You are hidden from the network'}
                </p>
              </div>
            </div>
            <Toggle checked={state.available} onChange={handleToggleAvailable} />
          </div>
        </div>
      </motion.div>

      {/* Peers Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Nearby Devices</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {state.peers.length} {state.peers.length === 1 ? 'device' : 'devices'} found
          </span>
        </div>

        {state.peers.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-surface-200 dark:bg-surface-700 rounded-full flex items-center justify-center">
              <Wifi className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No devices found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {state.available
                ? 'Make sure other devices are running Transfer and are available'
                : 'Enable "Available for connections" to discover devices'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
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
