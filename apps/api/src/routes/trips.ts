import express, { Request, Response } from 'express';
import { TripDTO } from '../types/trip.js';
import {
  getTripsForIncrementalSync,
  upsertTripFromClient,
  toTripDTO,
  permanentlyDeleteSoftDeletedTrips,
  TripRecord,
} from '../db/tripRepository.js';

const router = express.Router();

/**
 * GET /trips?since=<timestamp>
 * Retrieve trips from the server with optional incremental sync
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Parse optional 'since' query parameter
    let since: number | null = null;
    if (req.query.since) {
      const parsed = Number(req.query.since);
      since = isNaN(parsed) ? null : parsed;
    }

    // Get trips from SQLite database
    const records = await getTripsForIncrementalSync(since);
    const trips = records.map(toTripDTO);

    // Return trips with current server time
    res.json({
      trips,
      serverTime: Date.now(),
    });
  } catch (error) {
    console.error('Error in GET /trips:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /trips
 * Create a new trip
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { id, title, destination, startDate, endDate, notes } = req.body;

    // Validate required fields
    if (!id || !title || !destination || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required fields: id, title, destination, startDate, endDate',
      });
    }

    // Create the trip
    const record = await upsertTripFromClient({
      id,
      title,
      destination,
      startDate,
      endDate,
      notes: notes || '',
      deleted: false,
    });

    // Return the created trip
    res.status(201).json({
      trip: toTripDTO(record),
      serverTime: Date.now(),
    });
  } catch (error) {
    console.error('Error in POST /trips:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /trips/:id
 * Update an existing trip
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, destination, startDate, endDate, notes } = req.body;

    // Validate required fields
    if (!title || !destination || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required fields: title, destination, startDate, endDate',
      });
    }

    // Update the trip
    const record = await upsertTripFromClient({
      id,
      title,
      destination,
      startDate,
      endDate,
      notes: notes || '',
      deleted: false,
    });

    // Return the updated trip
    res.json({
      trip: toTripDTO(record),
      serverTime: Date.now(),
    });
  } catch (error) {
    console.error('Error in PUT /trips/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /trips/batch
 * Push local changes to the server and receive server-side changes
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { clientId, lastSyncedAt, changes } = req.body;

    // Validate required fields
    if (!clientId) {
      return res.status(400).json({
        error: 'Invalid request: clientId is required',
      });
    }

    // Ensure changes is an array (default to empty array if missing)
    const changesList: TripDTO[] = Array.isArray(changes) ? changes : [];

    // Parse lastSyncedAt
    const lastSynced: number | null =
      typeof lastSyncedAt === 'number' ? lastSyncedAt : null;

    // For incremental sync, capture server state since last sync (for merging with client writes)
    const serverChangesBeforeClientUpdate: TripRecord[] =
      lastSynced !== null ? await getTripsForIncrementalSync(lastSynced) : [];

    // Apply changes to SQLite database
    const applied: { id: string; status: 'created' | 'updated' | 'deleted' }[] = [];
    const appliedRecords: TripRecord[] = [];
    for (const change of changesList) {
      // Get existing trip to determine status
      const existingRecords = await getTripsForIncrementalSync(null);
      const existing = existingRecords.find((r) => r.id === change.id);

      // Upsert the trip with server-controlled timestamp
      const updatedRecord = await upsertTripFromClient({
        id: change.id,
        title: change.title,
        destination: change.destination,
        startDate: change.startDate,
        endDate: change.endDate,
        notes: change.notes,
        deleted: !!change.deleted,
      });

      // Determine status for applied array
      let status: 'created' | 'updated' | 'deleted';
      if (change.deleted) {
        status = 'deleted';
      } else if (existing) {
        status = 'updated';
      } else {
        status = 'created';
      }

      applied.push({ id: change.id, status });
      appliedRecords.push(updatedRecord);
    }

    // Compute server time
    const serverTime = Date.now();

    // Prepare serverChanges:
    // - For first sync: all trips after apply
    // - For incremental: merge prior server edits (before client apply) with the newly applied records,
    //   letting applied records win (last writer wins with server timestamps)
    let serverChangeRecords: TripRecord[];
    if (lastSynced === null) {
      serverChangeRecords = await getTripsForIncrementalSync(null);
    } else {
      const mergedById = new Map<string, TripRecord>();
      serverChangesBeforeClientUpdate.forEach((rec) => mergedById.set(rec.id, rec));
      appliedRecords.forEach((rec) => mergedById.set(rec.id, rec));
      serverChangeRecords = Array.from(mergedById.values());
    }
    const serverChanges = serverChangeRecords.map(toTripDTO);

    // Return response matching the API contract
    res.json({
      applied,
      conflicts: [], // No conflict detection in this implementation
      serverChanges,
      serverTime,
    });
  } catch (error) {
    console.error('Error in POST /trips/batch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /trips/cleanup
 * Permanently delete all soft-deleted trips from the database
 */
router.delete('/cleanup', async (req: Request, res: Response) => {
  try {
    const deletedCount = await permanentlyDeleteSoftDeletedTrips();
    res.json({
      message: 'Soft-deleted trips permanently removed',
      deletedCount,
      serverTime: Date.now(),
    });
  } catch (error) {
    console.error('Error in DELETE /trips/cleanup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const tripsRouter = router;
