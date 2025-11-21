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

**Phase 5: Local Persistence**
- ✓ Integrated SQLite database using `expo-sqlite` for offline storage
- ✓ Implemented `TripRepository` abstraction layer for data access
- ✓ Trips are now persisted locally in SQLite, surviving app restarts
- ✓ Database initialization with automatic table creation
- ✓ All CRUD operations write to both SQLite and in-memory state
- ✓ App behaves in a fully offline-first manner with local persistence
- ✓ No changes required to screen components (context abstraction works!)

### Next Steps

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
