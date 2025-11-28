# API Contract: Trip Sync Protocol

This document describes the API between the Trails mobile app and backend server. The app works offline by default and syncs when connected.

## Overview

The sync system supports:
- **Works offline first** - The app stores all data locally in SQLite and syncs when online
- **Smart syncing** - Only downloads changes since the last sync to save bandwidth
- **Automatic conflict handling** - The most recent change wins when conflicts occur
- **Deletion tracking** - Deleted trips sync across all devices

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
  updatedAt: number;       // Unix timestamp in milliseconds.
  deleted: boolean;        // Soft delete marker (true = deleted)
}
```

**Key fields:**

- **`updatedAt`**: Unix timestamp in milliseconds representing when this trip was last modified (created, updated, or deleted). This is the authoritative field for conflict resolution.
- **`deleted`**: Boolean flag indicating whether this trip has been soft-deleted. Deleted trips remain in the database with `deleted: true` so they can be synced to other devices.

### How Timestamps Work

**The server controls all timestamps.** When the mobile app sends a trip update, the server ignores the app's timestamp and assigns its own. This prevents problems caused by incorrect device clocks.

Why this matters:
- **Wrong device time**: If your phone's date/time is wrong, it won't break syncing
- **Timezone issues**: All timestamps come from the server, avoiding timezone confusion
- **Consistent ordering**: The server guarantees timestamps always increase

What the app must do:
- After syncing, update local trips with the timestamps the server returns
- Use `serverTime` (not the device clock) to track when the last sync happened

## API Endpoints

### POST /trips

Create a new trip on the server.

**Request Body:**

```typescript
{
  "id": string,            // Unique trip identifier (client-generated)
  "title": string,         // Trip title (required)
  "destination": string,   // Destination (required)
  "startDate": string,     // ISO date string (required)
  "endDate": string,       // ISO date string (required)
  "notes"?: string         // Optional notes
}
```

**Response:**

```typescript
{
  "trip": TripDTO,         // The created trip with server-assigned timestamp
  "serverTime": number     // Current server timestamp (ms)
}
```

**Example Request:**

```http
POST /trips
Content-Type: application/json

{
  "id": "trip-tokyo-2025",
  "title": "Tokyo Adventure",
  "destination": "Tokyo, Japan",
  "startDate": "2025-04-01",
  "endDate": "2025-04-10",
  "notes": "Visit cherry blossom festival"
}
```

**Example Response:**

```json
{
  "trip": {
    "id": "trip-tokyo-2025",
    "title": "Tokyo Adventure",
    "destination": "Tokyo, Japan",
    "startDate": "2025-04-01",
    "endDate": "2025-04-10",
    "notes": "Visit cherry blossom festival",
    "updatedAt": 1704326400000,
    "deleted": false
  },
  "serverTime": 1704326400000
}
```

**Status Codes:**

- `201 Created` - Trip successfully created
- `400 Bad Request` - Missing required fields
- `500 Internal Server Error` - Server error

---

### PUT /trips/:id

Update an existing trip.

**URL Parameters:**

| Parameter | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| `id`      | string | Yes      | The unique ID of the trip to update |

**Request Body:**

```typescript
{
  "title": string,         // Trip title (required)
  "destination": string,   // Destination (required)
  "startDate": string,     // ISO date string (required)
  "endDate": string,       // ISO date string (required)
  "notes"?: string         // Optional notes
}
```

**Response:**

```typescript
{
  "trip": TripDTO,         // The updated trip with new server-assigned timestamp
  "serverTime": number     // Current server timestamp (ms)
}
```

**Example Request:**

```http
PUT /trips/trip-tokyo-2025
Content-Type: application/json

