# Trails

A travel planner that works 100% offline and syncs later. An offline-first monorepo containing a React Native mobile app and backend API.

## Structure

```
trails/
├── apps/
│   ├── mobile/     # React Native (Expo) mobile application
│   └── api/        # Node.js/Express backend API
└── package.json    # Root workspace configuration
```

## Getting Started

This project uses npm workspaces to manage multiple packages within a single repository.

### Prerequisites

- Node.js (v16 or higher recommended)
- npm (v7 or higher for workspaces support)

### Installation

```bash
npm install
```

This will install dependencies for all workspace packages.

## Workspaces

The monorepo is organized using npm workspaces, which allows:
- Shared dependencies across packages
- Running scripts across all workspaces
- Simplified dependency management

Each app under `apps/` will have its own `package.json` and can be developed independently while sharing common dependencies at the root level.

## Development Progress

### Completed ✓

**Phase 1: Monorepo Setup**
- ✓ Initialized npm workspaces configuration
- ✓ Created workspace structure (`apps/mobile`, `apps/api`)
- ✓ Configured .gitignore for Node.js/React Native projects

**Phase 2: Mobile App Foundation**
- ✓ Scaffolded Expo + TypeScript mobile app under `apps/mobile`
- ✓ Set up React Navigation with native stack
- ✓ Implemented three core screens:
  - `TripsListScreen` - Browse all trips
  - `TripDetailsScreen` - View trip details
  - `EditTripScreen` - Create/edit trips

**Phase 3: State Management**
- ✓ Created `Trip` domain type with proper TypeScript definitions
- ✓ Implemented `TripsContext` with React Context API
- ✓ Built CRUD operations: `getTripById`, `addTrip`, `updateTrip`, `deleteTrip`
- ✓ Integrated context across all screens via `useTrips()` hook

**Phase 4: Trip Form & Validation**
- ✓ Implemented full create/edit form in `EditTripScreen`
- ✓ Added form validation for required fields (title, destination)
- ✓ Wired up `addTrip` and `updateTrip` operations with context
- ✓ Trips can be created and edited via the dedicated form
- ✓ Form prefills data when editing existing trips
- ✓ Automatic navigation back to previous screen after save
- ✓ Trip start/end dates are selected via a native date picker (calendar) using `@react-native-community/datetimepicker`, instead of manual text input

**Phase 5: Local Persistence & Delete Operations**
- ✓ Integrated SQLite database using `expo-sqlite` for offline storage
- ✓ Implemented `TripRepository` abstraction layer for data access
- ✓ Trips are now persisted locally in SQLite, surviving app restarts
- ✓ Database initialization with automatic table creation
- ✓ All CRUD operations write to both SQLite and in-memory state
- ✓ Trips can be deleted from both list and details screens with confirmation dialogs
- ✓ Trips list supports swipe-to-delete interactions using `react-native-gesture-handler`, providing a native-feeling UX on both iOS and Android
- ✓ Deletions are persisted to SQLite - removed trips do not reappear after app restarts
- ✓ App behaves in a fully offline-first manner with local persistence
- ✓ No changes required to screen components (context abstraction works!)

### Next Steps

**Phase 6: Sync & Backend** ✓ Complete
- ✓ Created Express + TypeScript backend skeleton under `apps/api`
- ✓ Added `/health` endpoint for monitoring
- ✓ Implemented `GET /trips` and `POST /trips/batch` endpoints
- ✓ Defined `TripDTO` type matching the API contract
- ✓ Implemented SQLite database for persistent trip storage
- ✓ Server-controlled timestamp assignment (ignores client `updatedAt`, uses `Date.now()`)
- ✓ Incremental sync support (filtering by `since` timestamp)
- ✓ First-time sync support (returns all trips when `lastSyncedAt` is null)
- ✓ Soft delete support (trips with `deleted: true` remain in database)
- ✓ Last-writer-wins conflict resolution using server timestamps
- ✓ WAL mode for better concurrency and durability
- ✓ Data survives server restarts (persisted to `apps/api/data/trails-api.sqlite`)
- ✓ Implemented manual two-way sync in mobile app:
  - "Sync" button on trips list screen triggers full bidirectional sync
  - Always pushes ALL local trips to `POST /trips/batch` (avoids device clock drift issues)
  - Server uses last-writer-wins with server-controlled timestamps to handle duplicates
  - Uses `lastSyncedAt` (persisted in AsyncStorage) for incremental pull from server
  - First-time sync sends all local trips and receives all server trips
  - Applies `serverChanges` to local SQLite (upserts and deletes)
  - Updates `lastSyncedAt` with `serverTime` after successful sync
  - Refreshes UI from SQLite to show synced changes
  - "Clear Sync" button resets sync state to force full sync (useful when backend restarts)

