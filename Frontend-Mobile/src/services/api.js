import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';
// Hardcode the API URL to ensure it's always correct
const API_URL = 'http://192.168.1.21:5001/api';

console.log('Using API URL:', API_URL);

// Create an axios instance with a base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor for token handling
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.error('Error retrieving token:', error);
      return config; // Continue request without token
    }
  },
  (error) => {
    console.error('Request failed:', error);
    Alert.alert('Error', 'Network request failed');
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.message
      ? error.response.data.message
      : error.message || 'An unknown error occurred';

    console.error('API Error:', {
      status: error.response?.status,
      message: errorMessage,
      data: error.response?.data,
    });

    if (error.response?.status === 401) {
      Alert.alert('Authentication Error', 'Please login again');
    } else {
      Alert.alert('Error', errorMessage);
    }

    return Promise.reject(error);
  }
);

// Utility function to fetch a file and return its local path


// Helper function to get MIME type from file extension
const getMimeType = (uri) => {
  const extension = uri.split('.').pop().toLowerCase();
  const mimeTypes = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    bmp: 'image/bmp',
    webp: 'image/webp',
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Add more MIME types as needed
  };
  return mimeTypes[extension] || 'application/octet-stream';
};

import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';

/**
 * Opens a file using the device's default handler
 * @param {string} uri - Local file URI to open
 * @param {string} [mimeType] - Optional MIME type of the file
 * @returns {Promise<boolean>} True if the file was opened successfully
 */
export const openFile = async (uri, mimeType) => {
  try {
    // First check if the file exists
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    // Determine MIME type from file extension if not provided
    const detectedMimeType = mimeType || getMimeType(uri);
    const isImage = detectedMimeType.startsWith('image/');
    const isPdf = detectedMimeType === 'application/pdf';

    if (Platform.OS === 'android') {
      // On Android, use IntentLauncher to open the file directly
      const contentUri = await FileSystem.getContentUriAsync(uri);
      
      try {
        await IntentLauncher.startActivityAsync(
          'android.intent.action.VIEW',
          {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: detectedMimeType,
          }
        );
        return true;
      } catch (intentError) {
        console.log('Intent failed, trying with WebBrowser...');
        // Fall back to WebBrowser for PDFs and images if intent fails
        if (isPdf || isImage) {
          await WebBrowser.openBrowserAsync(contentUri);
          return true;
        }
        throw intentError;
      }
    } else {
      // On iOS, use WebBrowser for PDFs and images
      if (isPdf || isImage) {
        const contentUri = await FileSystem.getContentUriAsync(uri);
        await WebBrowser.openBrowserAsync(contentUri);
        return true;
      }
      
      // For other file types, use DocumentPicker to open with default app
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: false,
        type: detectedMimeType,
      });
      
      if (result.type === 'success') {
        // The file will be opened by the system's default handler
        return true;
      }
      
      throw new Error('Could not open file with default app');
    }
  } catch (error) {
    console.error('Error opening file:', error);
    
    // As a last resort, try opening in web browser
    try {
      console.log('Falling back to browser...');
      const contentUri = await FileSystem.getContentUriAsync(uri);
      await WebBrowser.openBrowserAsync(contentUri);
      return true;
    } catch (webError) {
      console.error('Error opening in browser:', webError);
      throw new Error('Could not open the file. Make sure you have an app installed that can handle this file type.');
    }
  }
};

/**
 * Fetches a file and returns its local path
 * @param {string} fileId - ID of the file to fetch
 * @param {string} fileName - Name of the file (used for extension)
 * @returns {Promise<string>} Local file URI
 */
export const fetchFileAsBlob = async (fileId, fileName = 'file') => {
  try {
    console.log('Fetching file with ID:', fileId);
    
    if (!fileId) {
      throw new Error('File ID is required');
    }

    // Create cache directory if it doesn't exist
    const cacheDir = `${FileSystem.cacheDirectory}downloaded_files/`;
    await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    
    const cachePath = `${cacheDir}${fileId}_${Date.now()}`;
    const uri = `${API_URL}/employees/files/${fileId}`;

    // Determine file extension from fileName or default to .pdf
    const extension = fileName.includes('.')
      ? fileName.split('.').pop().toLowerCase()
      : 'pdf';
    const filePath = `${cachePath}.${extension}`;

    // Check cache first
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      const isCacheValid =
        fileInfo.exists &&
        Date.now() - fileInfo.modificationTime * 1000 < 24 * 60 * 60 * 1000;

      if (isCacheValid) {
        console.log('Using cached file:', filePath);
        return filePath;
      }
    } catch (cacheError) {
      console.warn('Cache check failed, will download fresh:', cacheError);
    }

    // Get the auth token
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Download the file
    console.log('Downloading file from:', uri);
    const downloadRes = await FileSystem.downloadAsync(uri, filePath, {
      headers: {
        Accept: 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (downloadRes.status !== 200) {
      throw new Error(`Server returned status: ${downloadRes.status}`);
    }

    // Verify the file was downloaded
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists || fileInfo.size === 0) {
      throw new Error('Downloaded file is empty or invalid');
    }

    console.log('File downloaded successfully:', filePath, 'Size:', fileInfo.size, 'bytes');
    return filePath;
  } catch (error) {
    console.error(`Error in fetchFileAsBlob for file ${fileId}:`, error);

    let errorMessage = 'Failed to load file';
    if (error.message.includes('Network request failed')) {
      errorMessage = 'Network error. Please check your connection.';
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      errorMessage = 'File not found on server';
    } else if (error.message.includes('ENOENT')) {
      errorMessage = 'File not found in cache';
    }

    throw new Error(errorMessage);
  }
};

export default api;