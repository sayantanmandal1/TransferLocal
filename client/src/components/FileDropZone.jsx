import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileIcon } from 'lucide-react';

export default function FileDropZone({ onDrop }) {
  const [dragging, setDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState([]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragging(false);

    const items = e.dataTransfer.items;
    const files = [];
    const relativePaths = [];

    if (items) {
      for (const item of items) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            await traverseEntry(entry, '', files, relativePaths);
          } else {
            const file = item.getAsFile();
            if (file) {
              files.push(file);
              relativePaths.push(file.name);
            }
          }
        }
      }
    } else {
      for (const file of e.dataTransfer.files) {
        files.push(file);
        relativePaths.push(file.name);
      }
    }

    if (files.length > 0) {
      setDroppedFiles(files.map(f => ({ name: f.name, size: f.size })));
      onDrop(files, relativePaths);
      setTimeout(() => setDroppedFiles([]), 3000);
    }
  }, [onDrop]);

  return (
    <div>
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={dragging ? { scale: 1.02, borderColor: '#3b82f6' } : { scale: 1 }}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
          dragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
            : 'border-surface-300 dark:border-surface-600 hover:border-primary-400'
        }`}
      >
        <div className="w-16 h-16 mx-auto mb-4 bg-surface-200 dark:bg-surface-700 rounded-full flex items-center justify-center">
          <Upload className={`w-8 h-8 ${dragging ? 'text-primary-500' : 'text-gray-400'}`} />
        </div>
        <p className="font-medium text-gray-600 dark:text-gray-300">
          {dragging ? 'Drop files here' : 'Drag & drop files or folders here'}
        </p>
        <p className="text-sm text-gray-400 mt-1">Any file type, any size</p>
      </motion.div>

      {droppedFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 space-y-1"
        >
          {droppedFiles.slice(0, 5).map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
              <FileIcon className="w-3.5 h-3.5" />
              <span>{f.name}</span>
              <span className="text-xs text-gray-400">({formatSize(f.size)})</span>
            </div>
          ))}
          {droppedFiles.length > 5 && (
            <p className="text-xs text-gray-400">+{droppedFiles.length - 5} more files</p>
          )}
        </motion.div>
      )}
    </div>
  );
}

async function traverseEntry(entry, basePath, files, relativePaths) {
  if (entry.isFile) {
    const file = await new Promise((resolve) => entry.file(resolve));
    files.push(file);
    relativePaths.push(basePath + entry.name);
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    const entries = await new Promise((resolve) => reader.readEntries(resolve));
    for (const child of entries) {
      await traverseEntry(child, basePath + entry.name + '/', files, relativePaths);
    }
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
