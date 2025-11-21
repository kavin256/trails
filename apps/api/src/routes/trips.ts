import express, { Request, Response } from 'express';
import { TripDTO } from '../types/trip.js';

const router = express.Router();

/**
 * GET /trips?since=<timestamp>
 * Retrieve trips from the server with optional incremental sync
 */
router.get('/', (req: Request, res: Response) => {
  const since = req.query.since ? Number(req.query.since) : undefined;

  // Mock trips data - in production, this will come from the database
  // Note: updatedAt is assigned by the server using Date.now()
  const mockTrips: TripDTO[] = [
    {
      id: '1',
      title: 'Summer Vacation',
      destination: 'Bali, Indonesia',
      startDate: '2025-07-15',
      endDate: '2025-07-25',
      notes: 'Beach resort and temple tours',
      updatedAt: Date.now() - 86400000 * 7, // 7 days ago
      deleted: false,
    },
    {
      id: '2',
      title: 'Business Trip',
      destination: 'New York, USA',
      startDate: '2025-08-10',
      endDate: '2025-08-13',
      notes: 'Tech conference downtown',
      updatedAt: Date.now() - 86400000 * 3, // 3 days ago
      deleted: false,
    },
    {
      id: '3',
      title: 'Weekend Getaway',
      destination: 'Portland, Oregon',
      startDate: '2025-09-05',
      endDate: '2025-09-07',
      updatedAt: Date.now() - 86400000, // 1 day ago
      deleted: false,
    },
    {
      id: '4',
      title: 'Cancelled Trip',
      destination: 'Seattle, Washington',
      startDate: '2025-06-01',
      endDate: '2025-06-05',
      notes: 'This trip was cancelled',
      updatedAt: Date.now() - 86400000 * 5, // 5 days ago
      deleted: true, // Soft-deleted trip
    },
  ];

  // Filter by 'since' if provided
  const filteredTrips = since
    ? mockTrips.filter((trip) => trip.updatedAt > since)
    : mockTrips;

  res.json({
    trips: filteredTrips,
    serverTime: Date.now(),
  });
});

/**
 * POST /trips/batch
 * Push local changes to the server and receive server-side changes
 */
router.post('/batch', (req: Request, res: Response) => {
  const { clientId, lastSyncedAt, changes } = req.body;

  // Validate required fields
  if (!clientId || !Array.isArray(changes)) {
    return res.status(400).json({
      error: 'Invalid request: clientId and changes[] are required',
    });
  }

  // In production, this would:
  // 1. Validate each trip in changes[]
  // 2. Assign server-controlled updatedAt timestamps (ignoring client's)
  // 3. Store in database using last-writer-wins
  // 4. Query for server-side changes since lastSyncedAt
  // 5. Return applied changes and server changes

  // For now, we just acknowledge all changes and return empty server changes
  const applied = changes.map((change: TripDTO) => ({
    id: change.id,
    status: change.deleted ? 'deleted' : (change.notes ? 'updated' : 'created'),
  }));

  res.json({
    applied,
    conflicts: [], // No conflict detection in initial implementation
    serverChanges: [], // Empty for stub - would contain trips modified by other clients
    serverTime: Date.now(),
  });
});

export const tripsRouter = router;
