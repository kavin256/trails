# Trails

A travel planner that works completely offline and syncs when you're connected. Plan your trips anytime, anywhere.

**What's inside:**
- Mobile app (React Native with Expo)
- Backend API (Node.js + Express)
- SQLite databases for offline data storage

## Structure

```
trails/
├── apps/
│   ├── mobile/     # React Native (Expo) mobile application
│   └── api/        # Node.js/Express backend API
└── package.json    # Root workspace configuration
```

## Getting Started

### What You Need

- Node.js (version 16 or higher)
- npm (version 7 or higher)

### Installation

```bash
npm install
```

This installs everything for both the mobile app and API.

### Project Organization

This project uses npm workspaces to manage both apps in one place:
- Both apps share common dependencies
- Easy to run commands for either app
- Simpler to keep versions in sync

## What's Working

### ✓ Mobile App (Complete)

**Basic Setup**
- Expo + TypeScript app
- Three main screens: trip list, trip details, and edit/create
- Native navigation between screens

**Trip Management**
- Create, view, edit, and delete trips
- Form validation (title and destination required)
- Date picker for start and end dates
- Swipe to delete on trip list
- Delete confirmation dialogs

**Offline Storage**
- SQLite database stores all trips locally
- App works completely without internet
- Data survives app restarts
- Fast, instant responses (no waiting for network)

### ✓ Syncing (Complete)
**Backend API**
- Express + TypeScript server
- SQLite database for trip storage
- Three endpoints: health check, get trips, batch sync, cleanup
- Deployed to Render at https://trails-avdd.onrender.com/

**How Syncing Works**
- Tap "Sync" button or pull to refresh to sync
- Sends all your local trips to the server
- Gets back trips changed on other devices
- Most recent change wins if there's a conflict
- Works even if device clock is wrong (server controls timestamps)
- Deleted trips sync across devices
- First sync sends and receives everything
- Later syncs only download what changed

**What's Next**
- Automatic background syncing (currently manual)
- User accounts and login
- Better conflict detection
- More data validation

## How Syncing Works

### API Endpoints

The backend has three main endpoints:

**`GET /trips?since=<timestamp>`**
- Get trips from the server
- Add `?since=<timestamp>` to only get trips changed after that time
- Returns list of trips and current server time

**`POST /trips/batch`**
- Send your trips and get back changes from other devices
- Send: your device ID, last sync time, and all your trips
- Get back: which changes were saved, any conflicts, trips from other devices, server time

**`DELETE /trips/cleanup`**
- Permanently remove trips marked as deleted
- Returns how many trips were removed
- Warning: This cannot be undone!

### Trip Data Structure

Each trip has:
- `id`: Unique identifier
- `title`: Trip name
- `destination`: Where you're going
- `startDate`: When the trip starts (YYYY-MM-DD)
- `endDate`: When the trip ends (YYYY-MM-DD)
- `notes`: Optional notes about the trip
- `updatedAt`: Timestamp (in milliseconds) - used to determine which version is newer
- `deleted`: True if the trip was deleted (but still in database for syncing)

### How Conflicts Are Handled

When two devices edit the same trip offline:
- The most recent change wins
- "Most recent" is based on when changes reach the server, not device time
- The server controls all timestamps, so wrong device clocks don't break syncing
- This works well for personal trip planning (conflicts are rare)

Currently, conflicts aren't detected - the last change just wins. Future versions may let you choose which version to keep.

### Sync Process

When you tap "Sync" or pull to refresh:

1. **Send your trips**: The app sends all local trips to the server
2. **Server processes them**: The server compares with what it has and keeps the newest versions
3. **Get changes back**: The server sends trips that changed on other devices
4. **Update locally**: The app updates its database with changes from the server
5. **Save sync time**: The app remembers when it last synced (using server time)

**Why send all trips?** Sending everything avoids bugs from wrong device clocks. The server efficiently handles duplicates.

**First sync**: Sends all your trips, gets back all server trips, merges them together.

**Later syncs**: Sends all your trips, but only downloads trips that changed since last sync (saves bandwidth).

### Why Offline-First?

The app stores everything in SQLite on your device:

- All actions (create, edit, delete) happen locally first
- Works perfectly without internet
- Syncing happens when you're online
- If sync fails, changes stay on your device and sync later

