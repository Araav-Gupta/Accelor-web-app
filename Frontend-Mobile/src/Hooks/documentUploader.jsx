import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

const useDocumentPicker = () => {
  const [medicalCertificate, setMedicalCertificate] = useState(null);
  const [supportingDocuments, setSupportingDocuments] = useState([]);

  const pickDocument = async (type = 'medical') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/jpg', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false, // Always pick single file
      });
      if (result.canceled) return;
      const file = result.assets[0];
      
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      if (fileInfo.size > 5 * 1024 * 1024) {
        Alert.alert('Error', 'File size exceeds 5MB limit');
        return;
      }
      
      if (type === 'medical') {
        setMedicalCertificate(file);
      } else if (type === 'supporting') {
        setSupportingDocuments(file);
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeDocument = (index, type = 'supporting') => {
    if (type === 'medical') {
      setMedicalCertificate(null);
    } else if (type === 'supporting') {
      setSupportingDocuments(null);
    }
  };

  return { medicalCertificate, supportingDocuments, pickDocument, removeDocument };
};

export default useDocumentPicker;