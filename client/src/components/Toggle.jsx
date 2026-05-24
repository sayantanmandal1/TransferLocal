import { motion } from 'framer-motion';

export default function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-emerald-500' : 'bg-neutral-700'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <motion.div
        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
