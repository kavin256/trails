# API Contract: Trip Sync Protocol

This document defines the HTTP API contract between the Trails mobile app and the backend server for synchronizing trip data in an offline-first architecture.

## Overview

The Trails sync protocol is designed to support:
- **Offline-first mobile clients** using SQLite as the primary local data store
- **Incremental sync** to minimize bandwidth and only transfer changed data
- **Last-writer-wins conflict resolution** based on `updatedAt` timestamps
- **Soft deletes** to ensure deleted trips propagate to all devices

## Data Transfer Object

### TripDTO

All API endpoints use a common `TripDTO` shape that extends the client-side `Trip` type with a `deleted` flag for soft deletes.

```typescript
interface TripDTO {
  id: string;              // Unique trip identifier
  title: string;           // Trip title (e.g., "Summer Vacation")
  destination: string;     // Destination (e.g., "Bali, Indonesia")
  startDate: string;       // ISO date string (e.g., "2025-07-15")
  endDate: string;         // ISO date string (e.g., "2025-07-25")
  notes?: string;          // Optional notes/description
  updatedAt: number;       // Unix timestamp in milliseconds
  deleted: boolean;        // Soft delete marker (true = deleted)
}
```

**Key fields:**

- **`updatedAt`**: Unix timestamp in milliseconds representing when this trip was last modified (created, updated, or deleted). This is the authoritative field for conflict resolution.
- **`deleted`**: Boolean flag indicating whether this trip has been soft-deleted. Deleted trips remain in the database with `deleted: true` so they can be synced to other devices.

## Endpoints

### GET /trips

Retrieve trips from the server, optionally filtering by modification time.

**Query Parameters:**

| Parameter | Type   | Required | Description                                                  |
|-----------|--------|----------|--------------------------------------------------------------|
| `since`   | number | No       | Unix timestamp (ms). If provided, only return trips with `updatedAt > since`. If omitted, return all trips. |

**Response:**

```typescript
{
  "trips": TripDTO[],      // Array of trips (including deleted ones)
  "serverTime": number     // Current server timestamp (ms)
}
```

**Example Request:**

```http
GET /trips?since=1704067200000
```

**Example Response:**

```json
{
  "trips": [
    {
      "id": "1",
      "title": "Summer Vacation",
      "destination": "Bali, Indonesia",
      "startDate": "2025-07-15",
      "endDate": "2025-07-25",
      "notes": "Beach resort and temple tours",
      "updatedAt": 1704153600000,
      "deleted": false
    },
    {
      "id": "5",
      "title": "Old Trip",
      "destination": "Deleted",
      "startDate": "2025-01-01",
      "endDate": "2025-01-02",
      "updatedAt": 1704240000000,
      "deleted": true
    }
  ],
  "serverTime": 1704326400000
}
```

**Notes:**

- The response includes both active (`deleted: false`) and deleted (`deleted: true`) trips.
- Deleted trips are included so clients can remove them from local storage.
- The `serverTime` should be saved by the client as `lastSyncedAt` after successfully applying the changes.

---

### POST /trips/batch

Push local changes to the server and receive server-side changes in return.

**Request Body:**

```typescript
{
  "clientId": string,         // Unique identifier for this client device
  "lastSyncedAt": number | null,  // Last server timestamp from previous sync (null on first sync)
  "changes": TripDTO[]        // Array of locally modified trips
}
```

**Response:**

```typescript
{
  "applied": Array<{          // Changes successfully applied to server
    id: string,
    status: "created" | "updated" | "deleted"
  }>,
  "conflicts": Array<{        // Conflicts detected (optional for v1)
    id: string,
    reason: string,
    serverTrip: TripDTO
  }>,
  "serverChanges": TripDTO[], // Server-side changes since lastSyncedAt
  "serverTime": number        // Current server timestamp (ms)
}
```

**Example Request:**

```http
POST /trips/batch
Content-Type: application/json

{
  "clientId": "device-abc-123",
  "lastSyncedAt": 1704067200000,
  "changes": [
    {
      "id": "10",
      "title": "Weekend Getaway",
      "destination": "Portland, Oregon",
      "startDate": "2025-09-05",
      "endDate": "2025-09-07",
      "notes": "Visit Powell's Books",
      "updatedAt": 1704326400000,
      "deleted": false
    },
    {
      "id": "3",
      "title": "Business Trip",
      "destination": "New York, USA",
      "startDate": "2025-08-10",
      "endDate": "2025-08-13",
      "updatedAt": 1704326410000,
      "deleted": true
    }
  ]
}
```

**Example Response:**

```json
{
  "applied": [
    { "id": "10", "status": "created" },
    { "id": "3", "status": "deleted" }
  ],
  "conflicts": [],
  "serverChanges": [
    {
      "id": "2",
      "title": "Summer Vacation",
      "destination": "Bali, Indonesia",
      "startDate": "2025-07-15",
      "endDate": "2025-07-30",
      "notes": "Beach resort and temple tours - EXTENDED",
      "updatedAt": 1704240000000,
      "deleted": false
    }
  ],
  "serverTime": 1704412800000
}
```

**Notes:**

- **`changes`**: Contains all trips that were created, updated, or deleted locally since the last sync.
- **`applied`**: Server confirms which changes were successfully applied.
- **`conflicts`**: For the initial backend implementation, this can be an empty array. Future versions may detect conflicts and return them here.
- **`serverChanges`**: Contains all server-side trips that were modified by other clients since `lastSyncedAt`.

