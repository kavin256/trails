import express, { Request, Response } from 'express';
import { TripDTO } from '../types/trip.js';
import { getTripsSince, applyBatch } from '../store/tripsStore.js';

const router = express.Router();

/**
 * GET /trips?since=<timestamp>
 * Retrieve trips from the server with optional incremental sync
 */
router.get('/', (req: Request, res: Response) => {
  // Parse optional 'since' query parameter
  let since: number | undefined;
  if (req.query.since) {
    const parsed = Number(req.query.since);
    since = isNaN(parsed) ? undefined : parsed;
  }

  // Get trips from the in-memory store
  const trips = getTripsSince(since);

  // Return trips with current server time
  res.json({
    trips,
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
  if (!clientId) {
    return res.status(400).json({
      error: 'Invalid request: clientId is required',
    });
  }

  // Ensure changes is an array (default to empty array if missing)
  const changesList: TripDTO[] = Array.isArray(changes) ? changes : [];

  // Apply changes using the in-memory store with server-controlled timestamps
  const result = applyBatch(changesList, lastSyncedAt);

  // Return response matching the API contract
  res.json({
    applied: result.applied,
    conflicts: [], // No conflict detection in this implementation
    serverChanges: result.serverChanges,
    serverTime: result.serverTime,
  });
});

export const tripsRouter = router;
