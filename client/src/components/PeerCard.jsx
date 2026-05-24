import { useState } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Link, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';

export default function PeerCard({ peer }) {
  const { dispatch } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await api.connect(peer);
      dispatch({ type: 'SET_VERIFICATION_CODE', data: result.code });
    } catch (err) {
      console.error('Connection failed:', err);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="card !p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold">{peer.name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {peer.ip}:{peer.port} • {peer.id.substring(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse-slow"></span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700"
        >
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div>
              <span className="text-gray-500 dark:text-gray-400">IP Address</span>
              <p className="font-mono font-medium">{peer.ip}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Port</span>
              <p className="font-mono font-medium">{peer.port}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Device ID</span>
              <p className="font-mono font-medium text-xs">{peer.id}</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleConnect();
            }}
            disabled={connecting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {connecting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Connecting...
              </>
            ) : (
              <>
                <Link className="w-4 h-4" />
                Establish Connection
              </>
            )}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
