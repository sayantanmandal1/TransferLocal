import { AppProvider, useApp } from './context/AppContext';
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import ThemeToggle from './components/ThemeToggle';
import ConnectionModal from './components/ConnectionModal';
import VerificationCode from './components/VerificationCode';
import { AnimatePresence, motion } from 'framer-motion';

function AppContent() {
  const { state } = useApp();

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-surface-200 dark:border-surface-700">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
              Transfer
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {state.connected ? (
              <span className="flex items-center gap-1.5 text-xs text-green-500">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse-slow"></span>
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                Disconnected
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-16 min-h-screen">
        <AnimatePresence mode="wait">
          {state.view === 'workspace' && state.session ? (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Workspace />
            </motion.div>
          ) : (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Home />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {state.pendingRequest && !state.session && (
          <ConnectionModal />
        )}
        {state.verificationCode && !state.session && (
          <VerificationCode code={state.verificationCode} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
