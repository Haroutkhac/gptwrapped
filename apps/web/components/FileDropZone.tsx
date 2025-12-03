'use client';

import { useCallback, useState } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
  accept?: string;
}

export default function FileDropZone({ onFiles, accept }: Props) {
  const [isActive, setIsActive] = useState(false);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return;
      onFiles(Array.from(list));
      setIsActive(false);
    },
    [onFiles]
  );

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        setIsActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsActive(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        handleFiles(event.dataTransfer.files);
      }}
      style={{
        border: `2px dashed ${isActive ? '#34d399' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: '1.5rem',
        padding: '2rem',
        textAlign: 'center',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}
    >
      <input
        type="file"
        accept={accept}
        multiple
        style={{ display: 'none' }}
        onChange={(event) => handleFiles(event.target.files)}
      />
      <strong>Drop your ChatGPT export (ZIP or conversations.json)</strong>
      <span style={{ color: '#a0aec0' }}>Processing stays 100% local.</span>
    </label>
  );
}
