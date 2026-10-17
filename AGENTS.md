# AGENTS.md — ID Card Platform Engineering Rules

This repository implements a production-grade, multi-tenant SaaS for ID card design, form-driven data collection, record management, and high-resolution document generation.

## Non-Negotiable Engineering Conventions

1. **Architecture & Boundaries**:
   - Maintain clear separation between UI layer, Application/State layer, Rendering layer, Service layer, and Database layer.
   - Never embed direct Supabase queries or raw SQL inside presentation components. Always use typed services and TanStack Query hooks.
   - Do not write monolithic components (>400 lines combining logic, layout, and rendering). Split into focused hooks, subcomponents, and utilities.

2. **Multi-Tenancy & Security First**:
   - Every tenant-scoped entity belongs to an `organization_id`.
   - Never trust client-supplied IDs, roles, or organization claims without verification in RLS or server-side functions.
   - Zero tolerance for cross-tenant data leaks. Test RLS policies for `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
   - Never commit secrets or expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

3. **Template Document Integrity**:
   - Canvas templates are saved as structured, versioned JSON (`TemplateDocumentSchema`), never as raster screenshots.
   - Physical dimensions (`mm`) are canonical. The rendering engine computes exact pixel coordinates based on the target DPI (default 300 for print, responsive for canvas editor).
   - Editor preview and PDF/image export output must share the exact same layout resolution logic.

4. **Reliable Workflows**:
   - Every user-facing workflow must explicitly handle **Loading**, **Empty**, **Error**, and **Success** states.
   - Bulk jobs and CSV imports must be chunked and bounded to avoid browser freezing or memory exhaustion.
   - Support undo/redo, auto-save protection, and graceful recovery from network failures.

5. **Quality Verification**:
   - Follow the procedures detailed in `.agents/skills/id-card-platform-engineering/SKILL.md`.
   - Keep TypeScript in strict mode. Run `tsc --noEmit`, lint, and unit tests to ensure no regressions.
