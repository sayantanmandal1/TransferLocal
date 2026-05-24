import { motion } from 'framer-motion';
import { Upload, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function TransferProgress({ transfer }) {
  const percent = transfer.percent || 0;
  const isSending = transfer.type === 'file_sending' || transfer.sent !== undefined;
  const isComplete = transfer.type === 'file_sent' || transfer.type === 'file_received' || transfer.status === 'complete';
  const isError = transfer.status === 'error';

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const getStatusIcon = () => {
    if (isComplete) return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (isError) return <AlertCircle className="w-4 h-4 text-red-400" />;
    if (isSending) return <Upload className="w-4 h-4 text-neutral-400" />;
    return <Download className="w-4 h-4 text-neutral-400" />;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-secondary border border-border rounded-md p-3"
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">{getStatusIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium truncate">{transfer.name || 'Unknown'}</p>
            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
              {isComplete ? 'Done' : `${percent}%`}
            </span>
          </div>
          <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                isComplete ? 'bg-emerald-500' : isError ? 'bg-red-500' : 'bg-neutral-400'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${isComplete ? 100 : percent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              {isSending ? 'Sending' : 'Receiving'} · {formatSize(transfer.total || transfer.size)}
            </span>
            {!isComplete && !isError && (
              <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
