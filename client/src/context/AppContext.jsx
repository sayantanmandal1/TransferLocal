import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';

const AppContext = createContext(null);

const initialState = {
  identity: null,
  peers: [],
  available: false,
  session: null,
  pendingRequest: null,
  verificationCode: null,
  messages: [],
  transfers: [],
  connected: false,
  darkMode: localStorage.getItem('darkMode') === 'true', // persisted preference
  offlineMode: false,
  view: 'home', // 'home' | 'workspace'
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_IDENTITY':
      return { ...state, identity: action.data };
    case 'SET_PEERS':
      return { ...state, peers: action.data };
    case 'SET_AVAILABLE':
      return { ...state, available: action.data };
    case 'SET_SESSION':
      return { ...state, session: action.data, view: action.data ? 'workspace' : 'home' };
    case 'SET_PENDING_REQUEST':
      return { ...state, pendingRequest: action.data };
    case 'SET_VERIFICATION_CODE':
      return { ...state, verificationCode: action.data };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.data] };
    case 'SET_MESSAGES':
      return { ...state, messages: action.data };
    case 'UPDATE_TRANSFER':
      return {
        ...state,
        transfers: state.transfers.some(t => t.transferId === action.data.transferId)
          ? state.transfers.map(t => t.transferId === action.data.transferId ? { ...t, ...action.data } : t)
          : [...state.transfers, action.data],
      };
    case 'SET_CONNECTED':
      return { ...state, connected: action.data };
    case 'TOGGLE_DARK_MODE':
      localStorage.setItem('darkMode', !state.darkMode);
      return { ...state, darkMode: !state.darkMode };
    case 'TOGGLE_OFFLINE_MODE':
      return { ...state, offlineMode: !state.offlineMode };
    case 'SET_VIEW':
      return { ...state, view: action.data };
    case 'SESSION_ENDED':
      return { ...state, session: null, messages: [], transfers: [], view: 'home', verificationCode: null, pendingRequest: null };
    case 'CODE_EXPIRED':
      return { ...state, verificationCode: null };
    case 'CODE_REJECTED':
      return { ...state, codeRejected: true };
    case 'CLEAR_CODE_REJECTED':
      return { ...state, codeRejected: false };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const connectWs = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      dispatch({ type: 'SET_CONNECTED', data: true });
      if (reconnectRef.current) {
        clearInterval(reconnectRef.current);
        reconnectRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleWsMessage(msg, dispatch);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      dispatch({ type: 'SET_CONNECTED', data: false });
      if (!reconnectRef.current) {
        reconnectRef.current = setInterval(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            connectWs();
          }
        }, 3000); // retry every 3 seconds
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connectWs();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectRef.current) clearInterval(reconnectRef.current);
    };
  }, [connectWs]);

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state.darkMode]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

function handleWsMessage(msg, dispatch) {
  switch (msg.type) {
    case 'identity':
      dispatch({ type: 'SET_IDENTITY', data: msg.data });
      break;
    case 'peers':
      dispatch({ type: 'SET_PEERS', data: msg.data });
      break;
    case 'available':
      dispatch({ type: 'SET_AVAILABLE', data: msg.data });
      break;
    case 'session':
      dispatch({ type: 'SET_SESSION', data: msg.data });
      break;
    case 'incoming_request':
      dispatch({ type: 'SET_PENDING_REQUEST', data: msg.from });
      break;
    case 'session_started':
      dispatch({ type: 'SET_SESSION', data: msg.session });
      break;
    case 'session_ended':
      dispatch({ type: 'SESSION_ENDED' });
      break;
    case 'code_expired':
      dispatch({ type: 'CODE_EXPIRED' });
      break;
    case 'code_rejected':
      dispatch({ type: 'CODE_REJECTED' });
      break;
    case 'request_cancelled':
      dispatch({ type: 'SET_PENDING_REQUEST', data: null });
      break;
    case 'chat_message':
      dispatch({ type: 'ADD_MESSAGE', data: msg.message });
      break;
    case 'transfer_progress':
    case 'file_sending':
    case 'file_sent':
    case 'file_receiving':
    case 'file_received':
      dispatch({ type: 'UPDATE_TRANSFER', data: { ...msg, transferId: msg.transferId } });
      break;
    case 'transfer_ready':
      break;
    default:
      break;
  }
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export default AppContext;