Benefits:
- Instant responses (no waiting for network)
- Works on planes, in remote areas, anywhere
- Data stays in sync across devices when online

### More Details

Full technical documentation: [docs/api-contract.md](docs/api-contract.md)

## Running the Mobile App

From the repository root:

```bash
npm run dev:mobile
```

Then scan the QR code with Expo Go on your mobile device.

### Connecting to the Backend

The app configuration is in `apps/mobile/src/config/api.ts`:

- **When developing** (`__DEV__` mode): Connects to your local computer (e.g., `http://192.168.50.65:4000`)
- **When built for production**: Connects to deployed server at `https://trails-avdd.onrender.com`

To test with the production backend during development, edit the `API_BASE_URL` in that file.

## Backend API

The backend is a Node.js + Express + TypeScript server that syncs trips across devices.

### Run Locally

From the project root:

```bash
npm run dev:api
```

The server starts on port 4000 (or whatever `PORT` environment variable is set to).

### Run Tests

From the project root:

```bash
npm run test --workspace apps/api
```

Or from the `apps/api` folder:

```bash
cd apps/api
npm test
```

Tests use Jest and Supertest to verify the API works correctly.

### Deployment

**Production URL**: https://trails-avdd.onrender.com/

#### Database Setup

The database location can be set with the `DB_FILE_PATH` environment variable:

- **Local development**: `apps/api/data/trails-api.sqlite`
- **Production**: Set via `DB_FILE_PATH` or uses project-local path
- **Testing**: `apps/api/data/trails-api.test.sqlite`

For platforms like Render:
1. By default, uses a writable directory in the project
2. For data that survives redeployments, set up a persistent disk (like `/var/data`)
3. Point to it with `DB_FILE_PATH` environment variable

#### Building for Deployment

- TypeScript and types are in `dependencies` so they're available during deployment builds
- Build: `npm install && npm run build`
- Start: `npm start` (runs the compiled JavaScript)

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
# Local
curl http://localhost:4000/health

# Production
curl https://trails-avdd.onrender.com/health
```

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
# Local
curl http://localhost:4000/trips
curl "http://localhost:4000/trips?since=1704000000000"

# Production
curl https://trails-avdd.onrender.com/trips
curl "https://trails-avdd.onrender.com/trips?since=1704000000000"
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
# Local
curl -X POST http://localhost:4000/trips/batch \
  -H "Content-Type: application/json" \
  -d '{"clientId":"test-device","lastSyncedAt":null,"changes":[]}'

# Production
curl -X POST https://trails-avdd.onrender.com/trips/batch \
  -H "Content-Type: application/json" \
  -d '{"clientId":"test-device","lastSyncedAt":null,"changes":[]}'
```

**`DELETE /trips/cleanup`**

Permanently delete all soft-deleted trips from the database. This removes trips marked with `deleted: true`, freeing up database space.

**Response:**
```json
{
  "message": "Soft-deleted trips permanently removed",
  "deletedCount": 3,
  "serverTime": 1704412800000
}
```

**Test it:**
```bash
# Local
curl -X DELETE http://localhost:4000/trips/cleanup

# Production
curl -X DELETE https://trails-avdd.onrender.com/trips/cleanup
```

**How It Works:**

The backend uses SQLite to store trips:

- **Saves data**: Trips are stored in `apps/api/data/trails-api.sqlite` and survive server restarts
- **Server timestamps**: The server ignores device timestamps and uses its own, avoiding clock issues
- **Most recent wins**: When syncing, the most recent version (by server time) is kept
- **Smart downloading**: `GET /trips?since=<timestamp>` only returns trips changed after that time
- **First sync**: Returns all trips when `lastSyncedAt` is null
- **Deletion tracking**: Deleted trips stay in the database (marked as deleted) until cleaned up
- **Database mode**: Uses WAL (Write-Ahead Logging) for better performance

**Current Limitations:**
- No conflict detection (most recent always wins)
- No user accounts or login
- Single user only (not ready for multiple users)
- Deleted trips stay in database forever (use `DELETE /trips/cleanup` to remove them)

### Planned Improvements

Future enhancements:
- Better data validation
- Detect conflicts and let user choose
- User accounts and authentication
- Support multiple users with separate data
