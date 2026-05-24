import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, FolderUp, X, ArrowLeft, Download, FileIcon, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';
import FileDropZone from '../components/FileDropZone';
import TransferProgress from '../components/TransferProgress';
import ChatPanel from '../components/ChatPanel';

export default function Workspace() {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('files');
  const [receivedFiles, setReceivedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Poll received files list
  useEffect(() => {
    const fetchReceived = async () => {
      try {
        const files = await api.getReceivedFiles();
        setReceivedFiles(files);
      } catch { /* ignore */ }
    };
    fetchReceived();
    const interval = setInterval(fetchReceived, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleEndSession = async () => {
    if (window.confirm('End this session? All active transfers will be stopped.')) {
      try {
        await api.endSession();
        dispatch({ type: 'SESSION_ENDED' });
      } catch (err) {
        console.error('Failed to end session:', err);
      }
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    await uploadFiles(files);
    e.target.value = '';
  };

  const handleFolderSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const relativePaths = files.map(f => f.webkitRelativePath || f.name);
    await uploadFiles(files, relativePaths);
    e.target.value = '';
  };

  const uploadFiles = async (files, relativePaths) => {
    try {
      await api.uploadFiles(files, relativePaths);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const peer = state.session?.peer;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Workspace Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleEndSession}
            className="p-2 rounded-md hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h2 className="text-base font-semibold">Session with {peer?.name || 'Unknown'}</h2>
            <p className="text-xs text-muted-foreground">
              {peer?.ip}:{peer?.port} · {peer?.id?.substring(0, 8)}
            </p>
          </div>
        </div>
        <button onClick={handleEndSession} className="btn-danger flex items-center gap-2">
          <X className="w-4 h-4" />
          End
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary border border-border rounded-md mb-6 w-fit">
        <button
          onClick={() => setActiveTab('files')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
            activeTab === 'files'
              ? 'bg-card border border-border text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Files
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
            activeTab === 'chat'
              ? 'bg-card border border-border text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Chat
          {state.messages.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-neutral-600 text-xs rounded-full">
              {state.messages.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'files' ? (
        <div className="space-y-5">
          {/* Upload Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Files
            </button>
            <button
              onClick={() => folderInputRef.current?.click()}
              className="btn-secondary flex items-center gap-2"
            >
              <FolderUp className="w-4 h-4" />
              Folder
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory=""
              multiple
              onChange={handleFolderSelect}
              className="hidden"
            />
          </div>

          {/* Drop Zone */}
          <FileDropZone onDrop={uploadFiles} />

          {/* Transfer Progress */}
          {state.transfers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Transfers
              </h3>
              {state.transfers.map((transfer) => (
                <TransferProgress key={transfer.transferId} transfer={transfer} />
              ))}
            </div>
          )}

          {/* Received Files */}
          {receivedFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Received
              </h3>
              <div className="bg-card border border-border rounded-md divide-y divide-border">
                {receivedFiles.map((file, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                      </div>
                    </div>
                    <a
                      href={`/api/download/${encodeURIComponent(file.path)}`}
                      download
                      className="p-1.5 rounded hover:bg-secondary transition-colors flex-shrink-0"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-neutral-400" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <ChatPanel />
      )}
    </div>
  );
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
