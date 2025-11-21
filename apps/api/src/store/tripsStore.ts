import { TripDTO } from '../types/trip.js';

/**
 * In-memory Trip store
 *
 * This implements basic last-writer-wins behavior with server-controlled timestamps.
 * The server is the single source of truth for updatedAt - client timestamps are ignored.
 *
 * NOTE: Data is not persisted across server restarts.
 */
let trips: TripDTO[] = [];

/**
 * Get trips modified after the given timestamp
 * @param since - Optional Unix timestamp (ms). If provided, only return trips with updatedAt > since
 * @returns Array of trips matching the criteria
 */
export function getTripsSince(since?: number): TripDTO[] {
  if (since === undefined || since === null) {
    return [...trips]; // Return a copy of all trips
  }
  return trips.filter((trip) => trip.updatedAt > since);
}

/**
 * Apply a batch of client changes using last-writer-wins with server-controlled timestamps
 *
 * @param changes - Array of trip changes from the client
 * @param lastSyncedAt - Last server timestamp the client synced at (null on first sync)
 * @returns Object containing applied changes, server changes, and current server time
 */
export function applyBatch(
  changes: TripDTO[],
  lastSyncedAt: number | null | undefined
): {
  applied: { id: string; status: 'created' | 'updated' | 'deleted' }[];
  serverChanges: TripDTO[];
  serverTime: number;
} {
  // Server time is the single source of truth for all timestamps
  const serverTime = Date.now();

  const applied: { id: string; status: 'created' | 'updated' | 'deleted' }[] = [];

  // Process each incoming change
  for (const change of changes) {
    // Create canonical trip with SERVER-ASSIGNED timestamp (ignore client's updatedAt)
    const canonicalTrip: TripDTO = {
      ...change,
      updatedAt: serverTime, // Server always assigns the authoritative timestamp
    };

    // Find existing trip by id
    const existingIndex = trips.findIndex((t) => t.id === change.id);

    if (existingIndex !== -1) {
      // Trip exists - replace it (last-writer-wins)
      trips[existingIndex] = canonicalTrip;
      applied.push({
        id: change.id,
        status: change.deleted ? 'deleted' : 'updated',
      });
    } else {
      // New trip - add it
      trips.push(canonicalTrip);
      applied.push({
        id: change.id,
        status: change.deleted ? 'deleted' : 'created',
      });
    }
  }

  // Compute server changes: trips modified since the client's last sync
  let serverChanges: TripDTO[];
  if (lastSyncedAt === null || lastSyncedAt === undefined) {
    // First-time sync: send all trips
    serverChanges = [...trips];
  } else {
    // Incremental sync: only trips modified after lastSyncedAt
    serverChanges = trips.filter((t) => t.updatedAt > lastSyncedAt);
  }

  return {
    applied,
    serverChanges,
    serverTime,
  };
}

/**
 * Get all trips (for debugging/testing)
 */
export function getAllTrips(): TripDTO[] {
  return [...trips];
}

/**
 * Clear all trips (for testing)
 */
export function clearAllTrips(): void {
  trips = [];
}