{
  "title": "Tokyo Adventure - Extended",
  "destination": "Tokyo, Japan",
  "startDate": "2025-04-01",
  "endDate": "2025-04-12",
  "notes": "Visit cherry blossom festival, Mount Fuji day trip"
}
```

**Example Response:**

```json
{
  "trip": {
    "id": "trip-tokyo-2025",
    "title": "Tokyo Adventure - Extended",
    "destination": "Tokyo, Japan",
    "startDate": "2025-04-01",
    "endDate": "2025-04-12",
    "notes": "Visit cherry blossom festival, Mount Fuji day trip",
    "updatedAt": 1704500000000,
    "deleted": false
  },
  "serverTime": 1704500000000
}
```

**Status Codes:**

- `200 OK` - Trip successfully updated
- `400 Bad Request` - Missing required fields
- `500 Internal Server Error` - Server error

---

### GET /trips

Get trips from the server. You can filter to only get trips changed since a certain time.

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

**Important:**

- The response includes both active trips and deleted trips
- Deleted trips are included so the app knows to remove them locally
- Save `serverTime` as your `lastSyncedAt` after successfully applying changes

---

### POST /trips/batch

Send your local trips to the server and get back any changes from other devices.

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

**Important:**

- **`changes`**: Send all your local trips here. The server will use its own timestamps for these trips.
- **`applied`**: The server tells you which changes were saved successfully.
- **`conflicts`**: Currently always empty. Future versions may detect conflicts.
- **`serverChanges`**: Trips that other devices changed since your last sync. These use server timestamps.

---

### DELETE /trips/cleanup

Permanently remove soft-deleted trips from the database. Use this to clean up trips marked as deleted.

**Response:**

```typescript
{
  "message": string,           // Success message
  "deletedCount": number,      // Number of trips permanently removed
  "serverTime": number         // Current server timestamp (ms)
}
```

**Example Request:**

```http
DELETE /trips/cleanup
```

**Example Response:**

```json
{
  "message": "Soft-deleted trips permanently removed",
  "deletedCount": 3,
  "serverTime": 1704412800000
}
```

**Important:**

- This permanently removes trips marked with `deleted: true`
- Once removed, these trips cannot be recovered
- Only use this when you're sure you don't need the deleted trips

## How Conflicts Are Handled

### Most Recent Change Wins

When two devices edit the same trip while offline, the last one to sync wins:

1. The server receives a trip update and checks if it already has that trip
2. The server accepts the change and assigns a new timestamp using server time
3. This becomes the "official" version that all devices will receive

**Why this works:**

- All timestamps come from the server, not from individual devices
- Devices with wrong dates/times won't cause problems
- The order is based on when changes reach the server, not when they were made on the device

**Current status:**

The app uses simple "last change wins" logic. The `conflicts` array is always empty. Future versions may detect conflicts and let you choose which version to keep.

## How Deletion Works

Instead of immediately removing trips, the app marks them as deleted:

1. **When you delete a trip:**
   - The trip's `deleted` field becomes `true`
   - The trip stays in the database but is hidden from the app
   - The `updatedAt` time is updated

2. **During sync:**
   - Deleted trips are sent to the server with `deleted: true`
   - The server keeps them marked as deleted
   - Other devices receive the deletion during their next sync

3. **When receiving a deleted trip:**
   - The app marks it as deleted locally or removes it from the visible list
   - The sync timestamp is updated

**Why this approach:**

- Deletions sync to all your devices
- Could enable "undo delete" in the future
- Keeps a history of all trips

**Cleanup:**

Use the `DELETE /trips/cleanup` endpoint to permanently remove deleted trips from the database when you're sure you don't need them.

## How Syncing Works

### Step-by-Step Sync Process

**1. Gather Your Trips**

- The app collects all local trips from SQLite
- This includes new trips, edited trips, and deleted trips

**2. Send to Server**

- The app sends all trips to `/trips/batch`:
  ```json
  {
    "clientId": "your-device-id",
    "lastSyncedAt": 1704067200000,
    "changes": [all your trips]
  }
  ```

**Why send all trips?** This avoids bugs from wrong device clocks. The server's logic handles duplicates efficiently.

**3. Server Processes Changes**

- The server compares your trips with what it has
- For each trip, the most recent version wins (based on server time)
- The server assigns new timestamps for accepted changes

**4. Get Changes from Server**

The server sends back:
- `applied`: Which of your changes were saved
- `serverChanges`: Trips that other devices changed
- `serverTime`: Current server time

**5. Update Locally**

For trips in `serverChanges`:
- If `deleted: true`, remove from your visible list
- If the trip is new, add it to your database
- If it exists, update it with the server version
- Always use the server's timestamp

Then:
- Update your `lastSyncedAt` to the `serverTime` from the response
- Refresh the app to show the synced data

### First Sync

When syncing for the first time:
- `lastSyncedAt` is `null`
- Send all your local trips
- Get back all trips from the server
- Merge them together (most recent wins)

### Later Syncs

After the first sync:
- `lastSyncedAt` has the time from your last successful sync
- Send all your local trips
- Get back only trips changed since `lastSyncedAt`
- This saves bandwidth by not downloading everything every time

## Handling Errors

### Network Problems

If sync fails (no internet, server down):
- Don't update `lastSyncedAt`
- Keep your local changes in the database
- They'll sync on the next successful attempt
- The app works offline using local data

### Partial Success

If some changes save but others fail:
- The `applied` array shows which changes worked
- Failed changes will retry on the next sync

### Invalid Data

If the server rejects a trip (missing fields, invalid data):
- The server returns an error message
- Don't update `lastSyncedAt`
- The app may show an error or log the issue

## Security (Future)

The current API has no authentication. Production versions should add:

- **Login system**: Only let authorized users access their trips
- **User separation**: Users can only see their own trips
- **Rate limits**: Prevent abuse of the API
- **Data validation**: Check all incoming data is valid

## Summary

This API provides:

- **Works offline**: The app functions fully without internet
- **Efficient syncing**: Only downloads changes since last sync
- **Simple conflict handling**: Most recent change wins
- **Deletion syncing**: Deleted trips sync across devices
- **Room to grow**: Designed to support future features like authentication

The design focuses on simplicity, reliability, and saving bandwidth while keeping data consistent across all devices.
