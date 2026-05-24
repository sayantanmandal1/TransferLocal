import { useState } from 'react';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="card max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold">Connection Request</h3>
          </div>
          <button
            onClick={handleReject}
            className="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-surface-100 dark:bg-surface-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold">{request.name}</p>
              <p className="text-xs text-gray-500">wants to connect</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500 text-xs">IP Address</span>
              <p className="font-mono">{request.ip}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Port</span>
              <p className="font-mono">{request.port}</p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500 text-xs">Device ID</span>
              <p className="font-mono text-xs">{request.id}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Enter the verification code shown on the other device:
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            placeholder="XXXXXX"
            className="input text-center text-2xl font-mono tracking-[0.3em] uppercase"
            maxLength={6}
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        <div className="flex gap-3">
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
