# Testing Checklist & Quality Gates

## 1. Unit Tests (Vitest)
- [ ] Schema validation tests: verify `TemplateDocumentSchema` parses valid documents and rejects corrupt objects.
- [ ] Unit conversion utility: `mmToPx`, `pxToMm`, `ptToPx` at 96 and 300 DPI.
- [ ] Dynamic field interpolator: test replacement of `{{field}}`, multiple occurrences, missing values with fallbacks.
- [ ] CSV parser & mapper: test valid rows, headers mapping, empty fields, malformed lines.
- [ ] Form submission schema generator: verify custom fields validation generation.

## 2. Integration Tests
- [ ] Multi-tenant isolation: verify cross-tenant access queries fail.
- [ ] Form publishing & unpublishing lifecycle.
- [ ] Bulk batch chunking: verify large list (e.g., 500 items) chunks into bounded batches without memory leaks.
- [ ] Template duplication and versioning.

## 3. End-to-End Tests (Playwright)
- [ ] Org creation -> Template design -> Save & Reload -> Form Publish -> Submit Record -> Review/Approve -> Export Single Card -> Export Bulk Batch.
- [ ] Editor canvas interactions: Select, Drag, Resize, Snap to Grid, Undo, Redo.

## 4. Pre-Commit / Build Verification
- [ ] `npm run lint` passes with 0 errors.
- [ ] `npm run typecheck` (`tsc --noEmit`) passes with 0 errors.
- [ ] `npm run test` passes all tests.
- [ ] `npm run build` generates production bundle cleanly.
