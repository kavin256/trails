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

describe('/trips and /trips/batch sync behavior', () => {
  beforeEach(async () => {
    // Clear all data before each test for isolation
    await clearAllTrips();
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
});
