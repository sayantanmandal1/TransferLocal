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
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="card !p-4 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-neutral-800 border border-border rounded-md flex items-center justify-center">
            <Monitor className="w-4 h-4 text-neutral-400" />
          </div>
          <div>
            <h4 className="text-sm font-medium">{peer.name}</h4>
            <p className="text-xs text-muted-foreground">
              {peer.ip} · {peer.id.substring(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse-slow"></span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 pt-4 border-t border-border"
        >
          <div className="grid grid-cols-3 gap-3 text-xs mb-4">
            <div>
              <span className="text-muted-foreground">IP</span>
              <p className="font-mono mt-0.5">{peer.ip}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Port</span>
              <p className="font-mono mt-0.5">{peer.port}</p>
            </div>
            <div>
              <span className="text-muted-foreground">ID</span>
              <p className="font-mono mt-0.5 truncate">{peer.id.substring(0, 12)}</p>
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
                <span className="w-3.5 h-3.5 border-2 border-neutral-600 border-t-white rounded-full animate-spin"></span>
                Connecting...
              </>
            ) : (
              <>
                <Link className="w-3.5 h-3.5" />
                Establish Connection
              </>
            )}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
