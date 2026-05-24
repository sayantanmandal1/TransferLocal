import { AppProvider, useApp } from './context/AppContext';
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import OfflineMode from './pages/OfflineMode';
import ConnectionModal from './components/ConnectionModal';
import VerificationCode from './components/VerificationCode';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

function AppContent() {
  const { state, dispatch } = useApp();

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
              <span className="text-black text-xs font-bold">T</span>
            </div>
            <h1 className="text-sm font-semibold text-foreground tracking-tight">
              Transfer
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Offline Mode Toggle */}
            <button
              onClick={() => dispatch({ type: 'TOGGLE_OFFLINE_MODE' })}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                state.offlineMode
                  ? 'bg-amber-950/40 text-amber-400 border border-amber-900/50'
                  : 'hover:bg-secondary text-muted-foreground'
              }`}
              title={state.offlineMode ? 'Switch to Online Mode' : 'Switch to Offline Mode'}
            >
              {state.offlineMode ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
              {state.offlineMode ? 'Offline' : 'Online'}
            </button>

            {state.connected ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse-slow"></span>
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                Disconnected
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-14 min-h-screen">
        <AnimatePresence mode="wait">
          {state.offlineMode && state.view !== 'workspace' ? (
            <motion.div
              key="offline"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <OfflineMode />
            </motion.div>
          ) : state.view === 'workspace' && state.session ? (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Workspace />
            </motion.div>
          ) : (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
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
