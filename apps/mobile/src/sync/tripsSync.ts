// apps/mobile/src/sync/tripsSync.ts
import { API_BASE_URL } from '../config/api';
import { getAllTrips } from '../db/tripRepository';
import type { Trip } from '../types/trip';

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

export async function pushAllTripsToServer(): Promise<BatchResponse> {
  // 1. Read all trips from local SQLite via repository
  const localTrips: Trip[] = await getAllTrips();

  // 2. Map to TripDTOs (no deletes yet – all false)
  const changes: TripDTO[] = localTrips.map((trip) => ({
    ...trip,
    deleted: false,
  }));

  // 3. Call backend
  const res = await fetch(`${API_BASE_URL}/trips/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId: 'mobile-dev-1',
      lastSyncedAt: null, // Phase 1: push-only, no incremental pull yet
      changes,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Sync failed with status ${res.status}: ${text}`);
  }

  const data = (await res.json()) as BatchResponse;
  // Phase 1: we only care that it succeeded; later we'll process serverChanges
  return data;
}
