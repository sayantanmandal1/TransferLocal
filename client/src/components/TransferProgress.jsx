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
    if (isComplete) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (isError) return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (isSending) return <Upload className="w-5 h-5 text-primary-500" />;
    return <Download className="w-5 h-5 text-emerald-500" />;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-100 dark:bg-surface-800 rounded-xl p-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">{getStatusIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="font-medium text-sm truncate">{transfer.name || 'Unknown file'}</p>
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {isComplete ? 'Complete' : `${percent}%`}
            </span>
          </div>
          <div className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                isComplete ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-primary-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${isComplete ? 100 : percent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-400">
              {isSending ? 'Sending' : 'Receiving'} • {formatSize(transfer.total || transfer.size)}
            </span>
            {!isComplete && !isError && (
              <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