## Conflict Resolution

### Last-Writer-Wins Strategy

The sync protocol uses a **last-writer-wins (LWW)** conflict resolution strategy based on the `updatedAt` timestamp:

1. When the server receives a trip update, it compares the incoming `updatedAt` with the stored trip's `updatedAt`.
2. **If incoming `updatedAt` > stored `updatedAt`**: The server accepts the change and updates its database.
3. **If incoming `updatedAt` ≤ stored `updatedAt`**: The server rejects the change (the stored version is newer or equal).

**Why this works:**

- Clients generate `updatedAt` timestamps locally using `Date.now()`.
- Even with minor clock drift, the timestamps are sufficiently granular (milliseconds) that genuine conflicts are rare.
- For true conflicts (two devices editing the same trip while offline), the device with the later timestamp wins.

**Initial Implementation:**

The first version of the backend will implement pure last-writer-wins without explicit conflict detection. The `conflicts` array in the `/trips/batch` response will be empty. Future versions may implement conflict detection and return conflicting trips for manual resolution.

## Soft Deletes

### How Deletion Works

Instead of permanently removing trips from the database, the system uses **soft deletes**:

1. When a user deletes a trip on the mobile app:
   - The trip's `deleted` field is set to `true`.
   - The `updatedAt` timestamp is updated to the current time.
   - The trip remains in the SQLite database.

2. During sync:
   - Deleted trips are sent to the server with `deleted: true`.
   - The server stores them with the deleted flag.
   - Other clients receive the deleted trip during their next sync.

3. Clients receiving a deleted trip:
   - Mark it as deleted in local SQLite (or remove it from the visible list).
   - Update their `lastSyncedAt` timestamp.

**Benefits:**

- Ensures deletions propagate to all devices.
- Allows recovery of accidentally deleted data (future feature).
- Maintains audit trail of all trips ever created.

## Sync Algorithm

### High-Level Client Flow

The mobile app follows this sync algorithm:

**1. Collect Local Changes**

- Query SQLite for all trips where `updatedAt > lastSyncedAt`.
- This includes trips that were created, updated, or deleted since the last sync.

**2. Send Changes to Server**

- POST the local changes to `/trips/batch`:
  ```json
  {
    "clientId": "<device-id>",
    "lastSyncedAt": <last-successful-sync-timestamp>,
    "changes": [<local-trips>]
  }
  ```

**3. Receive Server Response**

- Server applies the client's changes (last-writer-wins).
- Server returns:
  - `applied`: Confirmation of changes applied.
  - `serverChanges`: Any trips modified by other clients since `lastSyncedAt`.
  - `serverTime`: Current server timestamp.

**4. Merge Server Changes Locally**

- For each trip in `serverChanges`:
  - If `trip.deleted === true`: Mark the trip as deleted locally (or remove from visible list).
  - If `trip.updatedAt > local trip's updatedAt`: Update the local trip with server data (server wins).
  - If local trip doesn't exist: Insert it into SQLite.
- Update `lastSyncedAt` to `serverTime`.

**5. Handle Conflicts (Future)**

- If the server returns any items in the `conflicts` array, present them to the user for manual resolution.
- For the initial implementation, conflicts are not detected, so this array is always empty.

### First-Time Sync

When a device syncs for the first time:

- `lastSyncedAt` is `null`.
- The client sends all local trips in the `changes` array.
- The server returns all trips in `serverChanges`.
- The client merges server trips with local trips using last-writer-wins on `updatedAt`.

### Incremental Sync

On subsequent syncs:

- `lastSyncedAt` contains the `serverTime` from the previous sync.
- Only trips modified since that timestamp are transferred.
- This minimizes bandwidth and improves performance.

## Error Handling

### Network Errors

If the sync request fails (network unavailable, server error):

- The client should **not** update `lastSyncedAt`.
- Local changes remain in SQLite and will be sent on the next successful sync.
- The app continues to function offline using local SQLite data.

### Partial Success

If the server successfully applies some changes but fails on others:

- The `applied` array contains only the successfully applied changes.
- The client may retry failed changes on the next sync.

### Server Validation Errors

If the server rejects a trip (e.g., missing required fields):

- The server should return an error response with details.
- The client may log the error or alert the user.
- The client should not update `lastSyncedAt` if any changes were rejected.

## Security Considerations (Future)

The initial API implementation will not include authentication, but production versions should implement:

- **Authentication**: JWT or session-based auth to ensure only authorized users can access/modify their trips.
- **Authorization**: Users should only see/modify their own trips (`userId` field on TripDTO).
- **Rate Limiting**: Prevent abuse of the sync endpoints.
- **Input Validation**: Validate all incoming trip data on the server.

## Summary

This API contract provides:

- **Offline-first architecture**: Mobile app works fully offline with SQLite.
- **Efficient syncing**: Incremental sync transfers only changed data.
- **Simple conflict resolution**: Last-writer-wins based on timestamps.
- **Reliable deletion**: Soft deletes ensure deletions propagate to all devices.
- **Extensibility**: The contract supports future features like conflict detection and user authentication.

The design prioritizes simplicity, reliability, and minimal bandwidth usage while ensuring data consistency across devices.
