import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

const StatutoryDetailsSection = ({ profile, errors, onChange, isLocked }) => {
    const handleStatutoryDetailsChange = (field, value) => {
        onChange('statutoryDetails', {
            ...profile.statutoryDetails,
            [field]: value,
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Statutory Details</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>PAN Number</Text>
                    <TextInput
                        style={[styles.input, errors.statutoryDetails?.panNumber && styles.inputError]}
                        value={profile.statutoryDetails?.panNumber || ''}
                        onChangeText={(text) => handleStatutoryDetailsChange('panNumber', text)}
                        placeholder="Enter PAN number"
                        editable={!isLocked}
                    />
                    {errors.statutoryDetails?.panNumber && <Text style={styles.errorText}>{errors.statutoryDetails.panNumber}</Text>}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>PF Number</Text>
                    <TextInput
                        style={[styles.input, errors.statutoryDetails?.pfNumber && styles.inputError]}
                        value={profile.statutoryDetails?.pfNumber || ''}
                        onChangeText={(text) => handleStatutoryDetailsChange('pfNumber', text)}
                        placeholder="Enter PF number"
                        editable={!isLocked}
                    />
                    {errors.statutoryDetails?.pfNumber && <Text style={styles.errorText}>{errors.statutoryDetails.pfNumber}</Text>}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>UAN Number</Text>
                    <TextInput
                        style={[styles.input, errors.statutoryDetails?.uanNumber && styles.inputError]}
                        value={profile.statutoryDetails?.uanNumber || ''}
                        onChangeText={(text) => handleStatutoryDetailsChange('uanNumber', text)}
                        placeholder="Enter UAN number"
                        editable={!isLocked}
                    />
                    {errors.statutoryDetails?.uanNumber && <Text style={styles.errorText}>{errors.statutoryDetails.uanNumber}</Text>}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>ESIC Number</Text>
                    <TextInput
                        style={[styles.input, errors.statutoryDetails?.esicNumber && styles.inputError]}
                        value={profile.statutoryDetails?.esicNumber || ''}
                        onChangeText={(text) => handleStatutoryDetailsChange('esicNumber', text)}
                        placeholder="Enter ESIC number"
                        editable={!isLocked}
                    />
                    {errors.statutoryDetails?.esicNumber && <Text style={styles.errorText}>{errors.statutoryDetails.esicNumber}</Text>}
                </View>
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
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        marginBottom: 6,
        color: '#444',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        padding: 10,
        backgroundColor: '#f9f9f9',
    },
    inputError: {
        borderColor: 'red',
    },
    errorText: {
        color: 'red',
        fontSize: 12,
        marginTop: 4,
    },
});

export default StatutoryDetailsSection;