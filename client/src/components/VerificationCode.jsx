import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function VerificationCode({ code }) {
  const { dispatch } = useApp();
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCancel = () => {
    dispatch({ type: 'SET_VERIFICATION_CODE', data: null });
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
        className="card max-w-sm w-full text-center"
      >
        <div className="w-14 h-14 mx-auto mb-4 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center">
          <Key className="w-7 h-7 text-primary-600" />
        </div>

        <h3 className="text-lg font-bold mb-2">Verification Code</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Enter this code on the other device to establish the connection
        </p>

        <div className="bg-surface-100 dark:bg-surface-800 rounded-2xl p-6 mb-6">
          <p className="text-4xl font-mono font-bold tracking-[0.4em] text-primary-600">
            {code}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className={`text-sm font-medium ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-500'}`}>
            Expires in {timeLeft}s
          </span>
          <div className="w-24 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary-500 rounded-full"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 60, ease: 'linear' }}
            />
          </div>
        </div>

        <button onClick={handleCancel} className="btn-secondary w-full">
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}
