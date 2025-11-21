import React from 'react';
import { FlatList, TouchableOpacity, View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import type { RootStackNavigationProp } from '../types/navigation';
import type { Trip } from '../types/trip';
import { Screen } from '../components/Screen';
import { useTrips } from '../context/TripsContext';

export const TripsListScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { trips, deleteTrip } = useTrips();

  const handleTripPress = (tripId: string) => {
    navigation.navigate('TripDetails', { tripId });
  };

  const handleAddTrip = () => {
    navigation.navigate('EditTrip', {});
  };

  const handleDeleteTrip = (trip: Trip) => {
    Alert.alert(
      'Delete Trip',
      `Are you sure you want to delete "${trip.title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrip(trip.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete trip. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderRightActions = (trip: Trip) => {
    return (
      <View style={styles.deleteActionContainer}>
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => handleDeleteTrip(trip)}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTripItem = ({ item }: { item: Trip }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item)}
      overshootRight={false}
      friction={3}
    >
      <View style={styles.tripCard}>
        <TouchableOpacity
          onPress={() => handleTripPress(item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.tripTitle}>{item.title}</Text>
          <Text style={styles.tripDestination}>{item.destination}</Text>
          <Text style={styles.tripDates}>
            {item.startDate} → {item.endDate}
          </Text>
        </TouchableOpacity>
      </View>
    </Swipeable>
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
          data={trips}
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  deleteActionContainer: {
    justifyContent: 'center',
  },
  deleteAction: {
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
    borderRadius: 12,
    marginLeft: 8,
  },
  deleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
