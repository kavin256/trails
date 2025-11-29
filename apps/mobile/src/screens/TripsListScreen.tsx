// apps/mobile/src/screens/TripsListScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import type { RootStackNavigationProp } from '../types/navigation';
import type { Trip } from '../types/trip';
import { Screen } from '../components/Screen';
import { useTrips } from '../context/TripsContext';
import { syncTripsOnce } from '../sync/tripsSync';
import { clearLastSyncedAt, getLastSyncedAt } from '../sync/syncState';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { API_BASE_URL } from '../config/api';

export const TripsListScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { trips, deleteTrip, refreshFromDb, cleanupDeletedTrips } = useTrips();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAtState] = useState<number | null>(null);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    const loadLastSynced = async () => {
      try {
        const value = await getLastSyncedAt();
        setLastSyncedAtState(value);
      } catch (error) {
        console.error('Error loading lastSyncedAt:', error);
      }
    };

    loadLastSynced();
  }, []);

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

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      // Perform two-way sync: push local changes + pull server changes
      await syncTripsOnce();
      // Refresh the UI from SQLite (which now includes server changes)
      await refreshFromDb();
      // Update lastSyncedAt from persisted state
      const value = await getLastSyncedAt();
      setLastSyncedAtState(value);
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Sync failed',
        'Could not sync trips. Please check your connection and API_BASE_URL.'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearSync = async () => {
    Alert.alert(
      'Clear Sync State',
      'This will reset sync and force a full sync on next attempt. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearLastSyncedAt();
              setLastSyncedAtState(null);
              Alert.alert(
                'Success',
                'Sync state cleared. Next sync will be a full sync.'
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to clear sync state');
            }
          },
        },
      ]
    );
  };

  const handleCleanup = async () => {
    Alert.alert(
      'Cleanup Deleted Trips',
      'This will permanently remove all deleted trips from both your device and the server. This cannot be undone!',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Cleanup',
          style: 'destructive',
          onPress: async () => {
            try {
              // First cleanup server
              const serverRes = await fetch(`${API_BASE_URL}/trips/cleanup`, {
                method: 'DELETE',
              });

              if (!serverRes.ok) {
                throw new Error('Server cleanup failed');
              }

              // Then cleanup local database
              const localCount = await cleanupDeletedTrips();

              Alert.alert(
                'Success',
                `Permanently deleted ${localCount} trip(s) from your device and server.`
              );
            } catch (error) {
              console.error('Cleanup error:', error);
              Alert.alert(
                'Error',
                'Failed to cleanup trips. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  const renderRightActions = (trip: Trip) => (
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

  const renderTripItem = ({ item }: { item: Trip }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item)}
      overshootRight={false}
      friction={2}
    >
      <View style={styles.tripCard}>
        <TouchableOpacity
          onPress={() => handleTripPress(item.id)}
          activeOpacity={0.7}
          style={{ flex: 1 }}
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
          <Text style={styles.headerTitle}>Trips</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleRefresh}
              activeOpacity={0.7}
              disabled={isRefreshing}
            >
              <Text style={styles.syncButtonText}>
                {isRefreshing ? '⟳' : '↻'} Sync
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clearSyncButton}
              onPress={handleClearSync}
              activeOpacity={0.7}
            >
              <Text style={styles.clearSyncText}>Clear Sync</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddTrip}
              activeOpacity={0.7}
            >
              <Text style={styles.addButtonText}>+ New Trip</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.syncStatusRow}>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOnline ? '#34C759' : '#FF3B30' },
              ]}
            />
            <Text style={styles.statusText}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
          <View style={styles.syncInfoContainer}>
            {lastSyncedAt === null ? (
              <Text style={styles.lastSyncedText}>Not synced yet</Text>
            ) : (
              <Text style={styles.lastSyncedText}>
                Last synced: {new Date(lastSyncedAt).toLocaleString()}
              </Text>
            )}
            <TouchableOpacity onPress={handleCleanup} activeOpacity={0.7}>
              <Text style={styles.cleanupLink}>Cleanup deleted trips</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={renderTripItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          }
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
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncStatusRow: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  syncInfoContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  lastSyncedText: {
    fontSize: 12,
    color: '#666',
  },
  cleanupLink: {
    fontSize: 11,
    color: '#FF3B30',
    textDecorationLine: 'underline',
  },
  syncButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  clearSyncButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearSyncText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  deleteActionContainer: {
    width: 100,
  },
  deleteAction: {
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
