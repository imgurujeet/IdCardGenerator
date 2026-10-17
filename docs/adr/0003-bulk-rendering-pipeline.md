# ADR 0003: High-Fidelity Client-Side & Bounded Bulk Generation Pipeline

## Status
Accepted

## Context
Organizations need to generate both single cards on demand and bulk batches (hundreds or thousands of cards) in various formats (individual PDFs, ZIP bundle, or multi-up print sheets such as 8 or 10 cards per A4 page). Generating hundreds of high-res cards synchronously in a single UI thread can cause out-of-memory errors and freeze the browser.

## Decision
1. For client-side generation:
   - Chunk rendering into bounded batches (e.g. 10 cards per tick) with yielding to the event loop.
   - Use `pdf-lib` for fast vector PDF generation, embedding high-res rasterized imagery and sharp vector typography/vectors.
   - Use `jszip` for streaming ZIP archive compression.
   - Show real-time progress indicators (item count, percentage, estimated remaining time).
2. For server-side jobs / large enterprise batches:
   - Store generation requests in `generation_jobs`.
   - Edge Functions or workers process chunks idempotently and store artifacts in private Supabase Storage buckets.

## Consequences
- **Positive**: Responsive UI during large exports; immediate feedback.
- **Positive**: Support for print-ready N-up sheets (e.g., A4 2x5 grid) with crop marks and duplex alignment.
