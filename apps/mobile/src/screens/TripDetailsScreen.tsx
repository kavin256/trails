import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RootStackRouteProp, RootStackNavigationProp } from '../types/navigation';
import { Screen } from '../components/Screen';
import { DUMMY_TRIPS } from './TripsListScreen';

export const TripDetailsScreen: React.FC = () => {
  const route = useRoute<RootStackRouteProp<'TripDetails'>>();
  const navigation = useNavigation<RootStackNavigationProp>();
  const { tripId } = route.params;

  // Find the trip from dummy data
  const trip = DUMMY_TRIPS.find((t) => t.id === tripId);

  if (!trip) {
    return (
      <Screen>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Trip not found</Text>
        </View>
      </Screen>
    );
  }

  const handleEdit = () => {
    navigation.navigate('EditTrip', { tripId: trip.id });
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>{trip.title}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Destination</Text>
          <Text style={styles.value}>{trip.destination}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Dates</Text>
          <Text style={styles.value}>
            {trip.startDate} → {trip.endDate}
          </Text>
        </View>

        {trip.notes && (
          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.value}>{trip.notes}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Text style={styles.editButtonText}>Edit Trip</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
  },
});
