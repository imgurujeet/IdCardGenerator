# IDForge — Premium ID Card Designer & Generator SaaS Platform

IDForge is a production-grade, multi-tenant SaaS platform engineered for schools, universities, coaching institutes, corporate enterprises, hospitals, and events. It empowers organizations to design print-ready ID cards via a high-precision visual editor, collect records through dynamic public response forms, manage bulk datasets via CSV imports, and batch-print vector PDFs and ZIP archives.

---

## 🌟 Key Features

1. **Multi-Tenant Architecture**:
   - Isolated organization workspaces with role-based access control (`owner`, `admin`, `designer`, `data_operator`, `viewer`).
   - PostgreSQL schema with Row Level Security (RLS) policies checking tenant membership.
2. **Interactive Visual Canvas Designer**:
   - 3-panel professional workspace (Elements toolbox & layers on left, canvas with zoom/pan/grid-snap in center, properties inspector on right).
   - Canonical physical dimensions in millimeters (`mm`) matching CR80 standard PVC badges (`54 x 85.6mm`).
   - Dynamic data field binding (`{{student_name}}`, `{{student_id}}`, `{{blood_group}}`, `{{grade}}`, etc.).
   - Full undo/redo snapshot stack and real-time preview data switching.
   - Dual-side layout support (front & back with duplex printing alignment).
   - Dynamic QR codes (verification URLs) and Barcodes (Code128).
3. **Dynamic Form Builder & Public Submissions**:
   - Visual form builder supporting single-line text, email, phone, select, date, and portrait photo uploads.
   - Secure public submission portal (`/form/:slug`) with unauthenticated access, rate limiting, and input validation.
   - Submission review workflow: reviewing staff can approve submissions, automatically converting them into approved organization records.
4. **Data Management & CSV Importer**:
   - Search, filter, and pagination for organization student/staff records.
   - 4-step CSV import wizard: upload -> preview -> column mapping -> validation -> atomic commit.
   - Sample CSV template download.
5. **High-Resolution Document Generation & Export Engine**:
   - **Single Card Preview**: High-res 300 DPI vector PDF or PNG download.
   - **Batch Print Sheets (PDF)**: Arranges multiple cards per page (A4 2x4 grid / 8-up or 10-up) with precise margins, spacing, and duplex flip alignment.
   - **Bulk ZIP Archive**: Bundles individual high-resolution cards into a compressed `.zip` file with live progress tracking.
6. **Media Library & Custom Design Requests**:
   - Asset manager for logos, portraits, and background textures.
   - Design request portal for requesting bespoke template creation.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite 6, TypeScript (strict mode), React Router v6, Tailwind CSS.
- **State & Data**: TanStack Query v5, Zustand, React Hook Form, Zod.
- **Rendering & Output**: `pdf-lib` (vector PDF engine), `qrcode`, `jszip`, `papaparse`.
- **Backend & Database**: Supabase (PostgreSQL, Row Level Security, Auth, Storage, Edge Functions).
- **Testing & Quality**: Vitest, React Testing Library, JSDOM.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js `v20+` or `v22+`
- npm `v10+`

### 2. Installation
```bash
# Clone the repository
git clone <repository-url>
cd IDCardGenerator

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Set your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-publishable-key
```
*(Note: If live credentials are not yet configured, IDForge seamlessly runs with full demo data and local persistence, enabling immediate evaluation and testing.)*

### 4. Running Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing & Verification

```bash
# Run Vitest unit tests
npm test

# Run TypeScript strict typechecking
npm run typecheck

# Build production bundle
npm run build
```

---

## 🗄️ Database Migrations (Supabase)

All migrations are located in `supabase/migrations/`:
1. `20261017000001_initial_schema.sql`: Core tables, foreign keys, constraints, multi-tenant RLS policies, and secure `submit_public_form` RPC.
2. `20261017000002_seed_demo_data.sql`: Seed data for demo organizations (Oakwood Academy, NexaCorp), starter CR80 templates, and sample records.

To apply migrations using the Supabase CLI:
```bash
supabase db push
```

---

## 📄 License
ISC License. Built for production deployment.