**Phase 7: Future Enhancements**
- Add automatic background sync to mobile app when online
- Implement authentication and multi-user support
- Add conflict detection and resolution UI
- Enhanced data validation

## API & Sync Design

The Trails backend (`apps/api`) provides a REST API for syncing trip data across devices while maintaining the offline-first architecture. Trip data is persisted to a SQLite database with WAL mode for durability.

### API Endpoints

The backend exposes two primary endpoints:

**`GET /trips?since=<timestamp>`**
- Retrieve trips from the server
- Optional `since` query parameter for incremental sync (only return trips modified after the given timestamp)
- Returns `{ trips: TripDTO[], serverTime: number }`

**`POST /trips/batch`**
- Push local changes to the server and receive server-side changes
- Request body: `{ clientId: string, lastSyncedAt: number | null, changes: TripDTO[] }`
- Response: `{ applied: {...}[], conflicts: {...}[], serverChanges: TripDTO[], serverTime: number }`
- Although the client includes `updatedAt` in the payload, the server overrides it with its own timestamp

### Data Model

Trips are represented using a `TripDTO` that extends the client-side `Trip` type:

```typescript
{
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes?: string;
  updatedAt: number;    // Unix timestamp (ms) - used for conflict resolution
  deleted: boolean;     // Soft delete flag
}
```

The `deleted` flag enables **soft deletes**: when a trip is deleted, it's marked `deleted: true` with an updated timestamp rather than being permanently removed. This ensures deletions propagate to all devices during sync.

### Conflict Resolution

The system uses a **last-writer-wins (LWW)** strategy based on the `updatedAt` timestamp:

- When the server receives a trip update, it checks if a version already exists in the database
- The server assigns a new `updatedAt` timestamp using its own clock and stores the trip
- If the server already has a newer version (based on server timestamps), it rejects the change and returns the server's version to the client
- This simple strategy works well for personal trip planning where true conflicts (two devices editing the same trip while offline) are rare
- The backend ignores client timestamps and relies solely on server-generated `updatedAt` values when determining which version wins

The initial implementation will use pure last-writer-wins without explicit conflict detection. Future versions may detect conflicts and allow manual resolution.

### Server-Controlled Timestamps

The server is the single source of truth for all `updatedAt` timestamps. When the server receives a trip update, it always assigns `updatedAt` using its own clock (`Date.now()`), treating client-provided timestamps as provisional. Only the server's `updatedAt` is used for last-writer-wins conflict resolution, ensuring consistency across all devices. The `lastSyncedAt` value stored on each device is always derived from `serverTime` returned by the API, never from the device's local clock. This design eliminates issues caused by device clock drift, timezone differences, or manually changed phone dates, making the sync protocol robust against incorrect client clocks.

### Sync Algorithm

The mobile app follows this high-level sync flow:

1. **Collect local trips**: Query SQLite for all trips
2. **Push to server**: Send all local trips via `POST /trips/batch` with the last sync timestamp
3. **Server applies changes**: Server uses last-writer-wins (based on server timestamps) to merge incoming changes with its database
4. **Receive server changes**: Server returns any trips modified by other clients since `lastSyncedAt`
5. **Merge locally**: Client updates SQLite with server changes and updates `lastSyncedAt` to `serverTime`

**Why push all trips?** The client always sends all local trips (not just modified ones) to avoid bugs caused by device clock drift. When a device's clock is behind server time, comparing `trip.updatedAt` (device time) with `lastSyncedAt` (server time) can cause trips to be skipped. The backend's last-writer-wins logic efficiently handles duplicate pushes using server-controlled timestamps.

