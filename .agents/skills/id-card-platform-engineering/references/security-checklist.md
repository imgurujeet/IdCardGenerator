# Security Checklist & Rules

## 1. Multi-Tenant Authorization
- [ ] Every query to an organization-scoped table includes `organization_id` matching an active user membership.
- [ ] Supabase RLS policies verify `auth.uid()` against `organization_members` for the specific `organization_id`.
- [ ] Never pass user role from client request payloads without server-side verification.
- [ ] Cross-tenant access is tested: Org A user cannot read, update, or delete Org B resources even with direct IDs.

## 2. Secrets & Keys
- [ ] Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` exist on the client.
- [ ] Never expose `SUPABASE_SERVICE_ROLE_KEY` in Vite build or client bundles.
- [ ] Check `.env.example` vs `.gitignore` to ensure `.env.local` is never committed.

## 3. Public Forms
- [ ] Anonymous respondents cannot browse existing submissions or access organization internal data.
- [ ] Form submission validates that the target form is currently published and open for submissions.
- [ ] Input payload is sanitized and validated against the form's defined schema.
- [ ] Uploaded photos go into isolated storage paths with MIME validation (JPEG, PNG, WebP) and size limits (<= 5MB).

## 4. File Storage
- [ ] Private bucket for organization photos and records.
- [ ] Signed short-lived URLs used for secure document preview/download.
- [ ] Storage policies check organization membership before granting upload/read rights.
