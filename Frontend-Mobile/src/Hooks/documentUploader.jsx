import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { fetchFileAsBlob, openFile } from '../services/api';

const DocumentUploader = ({
  title,
  field,
  profile,
  files,
  setFiles,
  fileErrors,
  isLocked,
}) => {
  const [localError, setLocalError] = useState(null);

  const sizeLimits = {
    salarySlips: 1, // 1MB
    panCard: 1,
    aadharCard: 1,
    bankPassbook: 1,
    medicalCertificate: 2, // 2MB
    backgroundVerification: 2,
    tenthTwelfthDocs: 5, // 5MB
    graduationDocs: 5,
    postgraduationDocs: 5,
    experienceCertificate: 5,
  };

  const handleDocumentPick = async () => {
    if (isLocked) return;

    // Check salarySlips dependency
    if (field === 'salarySlips' && !profile.documents?.experienceCertificate && !files?.experienceCertificate) {
      setLocalError('Please upload Experience Certificate first');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const sizeMB = asset.size / (1024 * 1024); // Convert bytes to MB
        const maxSize = sizeLimits[field] || 5; // Default to 5MB

        if (sizeMB > maxSize) {
          setLocalError(`File size must be less than ${maxSize}MB`);
          return;
        }

        const file = {
          uri: asset.uri,
          type: 'application/pdf',
          name: asset.name,
          size: asset.size,
        };
        setFiles((prev) => ({ ...prev, [field]: file }));
        setLocalError(null);
      }
    } catch (err) {
      console.error('Document pick error:', err);
      setLocalError('Failed to pick document');
    }
  };

  const [loading, setLoading] = useState(false);
  const hasExistingFile = profile?.documents?.[field];
  const selectedFile = files?.[field];

  const handleViewFile = async (fileId, fileName) => {
    if (!fileId) return;

    try {
      setLoading(true);
      const fileUri = await fetchFileAsBlob(fileId, fileName || 'document.pdf');
      await openFile(fileUri);
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Error', 'Could not open the file. Please try again.');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.buttonText}>Upload PDF</Text>
        </TouchableOpacity>

        {hasExistingFile && (
          <TouchableOpacity
            style={[styles.button, styles.viewButton]}
            onPress={() => handleViewFile(hasExistingFile, title)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialIcons name="visibility" size={20} color="white" />
                <Text style={styles.buttonText}>View</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {selectedFile && <Text style={styles.fileName}>{selectedFile.name}</Text>}
      {hasExistingFile && !selectedFile && (
        <Text style={styles.fileName}>File ID: {hasExistingFile}</Text>
      )}
      {(fileErrors?.[field] || localError) && (
        <Text style={styles.error}>{fileErrors?.[field] || localError}</Text>
      )}
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