**First-time sync**: When `lastSyncedAt` is `null`, the client sends all local trips, and the server returns all server trips. Both sides merge using last-writer-wins.

**Incremental pull**: The server only returns trips modified since `lastSyncedAt` in `serverChanges`, minimizing bandwidth for downloads. The client pushes all trips but the server's LWW logic ensures only actual changes update the database.

### Offline-First Architecture

The mobile app treats **SQLite as the primary data store** and functions fully offline:

- All CRUD operations write to SQLite first
- The app works perfectly without network connectivity
- Sync is opportunistic: when online, the app syncs changes with the server
- If sync fails (network unavailable, server error), local changes remain in SQLite and will be sent on the next successful sync

This architecture ensures:
- Zero latency for user interactions (all reads/writes are local)
- Reliable operation in low/no connectivity environments
- Data consistency across devices when online

### Documentation

Full API contract specification: [docs/api-contract.md](docs/api-contract.md)

## Running the Mobile App

From the repository root:

```bash
npm run dev:mobile
```

Then scan the QR code with Expo Go on your mobile device.

## Backend (apps/api)

The `apps/api` directory contains a Node.js Express + TypeScript backend service that provides the Trip sync API with persistent SQLite storage.

### Running the Backend

From the repository root:

```bash
npm run dev:api
```

The server will start on port 4000 (or the port specified in the `PORT` environment variable).

### Current Endpoints

**`GET /health`**

Health check endpoint that returns the server status.

**Response:**
```json
{
  "status": "ok",
  "uptimeSeconds": 123.456,
  "serverTime": 1704326400000
}
```

**Test it:**
```bash
curl http://localhost:4000/health
```

Or open `http://localhost:4000/health` in your browser.

---

**Sync endpoints:**

**`GET /trips?since=<timestamp>`**

Retrieve trips from the server with optional incremental sync.

**Response:**
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
      "updatedAt": 1704326400000,
      "deleted": false
    }
  ],
  "serverTime": 1704412800000
}
```

**Test it:**
```bash
curl http://localhost:4000/trips
curl "http://localhost:4000/trips?since=1704000000000"
```

**`POST /trips/batch`**

Push local changes to the server and receive server-side changes.

**Request:**
```json
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
      "updatedAt": 1704326400000,
      "deleted": false
    }
  ]
}
```

**Response:**
```json
{
  "applied": [
    { "id": "10", "status": "created" }
  ],
  "conflicts": [],
  "serverChanges": [],
  "serverTime": 1704412800000
}
```

**Test it:**
```bash
curl -X POST http://localhost:4000/trips/batch \
  -H "Content-Type: application/json" \
  -d '{"clientId":"test-device","lastSyncedAt":null,"changes":[]}'
```

**Implementation Status:**

The `/trips` endpoints now use a **SQLite database** that implements real last-writer-wins behavior with server-controlled timestamps:

- **Persistent storage**: Trip data is stored in `apps/api/data/trails-api.sqlite` and survives server restarts
- **Server-controlled timestamps**: The server ignores client-provided `updatedAt` values and always assigns timestamps using `Date.now()`, ensuring the server is the single source of truth
- **Last-writer-wins**: When a client pushes a trip change, the server replaces any existing trip with the same ID, using arrival order to determine "last"
- **Incremental sync**: `GET /trips?since=<timestamp>` returns only trips with `updatedAt > since` (server timestamps)
- **First-time sync**: `POST /trips/batch` with `lastSyncedAt: null` returns all trips in `serverChanges`
- **Soft deletes**: Trips with `deleted: true` remain in the database and sync to all devices
- **WAL mode**: Database uses Write-Ahead Logging for better concurrency and durability

**Current Limitations:**
- No conflict detection (conflicts array is always empty)
- No authentication or authorization
- Single-user / development setup (no multi-tenancy)

### Next Steps for Backend

The sync endpoints now implement real last-writer-wins logic with server-controlled timestamps and persistent SQLite storage. Future enhancements:

- **Enhanced validation** of incoming trip data
- **Conflict detection** (optional) to populate the `conflicts` array when appropriate
- **Authentication** to ensure users only access their own trips
- **Multi-user support** with user isolation
