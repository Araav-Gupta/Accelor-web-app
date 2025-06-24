import { useState, useCallback } from 'react';
import { fetchFileAsBlob, openFile } from '../services/api';
import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

/**
 * Hook to manage file download and opening/viewing.
 * @param {string} fileId - ID of the file to fetch
 * @param {string} fileName - Name of the file including extension
 */
export const useFileHandler = (fileId, fileName) => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [imageUri, setImageUri] = useState(null);

  // Check if the file is an image based on its extension
  const isImageFile = useCallback((filename) => {
    if (!filename) return false;
    const ext = filename.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
  }, []);

  const handleViewFile = useCallback(async () => {
    if (!fileId || !fileName) {
      Alert.alert('Error', 'File information is missing');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const path = await fetchFileAsBlob(fileId, fileName);

      // Check file integrity
      const fileInfo = await FileSystem.getInfoAsync(path);
      if (!fileInfo.exists || fileInfo.size === 0) {
        throw new Error('Downloaded file is empty or invalid');
      }

      // Handle image file rendering
      if (isImageFile(fileName)) {
        let uri = path;
        try {
          if (Platform.OS === 'android') {
            uri = await FileSystem.getContentUriAsync(path);
          }

          // Instead of fetching the file, just check if it exists and has content
          const fileInfo = await FileSystem.getInfoAsync(path);
          if (!fileInfo.exists || fileInfo.size === 0) {
            throw new Error('Image file is empty or invalid');
          }

          // Set the URI and show the image viewer
          setImageUri(uri);
          setIsImageViewerVisible(true);
          return;
        } catch (imgError) {
          console.error('Error preparing image:', imgError);
          // If we can't prepare the image, try opening it as a regular file
          console.log('Falling back to regular file opening');
          const result = await openFile(path);
          if (!result.success && !result.isImage) {
            throw new Error('Failed to open image file');
          }
          return;
        }
      }

      // Non-image file (PDF, DOCX, etc.)
      const result = await openFile(path);
      if (!result.success && !result.isImage) {
        throw new Error('Failed to open file');
      }
    } catch (err) {
      console.error('Error handling file:', {
        fileId,
        fileName,
        error: err.message,
        stack: err.stack,
      });
      setError(err.message || 'Failed to open file');
      Alert.alert('Error', err.message || 'Could not open the file.');
    } finally {
      setIsLoading(false);
    }
  }, [fileId, fileName, isImageFile]);

  return {
    error,
    isLoading,
    handleViewFile,
    isImageViewerVisible,
    setIsImageViewerVisible,
    imageUri: imageUri ? { uri: imageUri } : null,
  };
};
