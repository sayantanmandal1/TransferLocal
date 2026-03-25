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
        animate={dragging ? { scale: 1.01 } : { scale: 1 }}
        className={`border border-dashed rounded-lg p-10 text-center transition-colors ${
          dragging
            ? 'border-neutral-400 bg-accent'
            : 'border-border hover:border-neutral-600'
        }`}
      >
        <Upload className={`w-6 h-6 mx-auto mb-3 ${dragging ? 'text-neutral-300' : 'text-muted-foreground'}`} />
        <p className="text-sm text-muted-foreground">
          {dragging ? 'Drop here' : 'Drag & drop files or folders'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Any file type, any size</p>
      </motion.div>

      {droppedFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 space-y-1"
        >
          {droppedFiles.slice(0, 5).map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileIcon className="w-3 h-3" />
              <span>{f.name}</span>
              <span className="text-neutral-600">({formatSize(f.size)})</span>
            </div>
          ))}
          {droppedFiles.length > 5 && (
            <p className="text-xs text-muted-foreground">+{droppedFiles.length - 5} more</p>
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
