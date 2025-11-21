import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RootStackRouteProp, RootStackNavigationProp } from '../types/navigation';
import { Screen } from '../components/Screen';
import { useTrips } from '../context/TripsContext';

export const EditTripScreen: React.FC = () => {
  const route = useRoute<RootStackRouteProp<'EditTrip'>>();
  const navigation = useNavigation<RootStackNavigationProp>();
  const { tripId } = route.params;

  // Context is ready for form implementation in next step
  const { getTripById, addTrip, updateTrip } = useTrips();

  const isEditMode = !!tripId;

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>
          {isEditMode ? 'Edit Trip' : 'New Trip'}
        </Text>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Edit / New Trip Screen
          </Text>
          <Text style={styles.placeholderSubtext}>
            Form coming in a later step
          </Text>
          {isEditMode && (
            <Text style={styles.tripIdText}>
              Editing trip: {tripId}
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
  tripIdText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  backButton: {
    backgroundColor: '#666',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
