# Security Model & Threat Mitigation

## 1. Multi-Tenant Authorization Principles

1. **Strict Tenancy Scoping**:
   All core tables (`templates`, `template_versions`, `forms`, `form_submissions`, `records`, `generation_jobs`, `assets`, `template_requests`) contain a mandatory `organization_id` column.
2. **PostgreSQL Row Level Security (RLS)**:
   Every table has RLS enabled with explicit tenant membership checks:
   ```sql
   CREATE POLICY "Org members can view records"
     ON records FOR SELECT
     USING (
       EXISTS (
         SELECT 1 FROM organization_members
         WHERE organization_members.organization_id = records.organization_id
           AND organization_members.user_id = auth.uid()
       )
     );
   ```
3. **Role-Based Permissions**:
   - `owner`: full administrative privileges, user management, billing, deletion.
   - `admin`: create, update, delete templates, forms, records, jobs, assets.
   - `designer`: create & edit templates, upload assets.
   - `data_operator`: import CSVs, approve/reject form submissions, run generation jobs.
   - `viewer`: view-only permissions.

## 2. Public Form Endpoint Protection

- Public forms are accessible without authentication using unique, unguessable UUIDs or cryptographic slugs.
- Public submission executes via a strictly scoped RPC (`submit_public_form`) that:
  - Validates that the form exists, `is_published = true`, and `accepting_submissions = true`.
  - Disallows client manipulation of `organization_id`, `status`, or internal metadata.
  - Sanitizes submitted JSON against the form's `fields_schema`.
  - Enforces payload size limits (<= 1MB) and uploaded image size/MIME limits (<= 5MB, JPEG/PNG/WebP).

## 3. Storage Security

- Private bucket `id-card-private` for employee/student portraits and generated ID card bundles.
- Read access requires authenticated tenant membership or signed temporary download URLs (expires in 15 minutes).
- Public bucket `id-card-public` restricted to organization public logos and template thumbnail previews only.

## 4. API & Secret Management

- Client only accesses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY`.
- No service-role keys are bundled in client assets or checked into Git.
- Client requests always carry user's Supabase JWT.
