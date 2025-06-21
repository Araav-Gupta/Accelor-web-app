import { useState, useEffect } from 'react';
import { fetchFileAsBlob } from '../services/api';

export const useFileHandler = (fileId) => {
  const [fileSrc, setFileSrc] = useState(null);
  const [error, setError] = useState(null);

  // Fetch file as a blob and convert to data URL for display
  useEffect(() => {
    if (!fileId) {
      setFileSrc(null);
      return;
    }

    const fetchFile = async () => {
      try {
        const blob = await fetchFileAsBlob(fileId);
        const url = URL.createObjectURL(blob);
        setFileSrc(url);
        setError(null);
      } catch (err) {
        setError('Failed to load file');
        setFileSrc(null);
      }
    };

    fetchFile();

    // Cleanup the URL object to prevent memory leaks
    return () => {
      if (fileSrc) {
        URL.revokeObjectURL(fileSrc);
      }
    };
  }, [fileId, fileSrc]);

  // Function to handle "View" action (open file in new tab)
  const handleViewFile = async () => {
    try {
      const blob = await fetchFileAsBlob(fileId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      alert('Failed to open file');
    }
  };

  return { fileSrc, error, handleViewFile };
};