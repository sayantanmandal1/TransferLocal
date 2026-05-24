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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="card max-w-sm w-full text-center"
      >
        <div className="w-11 h-11 mx-auto mb-4 bg-secondary border border-border rounded-md flex items-center justify-center">
          <Key className="w-5 h-5 text-muted-foreground" />
        </div>

        <h3 className="text-sm font-semibold mb-1">Verification Code</h3>
        <p className="text-xs text-muted-foreground mb-5">
          Enter this code on the other device to connect
        </p>

        <div className="bg-secondary border border-border rounded-md p-5 mb-5">
          <p className="text-3xl font-mono font-bold tracking-[0.4em] text-foreground">
            {code}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className={`text-xs font-medium ${timeLeft <= 10 ? 'text-red-400' : 'text-muted-foreground'}`}>
            {timeLeft}s remaining
          </span>
          <div className="w-20 h-1 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-neutral-400 rounded-full"
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
