import { Sun, Moon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const { state, dispatch } = useApp();

  return (
    <button
      onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
      className="p-2 rounded-xl hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      title={state.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.div
        key={state.darkMode ? 'dark' : 'light'}
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        {state.darkMode ? (
          <Sun className="w-5 h-5 text-yellow-400" />
        ) : (
          <Moon className="w-5 h-5 text-gray-600" />
        )}
      </motion.div>
    </button>
  );
}
