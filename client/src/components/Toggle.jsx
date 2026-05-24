import { motion } from 'framer-motion';

export default function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        checked ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <motion.div
        className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
