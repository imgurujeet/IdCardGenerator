# Database Schema — ID Card Designer & Generator SaaS

## Entity Relationship Overview

The schema is organized to provide multi-tenant isolation, versioned design documents, dynamic forms, flexible student/employee records, and traceable generation jobs.

### 1. Identity & Organizations

#### `profiles`
- `id`: `uuid` primary key (references `auth.users(id)` on delete cascade)
- `email`: `text` not null
- `full_name`: `text`
- `avatar_url`: `text`
- `created_at`, `updated_at`: `timestamptz`

#### `organizations`
- `id`: `uuid` primary key default `gen_random_uuid()`
- `name`: `text` not null
- `slug`: `text` unique not null
- `logo_url`: `text`
- `created_at`, `updated_at`: `timestamptz`

#### `organization_members`
- `id`: `uuid` primary key default `gen_random_uuid()`
- `organization_id`: `uuid` references `organizations(id)` on delete cascade
- `user_id`: `uuid` references `profiles(id)` on delete cascade
- `role`: `text` check (`role in ('owner', 'admin', 'designer', 'data_operator', 'viewer')`)
- `created_at`: `timestamptz`
- Unique constraint: `(organization_id, user_id)`

#### `invitations`
- `id`: `uuid` primary key default `gen_random_uuid()`
- `organization_id`: `uuid` references `organizations(id)` on delete cascade
- `email`: `text` not null
- `role`: `text` not null
- `token`: `text` unique not null
- `expires_at`: `timestamptz` not null
- `created_by`: `uuid` references `profiles(id)`

### 2. Templates & Versions

#### `templates`
- `id`: `uuid` primary key default `gen_random_uuid()`
- `organization_id`: `uuid` references `organizations(id)` on delete cascade
- `name`: `text` not null
- `description`: `text`
- `category`: `text` not null ('school', 'college', 'corporate', 'event', 'hospital', 'club', 'custom')
- `is_active`: `boolean` default true
- `active_version_id`: `uuid` (circular ref resolved after versions created)
- `created_by`: `uuid` references `profiles(id)`
- `created_at`, `updated_at`: `timestamptz`

#### `template_versions`
- `id`: `uuid` primary key default `gen_random_uuid()`
- `template_id`: `uuid` references `templates(id)` on delete cascade
- `version_number`: `integer` not null
- `design_data`: `jsonb` not null (adheres to `TemplateDocumentSchema`)
- `thumbnail_url`: `text`
- `is_published`: `boolean` default false
- `created_by`: `uuid` references `profiles(id)`
- `created_at`: `timestamptz`
- Unique constraint: `(template_id, version_number)`

### 3. Forms & Submissions

#### `forms`
- `id`: `uuid` primary key default `gen_random_uuid()`
- `organization_id`: `uuid` references `organizations(id)` on delete cascade
- `template_id`: `uuid` references `templates(id)` on delete set null
- `title`: `text` not null
- `description`: `text`
- `public_slug`: `text` unique not null
- `is_published`: `boolean` default false
- `accepting_submissions`: `boolean` default true
- `fields_schema`: `jsonb` not null (array of form field definitions)
- `created_by`: `uuid` references `profiles(id)`
- `created_at`, `updated_at`: `timestamptz`

#### `form_submissions`
- `id`: `uuid` primary key default `gen_random_uuid()`
- `organization_id`: `uuid` references `organizations(id)` on delete cascade
- `form_id`: `uuid` references `forms(id)` on delete cascade
- `data`: `jsonb` not null
- `status`: `text` default 'submitted' check (`status in ('submitted', 'under_review', 'approved', 'rejected', 'archived')`)
- `record_id`: `uuid` (links to created record once approved)
- `created_at`, `updated_at`: `timestamptz`

### 4. Records & Data Management

#### `records`
- `id`: `uuid` primary key default `gen_random_uuid()`
- `organization_id`: `uuid` references `organizations(id)` on delete cascade
- `identifier`: `text` -- primary reference (student ID, employee code, etc.)
- `full_name`: `text` not null
- `data`: `jsonb` not null (arbitrary dynamic fields e.g. class, blood_group, department, photo_url)
- `status`: `text` default 'approved' check (`status in ('pending', 'approved', 'rejected', 'archived')`)
- `source`: `text` default 'manual' check (`source in ('manual', 'form_submission', 'csv_import')`)
- `created_at`, `updated_at`: `timestamptz`

#### `record_import_jobs`
- `id`: `uuid` primary key default `gen_random_uuid()`
- `organization_id`: `uuid` references `organizations(id)` on delete cascade
- `file_name`: `text` not null
- `total_rows`: `integer` default 0
- `processed_rows`: `integer` default 0
- `failed_rows`: `integer` default 0
- `errors`: `jsonb` default '[]'::jsonb
- `status`: `text` check (`status in ('pending', 'processing', 'completed', 'failed')`)
- `created_by`: `uuid` references `profiles(id)`
- `created_at`: `timestamptz`

### 5. Generation Jobs & Artifacts

#### `generation_jobs`
- `id`: `uuid` primary key default `gen_random_uuid()`
- `organization_id`: `uuid` references `organizations(id)` on delete cascade
- `template_version_id`: `uuid` references `template_versions(id)`
- `output_mode`: `text` check (`output_mode in ('single_pdf', 'bulk_zip', 'print_sheet')`)
- `print_layout`: `jsonb` (sheet format e.g. A4, columns, rows, margins)
- `total_records`: `integer` not null
- `processed_records`: `integer` default 0
- `status`: `text` default 'pending' check (`status in ('pending', 'processing', 'completed', 'failed')`)
- `artifact_url`: `text`
- `error_message`: `text`
- `created_by`: `uuid` references `profiles(id)`
- `created_at`, `updated_at`: `timestamptz`

### 6. Assets & Requests

#### `assets`
- `id`: `uuid` primary key default `gen_random_uuid()`
- `organization_id`: `uuid` references `organizations(id)` on delete cascade
- `name`: `text` not null
- `file_path`: `text` not null
- `file_type`: `text` not null
- `file_size`: `bigint` not null
- `asset_category`: `text` check (`asset_category in ('logo', 'portrait', 'background', 'graphic')`)
- `created_by`: `uuid` references `profiles(id)`
- `created_at`: `timestamptz`

#### `template_requests`
- `id`: `uuid` primary key default `gen_random_uuid()`
- `organization_id`: `uuid` references `organizations(id)` on delete cascade
- `title`: `text` not null
- `organization_type`: `text` not null
- `description`: `text` not null
- `sample_files`: `jsonb` default '[]'::jsonb
- `status`: `text` default 'submitted' check (`status in ('submitted', 'in_review', 'in_progress', 'completed', 'rejected')`)
- `created_by`: `uuid` references `profiles(id)`
- `created_at`: `timestamptz`
