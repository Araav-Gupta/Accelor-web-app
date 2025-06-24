import { useState } from 'react';
import { Alert } from 'react-native';
import { fetchFileAsBlob, openFile } from './api';

export const useFileHandler = (fileId, fileName) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleViewFile = async () => {
    if (!fileId) {
      setError('No file ID provided');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      // First download the file
      const fileUri = await fetchFileAsBlob(fileId, fileName);
      
      // Then open it using the device's default handler
      await openFile(fileUri);
      
      return fileUri;
    } catch (err) {
      console.error('Error handling file:', err);
      const errorMessage = err.message || 'Failed to open file';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      throw err; // Re-throw the error so the calling component can handle it
    } finally {
      setLoading(false);
    }
  };

  return { 
    error, 
    loading, 
    handleViewFile 
  };
};