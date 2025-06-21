// components/DocumentUploader.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const DocumentUploader = ({
  title,
  field,
  profile,
  files,
  setFiles,
  fileErrors,
  isLocked,
}) => {
  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const file = {
          uri: result.assets[0].uri,
          type: 'application/pdf',
          name: result.assets[0].name,
        };
        setFiles((prev) => ({ ...prev, [field]: file }));
      }
    } catch (err) {
      console.error('Document pick error:', err);
    }
  };

  const hasExistingFile = profile?.documents?.[field];
  const selectedFile = files?.[field];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{title}</Text>

      <TouchableOpacity
        style={[styles.button, isLocked && styles.disabled]}
        onPress={handleDocumentPick}
        disabled={isLocked}
      >
        <MaterialIcons name="upload-file" size={20} color="white" />
        <Text style={styles.buttonText}>Upload PDF</Text>
      </TouchableOpacity>

      {selectedFile && <Text style={styles.fileName}>{selectedFile.name}</Text>}
      {hasExistingFile && !selectedFile && <Text style={styles.fileName}>Existing: {hasExistingFile}</Text>}
      {fileErrors?.[field] && <Text style={styles.error}>{fileErrors[field]}</Text>}
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
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
  },
  disabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  fileName: {
    marginTop: 6,
    fontStyle: 'italic',
    color: '#333',
  },
  error: {
    color: 'red',
    marginTop: 4,
    fontSize: 12,
  },
});

export default DocumentUploader;
