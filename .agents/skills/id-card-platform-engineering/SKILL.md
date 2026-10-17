---
name: id-card-platform-engineering
description: Standards, architecture guidelines, workflows, and quality gates for engineering the ID Card Designer and Generator SaaS platform.
---

# ID Card Platform Engineering Skill

This skill defines the engineering protocols, architectural rules, code structure, data handling, and quality gates for the ID Card Designer & Generator SaaS application.

## 1. System Architecture & Boundaries

The application is structured as a modular client-side frontend with Supabase as the backend-as-a-service (BaaS), strictly separated across layers:

- **UI Layer (`src/components/`, `src/app/`, `src/features/*/components`)**: Accessible React components, Radix/shadcn primitives, Lucide icons, Tailwind CSS styling. No direct raw SQL or untyped Supabase calls inside presentation components.
- **Application / State Layer (`src/features/*/hooks`, `src/features/editor/store`)**: Zustand stores for complex client state (like the visual canvas editor), React Hook Form + Zod for user inputs, TanStack Query for server state caching and synchronization.
- **Canvas / Rendering Layer (`src/features/editor/canvas`, `src/features/generation/renderer`)**: Canvas abstraction adapter isolating Fabric.js / Konva / native Canvas API. Reusable schema interpreter powering both real-time UI preview and high-resolution PDF/image exports.
- **Service Layer (`src/services/`, `src/features/*/api`)**: Typed API clients wrapping Supabase database queries, storage requests, and edge functions.
- **Database & Security Layer (`supabase/migrations/`)**: PostgreSQL with strict Row Level Security (RLS), multi-tenant isolation keyed on `organization_id`, foreign key constraints, check constraints, and role-based policies.

## 2. Multi-Tenant Authorization Rules

1. **Every Tenant-Scoped Table Must Include `organization_id`**: No orphan records. Foreign key must reference `organizations(id)` on delete cascade or restrict according to data sensitivity.
2. **Strict Supabase RLS**:
   - `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies must verify user membership through `organization_members` where `user_id = auth.uid()`.
   - Never rely on client-provided IDs without verifying tenancy in RLS or trusted backend functions.
3. **Roles Hierarchy**:
   - `owner`: full control, invite/remove members, delete workspace, manage billing.
   - `admin`: manage members, settings, templates, records, jobs.
   - `designer`: create, edit, publish templates and template assets.
   - `data_operator`: import CSVs, review/approve submissions, trigger generation jobs.
   - `viewer`: read-only access to authorized records and templates.
4. **Public Form Isolation**:
   - Public submissions bypass user authentication via public endpoints/RPCs.
   - Only published, active forms accept responses.
   - Submissions cannot set system fields (`status`, `organization_id`, `approved_by`).
   - Rate limiting and payload size limits are strictly enforced.

## 3. Template Document Schema Conventions

- All templates persist as versioned JSON documents adhering to `TemplateDocumentSchema` (`zod`).
- **Units**: Physical dimensions are canonical (millimeters: `mm`), e.g., standard CR80 ID-1 card size: `85.60mm x 53.98mm` (landscape) or `53.98mm x 85.60mm` (portrait).
- **Resolution/DPI**: Screen editing renders at dynamic device DPI; print exports render at 300 DPI (`DPI = 300`, scale factor = 300 / 25.4 ≈ 11.811 pixels per mm).
- **Element Types**:
  - `static-text`, `dynamic-text` (bound to dataset fields, e.g., `{{student_name}}`)
  - `image`, `logo`, `background-image`
  - `shape` (rect, rounded-rect, circle, line)
  - `qr-code` (dynamic encoding of verification URLs or record data)
  - `barcode` (Code128, EAN-13, etc.)
- **Dual Layout**: Support both `front` and `back` layouts within a single document.
- **No Screenshots As Source of Truth**: Vector & object properties are always preserved.

## 4. Workflows & Quality Checklist

### Database & Migration Changes:
- [ ] Migration is placed in `supabase/migrations/<timestamp>_<name>.sql`.
- [ ] RLS is explicitly enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
- [ ] Clear policies for `SELECT`, `INSERT`, `UPDATE`, `DELETE` are tested for multi-tenant isolation.
- [ ] Indexes exist on foreign keys (`organization_id`, `template_id`, `form_id`, etc.).
- [ ] TypeScript types are updated or generated.

### Canvas Editor & Rendering:
- [ ] Adapter isolates the underlying canvas library (`fabric.js`).
- [ ] Undo / Redo uses bounded immutable snapshots (avoid tracking raw mouse moves).
- [ ] Dynamic fields fall back gracefully if sample data is missing.
- [ ] Output PDF vectors match on-screen layout within 0.5mm tolerance.

### UI & UX:
- [ ] Editorial, modern SaaS design: Warm off-white/slate, graphite text, deep cobalt/indigo primary accent.
- [ ] Every view handles: Loading, Empty, Error, and Success states.
- [ ] Accessible keyboard navigation, clear visual focus outlines, responsive breakpoints.
- [ ] No dead placeholder buttons or mocked fake counters.
