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

**Phase 6: Sync & Backend** (Planned)
- Build Express API under `apps/api`
- Implement conflict resolution for offline sync
- Add background sync when online

## API & Sync Design

The Trails backend (to be implemented in `apps/api`) will provide a REST API for syncing trip data across devices while maintaining the offline-first architecture.

### API Endpoints

The backend will expose two primary endpoints:

**`GET /trips?since=<timestamp>`**
- Retrieve trips from the server
- Optional `since` query parameter for incremental sync (only return trips modified after the given timestamp)
- Returns `{ trips: TripDTO[], serverTime: number }`

**`POST /trips/batch`**
- Push local changes to the server and receive server-side changes
- Request body: `{ clientId: string, lastSyncedAt: number | null, changes: TripDTO[] }`
- Response: `{ applied: {...}[], conflicts: {...}[], serverChanges: TripDTO[], serverTime: number }`

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

- When the server receives a trip update, it compares the incoming `updatedAt` with the stored version
- The version with the newer `updatedAt` timestamp always wins
- This simple strategy works well for personal trip planning where true conflicts (two devices editing the same trip while offline) are rare

The initial implementation will use pure last-writer-wins without explicit conflict detection. Future versions may detect conflicts and allow manual resolution.

### Sync Algorithm

The mobile app follows this high-level sync flow:

1. **Collect local changes**: Query SQLite for all trips modified since last sync (`updatedAt > lastSyncedAt`)
2. **Push to server**: Send local changes via `POST /trips/batch` with the last sync timestamp
3. **Server applies changes**: Server uses last-writer-wins to merge incoming changes with its database
4. **Receive server changes**: Server returns any trips modified by other clients since `lastSyncedAt`
5. **Merge locally**: Client updates SQLite with server changes and updates `lastSyncedAt` to `serverTime`

**First-time sync**: When `lastSyncedAt` is `null`, the client sends all local trips, and the server returns all server trips. Both sides merge using last-writer-wins.

**Incremental sync**: On subsequent syncs, only trips modified since the last sync timestamp are transferred, minimizing bandwidth.

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
