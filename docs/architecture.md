# System Architecture — ID Card Designer & Generator SaaS

## 1. High-Level Architecture Overview

The system is designed as a high-performance modular frontend application backed by Supabase as a comprehensive managed backend (PostgreSQL database, Authentication, Row Level Security, Storage, and Edge Functions).

```mermaid
graph TD
    Client[Web Client (React + Vite + TypeScript)]
    subgraph Frontend Architecture
        Router[React Router v6]
        AppShell[App Shell & Nav]
        Editor[Visual Canvas Editor (Zustand + Fabric Adapter)]
        FormBuilder[Form Builder & Public Form Viewer]
        RecordMgr[Record Manager & CSV Importer]
        Generator[Rendering Engine (pdf-lib, qrcode, jszip)]
    end
    
    subgraph Supabase BaaS
        Auth[Supabase Auth (JWT & Session)]
        DB[(PostgreSQL + RLS Policies)]
        Storage[(Supabase Storage - Private & Public Buckets)]
        EdgeFunctions[Supabase Edge Functions]
    end

    Client --> Router
    Router --> AppShell
    AppShell --> Editor
    AppShell --> FormBuilder
    AppShell --> RecordMgr
    AppShell --> Generator

    Frontend Architecture -->|Authenticated REST / Realtime| Auth
    Frontend Architecture -->|PostgREST + RLS| DB
    Frontend Architecture -->|Signed URLs / Uploads| Storage
    Frontend Architecture -->|Trusted Batch Orchestration| EdgeFunctions
```

## 2. Layers & Responsibilities

1. **Presentation / UI Layer**: Built with accessible, responsive React primitives, styled with modern Tailwind CSS tokens adhering to an editorial, premium SaaS design palette (slate neutrals, dark graphite typography, deep cobalt/indigo accents).
2. **State & Caching Layer**:
   - `TanStack Query`: Server state synchronization, automated caching, deduplication, and invalidation.
   - `Zustand`: High-frequency interactive state management for the visual canvas editor, supporting fast undo/redo history stacks and active selection.
   - `React Hook Form` + `Zod`: Robust validation for forms, CSV mapping, and schema parsing.
3. **Canvas & Rendering Engine Layer**:
   - Canvas Adapter: Decoupled interface wrapping the underlying canvas library (Fabric.js) to allow smooth future upgrades without modifying editor components.
   - Core Renderer: Headless resolver that takes a `TemplateDocument` and a data record, resolves dynamic variables, loads asset references, and renders high-DPI output into Canvas, SVG, or vector PDF via `pdf-lib`.
4. **Data & Security Layer**:
   - PostgreSQL schema with multi-tenant isolation keyed by `organization_id`.
   - Strict Row Level Security policies checking current user tenancy via `organization_members`.
   - Private Supabase Storage buckets for portraits and organization documents.
