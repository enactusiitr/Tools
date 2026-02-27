'use client';

import { useCallback, useState } from 'react';

interface FileUploadProps {
  accept: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  onFileSelected: (file: File) => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function FileUpload({
  accept,
  label,
  description,
  icon,
  onFileSelected,
  loading = false,
  disabled = false,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (disabled || loading) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        setFileName(file.name);
        onFileSelected(file);
      }
    },
    [disabled, loading, onFileSelected]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setFileName(file.name);
        onFileSelected(file);
      }
      // Reset input so same file can be re-selected
      e.target.value = '';
    },
    [onFileSelected]
  );

  return (
    <div
      className={`drop-zone ${dragActive ? 'active' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => {
        if (!disabled && !loading) {
          document.getElementById(`file-input-${label}`)?.click();
        }
      }}
    >
      <input
        id={`file-input-${label}`}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={disabled || loading}
      />

      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="loader" />
          <p className="text-sm text-slate-500">Uploading...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">{label}</p>
            <p className="text-xs text-slate-400 mt-1">{description}</p>
          </div>
          {fileName && (
            <p className="text-xs text-green-600 font-medium">
              ✓ {fileName}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
