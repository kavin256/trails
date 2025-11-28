import request from 'supertest';
import app from '../src/app.js';
import { clearAllTrips } from '../src/db/tripRepository.js';

interface TripDTO {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes?: string;
  updatedAt: number;
  deleted: boolean;
}

describe('/trips CRUD and sync behavior', () => {
  beforeEach(async () => {
    // Clear all data before each test for isolation
    await clearAllTrips();
  });

  describe('POST /trips - Create a new trip', () => {
    test('creates a new trip successfully', async () => {
      const trip = {
        id: 'trip-create-1',
        title: 'New Trip',
        destination: 'Paris, France',
        startDate: '2025-08-01',
        endDate: '2025-08-10',
        notes: 'Summer vacation',
      };

      const res = await request(app)
        .post('/trips')
        .send(trip)
        .expect(201);

      const body = res.body;
      expect(body.trip).toBeDefined();
      expect(body.trip.id).toBe(trip.id);
      expect(body.trip.title).toBe(trip.title);
      expect(body.trip.destination).toBe(trip.destination);
      expect(body.trip.deleted).toBe(false);
      expect(typeof body.trip.updatedAt).toBe('number');
      expect(typeof body.serverTime).toBe('number');
    });

    test('rejects request with missing required fields', async () => {
      const invalidTrip = {
        id: 'trip-invalid',
        title: 'Missing Fields',
        // Missing destination, startDate, endDate
      };

      await request(app)
        .post('/trips')
        .send(invalidTrip)
        .expect(400);
    });
  });

  describe('PUT /trips/:id - Update a trip', () => {
    test('updates an existing trip successfully', async () => {
      // First create a trip
      const originalTrip = {
        id: 'trip-update-1',
        title: 'Original Title',
        destination: 'London, UK',
        startDate: '2025-09-01',
        endDate: '2025-09-05',
        notes: 'Original notes',
      };

      await request(app)
        .post('/trips')
        .send(originalTrip)
        .expect(201);

      // Now update it
      const updates = {
        title: 'Updated Title',
        destination: 'London, UK',
        startDate: '2025-09-01',
        endDate: '2025-09-07', // Extended by 2 days
        notes: 'Updated notes',
      };

      const res = await request(app)
        .put(`/trips/${originalTrip.id}`)
        .send(updates)
        .expect(200);

      const body = res.body;
      expect(body.trip).toBeDefined();
      expect(body.trip.id).toBe(originalTrip.id);
      expect(body.trip.title).toBe(updates.title);
      expect(body.trip.endDate).toBe(updates.endDate);
      expect(body.trip.notes).toBe(updates.notes);
      expect(typeof body.trip.updatedAt).toBe('number');
      expect(typeof body.serverTime).toBe('number');
    });

    test('rejects update with missing required fields', async () => {
      const invalidUpdate = {
        title: 'Title Only',
        // Missing destination, startDate, endDate
      };

      await request(app)
        .put('/trips/some-id')
        .send(invalidUpdate)
        .expect(400);
    });
  });

  describe('Sync behavior after CRUD operations', () => {
    test('trip created via POST /trips appears in batch sync', async () => {
      // Create trip via POST
      const trip = {
        id: 'trip-sync-test',
        title: 'Sync Test Trip',
        destination: 'Tokyo, Japan',
        startDate: '2025-10-01',
        endDate: '2025-10-05',
        notes: 'Testing sync',
      };

      const createRes = await request(app)
        .post('/trips')
        .send(trip)
        .expect(201);

      const createBody = createRes.body;
      const serverTimeAfterCreate = createBody.serverTime;

      // Now sync from a different client
      const syncRes = await request(app)
        .post('/trips/batch')
        .send({
          clientId: 'test-client-sync',
          lastSyncedAt: null,
          changes: [],
        })
        .expect(200);

      const syncBody = syncRes.body;
      const foundTrip = syncBody.serverChanges.find((t: TripDTO) => t.id === trip.id);

      expect(foundTrip).toBeDefined();
      expect(foundTrip.title).toBe(trip.title);
      expect(foundTrip.destination).toBe(trip.destination);
    });

    test('trip updated via PUT /trips appears in incremental sync', async () => {
      // Create trip
      const trip = {
        id: 'trip-update-sync',
        title: 'Original',
        destination: 'NYC, USA',
        startDate: '2025-11-01',
        endDate: '2025-11-05',
        notes: 'Original',
      };

      await request(app)
        .post('/trips')
        .send(trip)
        .expect(201);

      // Do a sync to get the serverTime
      const firstSyncRes = await request(app)
        .post('/trips/batch')
        .send({
          clientId: 'client-1',
          lastSyncedAt: null,
          changes: [],
        })
        .expect(200);

      const firstSyncTime = firstSyncRes.body.serverTime;

      // Update the trip via PUT
      const updates = {
        title: 'Updated Title',
        destination: 'NYC, USA',
        startDate: '2025-11-01',
        endDate: '2025-11-08',
        notes: 'Extended trip',
      };

      await request(app)
        .put(`/trips/${trip.id}`)
        .send(updates)
        .expect(200);

      // Sync again with lastSyncedAt set
      const secondSyncRes = await request(app)
        .post('/trips/batch')
        .send({
          clientId: 'client-1',
          lastSyncedAt: firstSyncTime,
          changes: [],
        })
        .expect(200);

      const secondSyncBody = secondSyncRes.body;
      const updatedTrip = secondSyncBody.serverChanges.find((t: TripDTO) => t.id === trip.id);

      expect(updatedTrip).toBeDefined();
      expect(updatedTrip.title).toBe(updates.title);
      expect(updatedTrip.endDate).toBe(updates.endDate);
    });
  });

  test('first sync with a new trip stores it and returns it as serverChanges', async () => {
    const trip: Omit<TripDTO, 'updatedAt'> = {
      id: 'trip-1',
      title: 'Test Trip',
      destination: 'Test City',
      startDate: '2025-01-01',
      endDate: '2025-01-05',
      notes: 'Initial test trip',
      deleted: false,
    };

    // First sync: lastSyncedAt = null, one new trip
    const res = await request(app)
      .post('/trips/batch')
      .send({
        clientId: 'test-client',
        lastSyncedAt: null,
        changes: [
          {
            ...trip,
            // client updatedAt is ignored by server, but we must send something
            updatedAt: Date.now(),
          },
        ],
      })
      .expect(200);

    const body = res.body;

    expect(Array.isArray(body.applied)).toBe(true);
    expect(Array.isArray(body.serverChanges)).toBe(true);
    expect(typeof body.serverTime).toBe('number');

    // Trip should exist in serverChanges for first sync
    const serverTrip = body.serverChanges.find((t: TripDTO) => t.id === 'trip-1');
    expect(serverTrip).toBeDefined();
    expect(serverTrip.title).toBe(trip.title);
    expect(serverTrip.deleted).toBe(false);
    expect(typeof serverTrip.updatedAt).toBe('number');

    // GET /trips should also return this trip
    const getRes = await request(app).get('/trips').expect(200);
    const getBody = getRes.body;
    const fromGet = getBody.trips.find((t: TripDTO) => t.id === 'trip-1');
    expect(fromGet).toBeDefined();
    expect(fromGet.title).toBe(trip.title);
  });

  test('second sync with no changes and lastSyncedAt returns no new serverChanges', async () => {
    // First sync: create a trip
    const trip = {
      id: 'trip-2',
      title: 'Second Test',
      destination: 'Test City',
      startDate: '2025-02-01',
      endDate: '2025-02-03',
      notes: 'Second test trip',
      deleted: false,
    };

    const firstRes = await request(app)
      .post('/trips/batch')
      .send({
        clientId: 'test-client',
        lastSyncedAt: null,
        changes: [{ ...trip, updatedAt: Date.now() }],
      })
      .expect(200);

    const firstBody = firstRes.body;
    const firstServerTime: number = firstBody.serverTime;

    // Second sync: no changes, use last serverTime
    const secondRes = await request(app)
      .post('/trips/batch')
      .send({
        clientId: 'test-client',
        lastSyncedAt: firstServerTime,
        changes: [],
      })
      .expect(200);

    const secondBody = secondRes.body;
    expect(Array.isArray(secondBody.serverChanges)).toBe(true);
    // In normal operation, there should be no new serverChanges
    expect(secondBody.serverChanges.length).toBe(0);
  });

  test('soft delete via /trips/batch marks trip as deleted and returned as deleted', async () => {
    const trip = {
      id: 'trip-3',
      title: 'Trip To Delete',
      destination: 'Delete City',
      startDate: '2025-03-01',
      endDate: '2025-03-04',
      notes: 'To be deleted',
      deleted: false,
    };

    // Create trip
    const createRes = await request(app)
      .post('/trips/batch')
      .send({
        clientId: 'test-client',
        lastSyncedAt: null,
        changes: [{ ...trip, updatedAt: Date.now() }],
      })
      .expect(200);

    const createBody = createRes.body;
    const firstServerTime: number = createBody.serverTime;

    // Delete trip via soft delete
    const deleteRes = await request(app)
      .post('/trips/batch')
      .send({
        clientId: 'test-client',
        lastSyncedAt: firstServerTime,
        changes: [
          {
            ...trip,
            deleted: true,
            updatedAt: Date.now(),
          },
        ],
      })
      .expect(200);

    const deleteBody = deleteRes.body;
    expect(Array.isArray(deleteBody.applied)).toBe(true);

    // After deletion, GET /trips should show the trip with deleted: true
    const getRes = await request(app).get('/trips').expect(200);
    const getBody = getRes.body;
    const deletedTrip = getBody.trips.find((t: TripDTO) => t.id === 'trip-3');

    // Depending on your GET /trips semantics, you may:
    // - either still return deleted trips (with deleted: true)
    // - or filter them out.
    //
    // For this test, we assume deleted trips are still returned for sync,
    // but the mobile client may filter them out locally as needed.

    expect(deletedTrip).toBeDefined();
    expect(deletedTrip.deleted).toBe(true);
  });

  test('server ignores client clock skew and uses its own timestamps', async () => {
    // Simulate a client whose clock is far in the past
    const pastTrip = {
      id: 'clock-skew-past',
      title: 'Past Clock Trip',
      destination: 'Skew City',
      startDate: '2025-04-01',
      endDate: '2025-04-02',
      notes: 'Client clock in the past',
      deleted: false,
    };

    const farPast = 946684800000; // Jan 1, 2000 (far in the past)

    const pastRes = await request(app)
      .post('/trips/batch')
      .send({
        clientId: 'client-past',
        lastSyncedAt: null,
        changes: [
          {
            ...pastTrip,
            updatedAt: farPast, // bogus old timestamp from client
          },
        ],
      })
      .expect(200);

    const pastBody = pastRes.body;
    const serverTripPast = pastBody.serverChanges.find(
      (t: TripDTO) => t.id === 'clock-skew-past'
    );
    expect(serverTripPast).toBeDefined();
    // The server should have assigned its own, current updatedAt,
    // not blindly used the client's farPast timestamp.
    expect(serverTripPast!.updatedAt).not.toBe(farPast);

    // Now simulate a client whose clock is far in the future
    const futureTrip = {
      id: 'clock-skew-future',
      title: 'Future Clock Trip',
      destination: 'Skew City',
      startDate: '2025-05-01',
      endDate: '2025-05-03',
      notes: 'Client clock in the future',
      deleted: false,
    };

    const farFuture = 4102444800000; // Jan 1, 2100 (far in the future)

    const futureRes = await request(app)
      .post('/trips/batch')
      .send({
        clientId: 'client-future',
        lastSyncedAt: null,
        changes: [
          {
            ...futureTrip,
            updatedAt: farFuture, // bogus future timestamp from client
          },
        ],
      })
      .expect(200);

    const futureBody = futureRes.body;
    const serverTripFuture = futureBody.serverChanges.find(
      (t: TripDTO) => t.id === 'clock-skew-future'
    );
    expect(serverTripFuture).toBeDefined();
    // Again, server should override the client's timestamp
    expect(serverTripFuture!.updatedAt).not.toBe(farFuture);

    // Sanity: server-assigned timestamps should be in a reasonable range (rough check)
    const now = Date.now();
    expect(serverTripPast!.updatedAt).toBeLessThanOrEqual(now);
    expect(serverTripFuture!.updatedAt).toBeLessThanOrEqual(now);
  });

  test('repeated soft deletes do not resurrect or break the trip state', async () => {
    const trip = {
      id: 'repeat-delete-trip',
      title: 'Repeat Delete Trip',
      destination: 'Loop City',
      startDate: '2025-06-01',
      endDate: '2025-06-05',
      notes: 'Will be deleted multiple times',
      deleted: false,
    };

    // Initial create
    const createRes = await request(app)
      .post('/trips/batch')
      .send({
        clientId: 'client-delete',
        lastSyncedAt: null,
        changes: [{ ...trip, updatedAt: Date.now() }],
      })
      .expect(200);

    const createBody = createRes.body;
    const firstServerTime: number = createBody.serverTime;

    // First delete
    const firstDeleteRes = await request(app)
      .post('/trips/batch')
      .send({
        clientId: 'client-delete',
        lastSyncedAt: firstServerTime,
        changes: [
          {
            ...trip,
            deleted: true,
            updatedAt: Date.now(),
          },
        ],
      })
      .expect(200);

    const firstDeleteBody = firstDeleteRes.body;
    const deleteServerTime: number = firstDeleteBody.serverTime;

    // Second delete (idempotent behavior)
    const secondDeleteRes = await request(app)
      .post('/trips/batch')
      .send({
        clientId: 'client-delete',
        lastSyncedAt: deleteServerTime,
        changes: [
          {
            ...trip,
            deleted: true,
            updatedAt: Date.now(),
          },
        ],
      })
      .expect(200);

    const secondDeleteBody = secondDeleteRes.body;
    expect(Array.isArray(secondDeleteBody.applied)).toBe(true);

    // Check GET /trips result: our semantics are that deleted trips
    // may still be returned (with deleted: true) for sync.
    const getRes = await request(app).get('/trips').expect(200);
    const getBody = getRes.body;
    const deletedTrip = getBody.trips.find((t: TripDTO) => t.id === 'repeat-delete-trip');

    expect(deletedTrip).toBeDefined();
    expect(deletedTrip!.deleted).toBe(true);
  });

  test('multiple clients syncing at different times see a consistent history', async () => {
    const baseTrip = {
      id: 'multi-client-trip',
      title: 'Shared Trip',
      destination: 'Shared City',
      startDate: '2025-07-01',
      endDate: '2025-07-10',
      notes: 'Updated by different clients',
      deleted: false,
    };

    // Client A: create trip
    const createRes = await request(app)
      .post('/trips/batch')
      .send({
        clientId: 'client-A',
        lastSyncedAt: null,
        changes: [{ ...baseTrip, updatedAt: Date.now() }],
      })
      .expect(200);

    const createBody = createRes.body;
    const serverTimeAfterCreate: number = createBody.serverTime;

    // Client B: first sync after creation, no local changes
    const clientBFirstSync = await request(app)
      .post('/trips/batch')
      .send({
        clientId: 'client-B',
        lastSyncedAt: null,
        changes: [],
      })
      .expect(200);

    const clientBFirstBody = clientBFirstSync.body;
    const clientBFirstChanges: TripDTO[] = clientBFirstBody.serverChanges;
    const fromServerForB = clientBFirstChanges.find(
      (t: TripDTO) => t.id === 'multi-client-trip'
    );
    expect(fromServerForB).toBeDefined();
    expect(fromServerForB!.title).toBe(baseTrip.title);

    const serverTimeAfterBFirst: number = clientBFirstBody.serverTime;

    // Client A updates the trip title
    const updatedTitle = 'Shared Trip (Updated by A)';
    const updateRes = await request(app)
      .post('/trips/batch')
      .send({
        clientId: 'client-A',
        lastSyncedAt: serverTimeAfterCreate,
        changes: [
          {
            ...baseTrip,
            title: updatedTitle,
            deleted: false,
            updatedAt: Date.now(),
          },
        ],
      })
      .expect(200);

    const updateBody = updateRes.body;
    const serverTimeAfterUpdate: number = updateBody.serverTime;

    // Client B syncs again using its last serverTime
    const clientBSecondSync = await request(app)
      .post('/trips/batch')
      .send({
        clientId: 'client-B',
        lastSyncedAt: serverTimeAfterBFirst,
        changes: [],
      })
      .expect(200);

    const clientBSecondBody = clientBSecondSync.body;
    const bSecondChanges: TripDTO[] = clientBSecondBody.serverChanges;

    // B should now see the updated title in serverChanges
    const updatedForB = bSecondChanges.find(
      (t: TripDTO) => t.id === 'multi-client-trip'
    );
    expect(updatedForB).toBeDefined();
    expect(updatedForB!.title).toBe(updatedTitle);

    // Final GET /trips should also show the latest title
    const getRes = await request(app).get('/trips').expect(200);
    const getBody = getRes.body;
    const finalTrip = getBody.trips.find((t: TripDTO) => t.id === 'multi-client-trip');
    expect(finalTrip).toBeDefined();
    expect(finalTrip!.title).toBe(updatedTitle);
    expect(finalTrip!.deleted).toBe(false);
  });
});
