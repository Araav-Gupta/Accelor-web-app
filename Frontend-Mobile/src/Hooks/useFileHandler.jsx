import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { fetchFileAsBlob, openFile } from '../services/api';

export const useFileHandler = ({ fileId, fileName, localFile }) => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [imageUri, setImageUri] = useState(null);

  const isImageFile = useCallback((filename) => {
    if (!filename) return false;
    const ext = filename.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg'].includes(ext);
  }, []);

  const handleViewFile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let path;

      // Handle local file if provided
      if (localFile && localFile.uri) {
        path = localFile.uri;
        // Verify local file exists
        const fileInfo = await FileSystem.getInfoAsync(path);
        if (!fileInfo.exists || fileInfo.size === 0) {
          throw new Error('Local file is empty or invalid');
        }
      } else if (fileId && fileName) {
        // Handle server-fetched file
        path = await fetchFileAsBlob(fileId, fileName);
        // Verify downloaded file
        const fileInfo = await FileSystem.getInfoAsync(path);
        if (!fileInfo.exists || fileInfo.size === 0) {
          throw new Error('Downloaded file is empty or invalid');
        }
      } else {
        throw new Error('File information is missing');
      }

      // Handle image file rendering (jpg/jpeg)
      if (isImageFile(localFile?.name || fileName)) {
        let uri = path;
        try {
          if (Platform.OS === 'android') {
            uri = await FileSystem.getContentUriAsync(path);
          }
          setImageUri(uri);
          setIsImageViewerVisible(true);
          return;
        } catch (imgError) {
          console.error('Error preparing image:', imgError);
          throw new Error('Could not display the image.');
        }
      }

      // Handle PDF files
      if ((localFile?.name || fileName)?.toLowerCase().endsWith('.pdf')) {
        await openFile(path);
        return;
      }

      throw new Error('Unsupported file type');
    } catch (err) {
      console.error('Error handling file:', {
        fileId,
        fileName,
        localFile,
        error: err.message,
        stack: err.stack,
      });
      setError(err.message || 'Failed to open file');
      Alert.alert('Error', err.message || 'Could not open the file.');
    } finally {
      setIsLoading(false);
    }
  }, [fileId, fileName, localFile, isImageFile]);

  return {
    error,
    isLoading,
    handleViewFile,
    isImageViewerVisible,
    setIsImageViewerVisible,
    imageUri: imageUri ? { uri: imageUri } : null,
  };
};