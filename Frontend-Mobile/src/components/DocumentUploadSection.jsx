import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DocumentUploader from '../Hooks/documentUploader';

const DocumentUploadSection = ({ profile, errors, onChange, isLocked }) => {
    const documentFields = [
        { name: 'tenthTwelfthDocs', label: '10th/12th Certificates' },
        { name: 'graduationDocs', label: 'Graduation Documents' },
        { name: 'postgraduationDocs', label: 'Postgraduation Documents' },
        { name: 'experienceCertificate', label: 'Experience Certificate' },
        { name: 'salarySlips', label: 'Salary Slips' },
        { name: 'panCard', label: 'PAN Card' },
        { name: 'aadharCard', label: 'Aadhar Card' },
        { name: 'bankPassbook', label: 'Bank Passbook' },
        { name: 'medicalCertificate', label: 'Medical Certificate' },
        { name: 'backgroundVerification', label: 'Background Verification' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Document Uploads</Text>
                {documentFields.map((field) => (
                    <View key={field.name} style={styles.documentGroup}>
                        <DocumentUploader
                            label={field.label}
                            name={field.name}
                            value={profile.files?.[field.name] || null}
                            onChange={(file) => onChange(field.name, file)}
                            error={errors.fileErrors?.[field.name]}
                            disabled={isLocked}
                        />
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    section: {
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        color: '#333',
    },
    documentGroup: {
        marginBottom: 16,
    },
});

export default DocumentUploadSection;