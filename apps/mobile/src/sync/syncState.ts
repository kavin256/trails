import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Sync State Management
 *
 * Persists sync metadata using AsyncStorage, specifically the lastSyncedAt timestamp
 * which tracks the last successful sync with the server.
 */

const LAST_SYNC_KEY = 'trails:lastSyncedAt';

/**
 * Get the last synced timestamp from AsyncStorage
 * @returns The last sync timestamp (Unix ms) or null if never synced
 */
export async function getLastSyncedAt(): Promise<number | null> {
  try {
    const value = await AsyncStorage.getItem(LAST_SYNC_KEY);
    if (value === null) {
      return null;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  } catch (error) {
    console.error('Error reading lastSyncedAt from AsyncStorage:', error);
    return null;
  }
}

/**
 * Save the last synced timestamp to AsyncStorage
 * @param value - Unix timestamp in milliseconds from the server
 */
export async function setLastSyncedAt(value: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, value.toString());
  } catch (error) {
    console.error('Error saving lastSyncedAt to AsyncStorage:', error);
    throw error;
  }
}

/**
 * Clear the last synced timestamp (force full sync on next attempt)
 */
export async function clearLastSyncedAt(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
    console.log('✅ Cleared lastSyncedAt - next sync will be a full sync');
  } catch (error) {
    console.error('Error clearing lastSyncedAt from AsyncStorage:', error);
    throw error;
  }
}
