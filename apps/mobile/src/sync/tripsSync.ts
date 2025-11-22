import { API_BASE_URL } from '../config/api';
import {
  getAllTripsForSync,
  getTripById,
  insertTrip,
  updateTrip,
  deleteTrip,
} from '../db/tripRepository';
import type { Trip } from '../types/trip';
import { getLastSyncedAt, setLastSyncedAt } from './syncState';

type TripDTO = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes?: string;
  updatedAt: number;
  deleted: boolean;
};

type BatchResponse = {
  applied: Array<{ id: string; status: 'created' | 'updated' | 'deleted' }>;
  conflicts: unknown[];
  serverChanges: TripDTO[];
  serverTime: number;
};

/**
 * Upsert a trip from the server into local SQLite
 * If the trip exists, update it; if not, insert it
 */
async function upsertTripFromServer(serverTrip: TripDTO): Promise<void> {
  const localTrip: Trip = {
    id: serverTrip.id,
    title: serverTrip.title,
    destination: serverTrip.destination,
    startDate: serverTrip.startDate,
    endDate: serverTrip.endDate,
    notes: serverTrip.notes,
    updatedAt: serverTrip.updatedAt, // Use server-controlled timestamp
    deleted: serverTrip.deleted,
  };

  const existing = await getTripById(serverTrip.id);
  if (existing) {
    await updateTrip(serverTrip.id, localTrip);
  } else {
    await insertTrip(localTrip);
  }
}

/**
 * Perform a two-way sync with the backend
 *
 * Steps:
 * 1. Read lastSyncedAt from AsyncStorage
 * 2. Collect all local trips
 * 3. Push local changes to server (POST /trips/batch)
 * 4. Apply serverChanges to local SQLite (upsert or delete)
 * 5. Update lastSyncedAt with serverTime
 *
 * @throws Error if network request fails
 */
export async function syncTripsOnce(): Promise<void> {
  // Step 1: Read last sync timestamp
  const lastSyncedAt = await getLastSyncedAt();

  // Step 2: Read all local trips (including soft-deleted ones for sync)
  const localTrips: Trip[] = await getAllTripsForSync();

  // Step 3: Always send all local trips to the server
  // Reason: device clocks can drift, and comparing trip.updatedAt (device time)
  // with lastSyncedAt (server time) can cause missed pushes. The backend
  // uses server-controlled updatedAt and lastSyncedAt for correctness.
  const changes: TripDTO[] = localTrips.map((trip) => ({
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    notes: trip.notes,
    updatedAt: trip.updatedAt,
    deleted: trip.deleted, // Include actual deleted status
  }));

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 Starting sync...');
  console.log(
    `   lastSyncedAt: ${
      lastSyncedAt === null
        ? 'null (first sync)'
        : new Date(lastSyncedAt).toISOString()
    }`
  );
  console.log(`   Total local trips: ${localTrips.length}`);
  console.log(`   Sending ${changes.length} trips to server`);
  if (changes.length > 0) {
    console.log(
      '   Trip IDs being sent:',
      changes.map((t) => t.id).join(', ')
    );
  }

  // Step 4: POST to server
  const res = await fetch(`${API_BASE_URL}/trips/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId: 'mobile-dev-1',
      lastSyncedAt, // Will be null on first sync, or a number on subsequent syncs
      changes,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Sync failed with status ${res.status}: ${text}`);
  }

  // Step 5: Parse response
  const data = (await res.json()) as BatchResponse;

  console.log(`📦 Received from server:`);
  console.log(`   Applied: ${data.applied.length} trips`);
  console.log(`   Server changes: ${data.serverChanges.length} trips`);
  if (data.serverChanges.length > 0) {
    console.log(`   Server change IDs:`, data.serverChanges.map(t => `${t.id}${t.deleted ? ' (deleted)' : ''}`).join(', '));
  }

  // Step 6: Apply serverChanges to local SQLite
  for (const serverTrip of data.serverChanges) {
    if (serverTrip.deleted) {
      // Server says this trip is deleted - remove it locally
      console.log(`   🗑️  Deleting trip locally: ${serverTrip.id}`);
      await deleteTrip(serverTrip.id);
    } else {
      // Server has a trip - upsert it locally
      console.log(`   💾 Upserting trip locally: ${serverTrip.id} (serverUpdatedAt: ${new Date(serverTrip.updatedAt).toISOString()})`);
      await upsertTripFromServer(serverTrip);
    }
  }

  // Step 7: Save new lastSyncedAt
  await setLastSyncedAt(data.serverTime);

  console.log(`✅ Sync complete!`);
  console.log(`   New lastSyncedAt: ${new Date(data.serverTime).toISOString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Legacy push-only function (kept for backwards compatibility if needed)
 */
export async function pushAllTripsToServer(): Promise<BatchResponse> {
  const localTrips: Trip[] = await getAllTripsForSync();

  const changes: TripDTO[] = localTrips.map((trip) => ({
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    notes: trip.notes,
    updatedAt: trip.updatedAt,
    deleted: trip.deleted,
  }));

  const res = await fetch(`${API_BASE_URL}/trips/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId: 'mobile-dev-1',
      lastSyncedAt: null,
      changes,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Sync failed with status ${res.status}: ${text}`);
  }

  const data = (await res.json()) as BatchResponse;
  return data;
}
