import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFileHandler } from './useFileHandler';
import ImageViewing from 'react-native-image-viewing';
import { ActivityIndicator } from 'react-native';

const DocumentUploader = ({
  title,
  field,
  profile,
  files,
  setFiles,
  fileErrors,
  isLocked,
}) => {
  const hasExistingFile = profile?.documents?.[field];
  const selectedFile = files?.[field];

  // Use the useFileHandler hook for file viewing
  const { 
    handleViewFile: handleViewFileHook, 
    isImageViewerVisible, 
    setIsImageViewerVisible, 
    imageUri,
    isLoading: isFileLoading,
    error: fileError
  } = useFileHandler(hasExistingFile, title);

  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const file = {
          uri: result.assets[0].uri,
          type: result.assets[0].mimeType || 'application/octet-stream',
          name: result.assets[0].name,
        };
        setFiles((prev) => ({ ...prev, [field]: file }));
      }
    } catch (err) {
      console.error('Document pick error:', err);
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  };

  const handleViewFile = async () => {
    if (!hasExistingFile) return;
    await handleViewFileHook();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{title}</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.uploadButton, isLocked && styles.disabled]}
          onPress={handleDocumentPick}
          disabled={isLocked}
        >
          <MaterialIcons name="upload-file" size={20} color="white" />
          <Text style={styles.buttonText}>Upload File</Text>
        </TouchableOpacity>

        {hasExistingFile && (
          <TouchableOpacity
            style={[styles.button, styles.viewButton, isFileLoading && styles.disabled]}
            onPress={handleViewFile}
            disabled={isFileLoading}
          >
            <MaterialIcons name="visibility" size={20} color="white" />
            <Text style={styles.buttonText}>
              {isFileLoading ? 'Loading...' : 'View'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {selectedFile && (
        <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="tail">
          {selectedFile.name}
        </Text>
      )}
      {hasExistingFile && !selectedFile && (
        <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="tail">
          {title} (Click View to open)
        </Text>
      )}
      {fileError && (
        <Text style={styles.error}>{fileError}</Text>
      )}
      {fileErrors?.[field] && (
        <Text style={styles.error}>{fileErrors[field]}</Text>
      )}
      
      {/* Image Viewer Modal */}
      <ImageViewing
        images={imageUri ? [imageUri] : []}
        imageIndex={0}
        visible={isImageViewerVisible}
        onRequestClose={() => setIsImageViewerVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    minWidth: 100,
  },
  uploadButton: {
    backgroundColor: '#007BFF',
  },
  viewButton: {
    backgroundColor: '#6c757d',
  },
  disabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  fileName: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  error: {
    color: '#dc3545',
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default DocumentUploader;
