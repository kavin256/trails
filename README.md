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
  - `EditTripScreen` - Create/edit trips (form coming soon)

**Phase 3: State Management**
- ✓ Created `Trip` domain type with proper TypeScript definitions
- ✓ Implemented `TripsContext` with React Context API
- ✓ Built CRUD operations: `getTripById`, `addTrip`, `updateTrip`, `deleteTrip`
- ✓ Integrated context across all screens via `useTrips()` hook
- ✓ In-memory state management (preparing for SQLite persistence)

### Next Steps

**Phase 4: Trip Form & Validation** (Coming Soon)
- Implement trip creation/editing form in `EditTripScreen`
- Add form validation and date pickers
- Wire up `addTrip` and `updateTrip` operations

**Phase 5: Local Persistence** (Planned)
- Integrate SQLite database for offline storage
- Implement repository pattern for data access
- Add migration support for schema changes

**Phase 6: Sync & Backend** (Planned)
- Build Express API under `apps/api`
- Implement conflict resolution for offline sync
- Add background sync when online

## Running the Mobile App

From the repository root:

```bash
npm run dev:mobile
```

Then scan the QR code with Expo Go on your mobile device.
