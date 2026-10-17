# Architecture Reference

## Overview & Directory Topology

The codebase uses a modular feature-driven architecture:

```text
src/
├── app/                  # Application root, routing, global providers, layouts
│   ├── layouts/          # AppLayout, AuthLayout, PublicLayout
│   ├── providers/        # QueryClientProvider, AuthProvider, ThemeProvider, ToastProvider
│   └── router/           # React Router v6+ route declarations and route guards
├── components/           # Shared cross-feature UI components
│   ├── common/           # ErrorBoundary, PageHeader, EmptyState, StatCard
│   ├── feedback/         # Toast, Alert, SkeletonLoader, ProgressModal
│   └── ui/               # Button, Input, Select, Dialog, Dropdown, Table, Tabs, Switch, Badge
├── config/               # App constants, standard card formats, print presets, default fields
├── features/             # Isolated domain feature modules
│   ├── auth/             # Login, signup, password reset, session hooks
│   ├── organizations/    # Org switcher, create org, team members, invitations
│   ├── dashboard/        # Real aggregate metrics, quick actions, recent jobs
│   ├── templates/        # Template gallery, starter presets, version history
│   ├── editor/           # Visual canvas editor, toolbox, layers, properties panel, undo/redo
│   ├── forms/            # Form builder, schema definition, public submission handling
│   ├── records/          # Data records table, record detail, inline edit, CSV import
│   ├── generation/       # Batch rendering, single download, print sheets, ZIP export
│   ├── assets/           # Organization asset library (logos, portraits, backgrounds)
│   ├── requests/         # Custom template design request submission & tracker
│   └── settings/         # Organization settings, profile, role preferences
├── hooks/                # Cross-cutting utility hooks (useDebounce, useLocalStorage, etc.)
├── lib/                  # Library utilities (supabase client, utils, formatters, cn helper)
├── schemas/              # Zod validation schemas (template document, form definition, record)
├── services/             # Supabase data services
├── types/                # TypeScript shared models and database definitions
└── styles/               # CSS modules and Tailwind core styling
```

## Communication Contracts

1. **State Management**:
   - Server State: TanStack Query (`@tanstack/react-query`). No duplicate manual `useEffect` fetching with ad-hoc loading booleans.
   - Editor State: Dedicated Zustand store with snapshot stack for undo/redo.
   - Form State: React Hook Form with Zod resolvers.
2. **Persistence Guarantee**:
   - Design edits are saved either manually or via debounced autosave.
   - Optimistic updates must roll back gracefully on server error.
   - Published versions are immutable; active editing happens on draft versions.
