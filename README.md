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
