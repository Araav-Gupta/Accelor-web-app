import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { EXPO_PUBLIC_API_URL } from '@env';
import * as FileSystem from 'expo-file-system';
// Set default API URL if not provided
const API_URL = 'http://192.168.59.225:5001/api';

// Log the API URL for debugging (remove in production)
console.log('API URL:', API_URL);

// Create an axios instance with a base URL
const api = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 30000 // 30 seconds timeout
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
        data: error.response?.data
      });

      if (error.response?.status === 401) {
        Alert.alert('Authentication Error', 'Please login again');
      } else {
        Alert.alert('Error', errorMessage);
      }

      return Promise.reject(error);
    }
  );

  
// Helper function to validate base64 string
const isValidBase64 = (str) => {
  if (!str || typeof str !== 'string') return false;
  const len = str.length;
  if (!len || len % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(str)) return false;
  return true;
};

// Utility function to fetch a file as a blob
export const fetchFileAsBlob = async (fileId) => {
  try {
    console.log('Fetching file with ID:', fileId);
    
    const cachePath = `${FileSystem.cacheDirectory}${fileId}`;
    const uri = `${API_URL}/employee/files/${fileId}`;
    
    // Check cache first
    const fileInfo = await FileSystem.getInfoAsync(cachePath);
    const isCacheValid = fileInfo.exists && 
                       (Date.now() - fileInfo.modificationTime * 1000 < 24 * 60 * 60 * 1000);
    
    if (isCacheValid) {
      console.log('Using cached file');
      try {
        const base64 = await FileSystem.readAsStringAsync(cachePath, {
          encoding: FileSystem.EncodingType.Base64
        });
        
        if (base64 && isValidBase64(base64)) {
          return {
            base64: `data:image/jpeg;base64,${base64}`,
            contentType: 'image/jpeg',
            fileName: fileId,
            localUri: cachePath
          };
        }
      } catch (cacheError) {
        console.warn('Cache read error, will re-download:', cacheError);
        // Continue to download if cache read fails
      }
    }
    
    // Download the file
    console.log('Downloading file from:', uri);
    const downloadRes = await FileSystem.downloadAsync(
      uri,
      cachePath,
      {
        headers: {
          'Accept': 'application/octet-stream',
          'Cache-Control': 'no-cache'
        }
      }
    );
    
    if (downloadRes.status !== 200) {
      throw new Error(`Server returned status: ${downloadRes.status}`);
    }
    
    // Read the file as base64
    let base64;
    try {
      base64 = await FileSystem.readAsStringAsync(cachePath, {
        encoding: FileSystem.EncodingType.Base64
      });
      console.log('Base64 sample:', base64.slice(0, 100));

      if (!base64 || !isValidBase64(base64)) {
        throw new Error('Invalid base64 data received');
      }
    } catch (readError) {
      console.error('Error reading downloaded file:', readError);
      // Try to read as binary and convert to base64
      try {
        const binaryString = await FileSystem.readAsStringAsync(cachePath, {
          encoding: FileSystem.EncodingType.UTF8
        });
        base64 = btoa(unescape(encodeURIComponent(binaryString)));
      } catch (e) {
        console.error('Failed to read file in any format:', e);
        throw new Error('Could not process the downloaded file');
      }
    }
    console.log('Base64 sample:', base64.slice(0, 100));

    return {
      base64: `data:image/jpeg;base64,${base64}`,
      contentType: 'image/jpeg',
      fileName: fileId,
      localUri: cachePath
    };
    
  } catch (error) {
    console.error(`Error in fetchFileAsBlob for file ${fileId}:`, error);
    
    let errorMessage = 'Failed to load file';
    if (error.message.includes('Network request failed')) {
      errorMessage = 'Network error. Please check your connection.';
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      errorMessage = 'File not found on server';
    } else if (error.message.includes('base64') || error.message.includes('decode')) {
      errorMessage = 'Invalid file format';
    } else if (error.message.includes('ENOENT')) {
      errorMessage = 'File not found in cache';
    }
    
    Alert.alert('Error', errorMessage);
    throw new Error(errorMessage);
  }
};
  
  export default api;