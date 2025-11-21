import React from 'react';
import { FlatList, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '../types/navigation';
import { Screen } from '../components/Screen';

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

// Dummy data for demonstration
export const DUMMY_TRIPS: Trip[] = [
  {
    id: '1',
    title: 'Summer Vacation',
    destination: 'Bali, Indonesia',
    startDate: '2025-07-15',
    endDate: '2025-07-25',
    notes: 'Beach resort and temple tours',
  },
  {
    id: '2',
    title: 'Business Trip',
    destination: 'New York, USA',
    startDate: '2025-08-10',
    endDate: '2025-08-13',
    notes: 'Tech conference downtown',
  },
  {
    id: '3',
    title: 'Weekend Getaway',
    destination: 'Portland, Oregon',
    startDate: '2025-09-05',
    endDate: '2025-09-07',
  },
];

export const TripsListScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp>();

  const handleTripPress = (tripId: string) => {
    navigation.navigate('TripDetails', { tripId });
  };

  const handleAddTrip = () => {
    navigation.navigate('EditTrip', {});
  };

  const renderTripItem = ({ item }: { item: Trip }) => (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => handleTripPress(item.id)}
      activeOpacity={0.7}
    >
      <Text style={styles.tripTitle}>{item.title}</Text>
      <Text style={styles.tripDestination}>{item.destination}</Text>
      <Text style={styles.tripDates}>
        {item.startDate} → {item.endDate}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Trips</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddTrip}>
            <Text style={styles.addButtonText}>+ New Trip</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={DUMMY_TRIPS}
          keyExtractor={(item) => item.id}
          renderItem={renderTripItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    gap: 12,
  },
  tripCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tripDestination: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  tripDates: {
    fontSize: 14,
    color: '#999',
  },
});
