import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, X, Monitor } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';

export default function ConnectionModal() {
  const { state, dispatch } = useApp();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const request = state.pendingRequest;

  // Handle code rejection from peer
  useEffect(() => {
    if (state.codeRejected) {
      setError('Wrong verification code. Check the code and try again.');
      setVerifying(false);
      setCode('');
      dispatch({ type: 'CLEAR_CODE_REJECTED' });
    }
  }, [state.codeRejected, dispatch]);

  if (!request) return null;

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Code must be 6 characters');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      await api.verify(code.toUpperCase());
    } catch (err) {
      setError(err.message || 'Verification failed');
      setVerifying(false);
    }
  };

  const handleReject = () => {
    dispatch({ type: 'SET_PENDING_REQUEST', data: null });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="card max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/20 rounded-md flex items-center justify-center">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold">Connection Request</h3>
          </div>
          <button
            onClick={handleReject}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="bg-secondary rounded-md p-4 mb-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-neutral-800 border border-border rounded-md flex items-center justify-center">
              <Monitor className="w-4 h-4 text-neutral-400" />
            </div>
            <div>
              <p className="text-sm font-medium">{request.name}</p>
              <p className="text-xs text-muted-foreground">wants to connect</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">IP</span>
              <p className="font-mono mt-0.5">{request.ip}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Port</span>
              <p className="font-mono mt-0.5">{request.port}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Device ID</span>
              <p className="font-mono mt-0.5">{request.id}</p>
            </div>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            Enter the verification code shown on the other device
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => { setError(''); setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)); }}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            placeholder="XXXXXX"
            className="input text-center text-xl font-mono tracking-[0.3em] uppercase"
            maxLength={6}
            autoFocus
          />
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>

        <div className="flex gap-2">
          <button onClick={handleReject} className="btn-secondary flex-1">
            Reject
          </button>
          <button
            onClick={handleVerify}
            disabled={code.length !== 6 || verifying}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? 'Verifying...' : 'Verify & Connect'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}