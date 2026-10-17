-- ==============================================================================
-- IDForge Database Schema — Multi-Tenant Architecture & Security
-- Migration: 20261017000001_initial_schema.sql
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Profiles (Tied to Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 2. Organizations & Multi-Tenant Membership
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    industry TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'designer', 'data_operator', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_org_user UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Helper security function: Check organization membership
CREATE OR REPLACE FUNCTION public.check_user_in_org(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
$$;

-- Helper security function: Check user role in org
CREATE OR REPLACE FUNCTION public.check_user_role(org_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid() AND role = ANY(allowed_roles)
  );
$$;

-- RLS: Organizations
CREATE POLICY "Users can view organizations they belong to"
    ON public.organizations FOR SELECT
    USING (public.check_user_in_org(id));

CREATE POLICY "Authenticated users can create an organization"
    ON public.organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and Owners can update their organization"
    ON public.organizations FOR UPDATE
    USING (public.check_user_role(id, ARRAY['owner', 'admin']));

-- RLS: Organization Members
CREATE POLICY "Users can view members of their organization"
    ON public.organization_members FOR SELECT
    USING (public.check_user_in_org(organization_id));

CREATE POLICY "Admins and Owners can invite/manage members"
    ON public.organization_members FOR INSERT
    WITH CHECK (public.check_user_role(organization_id, ARRAY['owner', 'admin']));

CREATE POLICY "Admins and Owners can update member roles"
    ON public.organization_members FOR UPDATE
    USING (public.check_user_role(organization_id, ARRAY['owner', 'admin']));

CREATE POLICY "Admins and Owners can remove members"
    ON public.organization_members FOR DELETE
    USING (public.check_user_role(organization_id, ARRAY['owner', 'admin']));

-- ------------------------------------------------------------------------------
-- 3. Templates & Template Versions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('school', 'college', 'corporate', 'event', 'hospital', 'club', 'custom')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_templates_org ON public.templates(organization_id);
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    design_data JSONB NOT NULL,
    thumbnail_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_template_version UNIQUE (template_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_template_versions_template ON public.template_versions(template_id);
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

-- RLS: Templates
CREATE POLICY "Org members can view templates"
    ON public.templates FOR SELECT
    USING (public.check_user_in_org(organization_id));

CREATE POLICY "Designers, Admins, Owners can create templates"
    ON public.templates FOR INSERT
    WITH CHECK (public.check_user_role(organization_id, ARRAY['owner', 'admin', 'designer']));

CREATE POLICY "Designers, Admins, Owners can update templates"
    ON public.templates FOR UPDATE
    USING (public.check_user_role(organization_id, ARRAY['owner', 'admin', 'designer']));

CREATE POLICY "Admins and Owners can delete templates"
    ON public.templates FOR DELETE
    USING (public.check_user_role(organization_id, ARRAY['owner', 'admin']));

-- RLS: Template Versions
CREATE POLICY "Org members can view template versions"
    ON public.template_versions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.templates t
        WHERE t.id = template_versions.template_id
          AND public.check_user_in_org(t.organization_id)
    ));

CREATE POLICY "Designers, Admins, Owners can save template versions"
    ON public.template_versions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.templates t
        WHERE t.id = template_versions.template_id
          AND public.check_user_role(t.organization_id, ARRAY['owner', 'admin', 'designer'])
    ));

-- ------------------------------------------------------------------------------
-- 4. Dynamic Forms & Public Submissions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    public_slug TEXT UNIQUE NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    accepting_submissions BOOLEAN NOT NULL DEFAULT true,
    fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_forms_org ON public.forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_forms_slug ON public.forms(public_slug);
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'archived')),
    record_id UUID,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_submissions_org ON public.form_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_submissions_form ON public.form_submissions(form_id);
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS: Forms (Org members manage, unauthenticated can view if published)
CREATE POLICY "Org members can view forms"
    ON public.forms FOR SELECT
    USING (public.check_user_in_org(organization_id));

CREATE POLICY "Public can view published forms"
    ON public.forms FOR SELECT
    USING (is_published = true AND accepting_submissions = true);

CREATE POLICY "Designers, Admins, Owners can create/modify forms"
    ON public.forms FOR ALL
    USING (public.check_user_role(organization_id, ARRAY['owner', 'admin', 'designer']));

-- RLS: Form Submissions
CREATE POLICY "Org members can view submissions"
    ON public.form_submissions FOR SELECT
    USING (public.check_user_in_org(organization_id));

CREATE POLICY "Data Operators, Admins, Owners can update submission status"
    ON public.form_submissions FOR UPDATE
    USING (public.check_user_role(organization_id, ARRAY['owner', 'admin', 'data_operator']));

-- Secure RPC for anonymous public form submissions
CREATE OR REPLACE FUNCTION public.submit_public_form(
    p_slug TEXT,
    p_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_form RECORD;
    v_submission_id UUID;
BEGIN
    SELECT * INTO v_form FROM public.forms
    WHERE public_slug = p_slug AND is_published = true AND accepting_submissions = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Form is not published or no longer accepting submissions.';
    END IF;

    INSERT INTO public.form_submissions (
        organization_id,
        form_id,
        data,
        status
    ) VALUES (
        v_form.organization_id,
        v_form.id,
        p_data,
        'submitted'
    ) RETURNING id INTO v_submission_id;

    RETURN jsonb_build_object(
        'success', true,
        'submission_id', v_submission_id
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. Student & Employee Records
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    identifier TEXT NOT NULL,
    full_name TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'form_submission', 'csv_import')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_org_identifier UNIQUE (organization_id, identifier)
);

CREATE INDEX IF NOT EXISTS idx_records_org ON public.records(organization_id);
CREATE INDEX IF NOT EXISTS idx_records_identifier ON public.records(organization_id, identifier);
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view records"
    ON public.records FOR SELECT
    USING (public.check_user_in_org(organization_id));

CREATE POLICY "Data Operators, Admins, Owners can manage records"
    ON public.records FOR ALL
    USING (public.check_user_role(organization_id, ARRAY['owner', 'admin', 'data_operator']));

-- ------------------------------------------------------------------------------
-- 6. CSV Import Jobs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.record_import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    processed_rows INTEGER NOT NULL DEFAULT 0,
    failed_rows INTEGER NOT NULL DEFAULT 0,
    errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.record_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view import jobs"
    ON public.record_import_jobs FOR SELECT
    USING (public.check_user_in_org(organization_id));

CREATE POLICY "Data Operators, Admins, Owners can create import jobs"
    ON public.record_import_jobs FOR INSERT
    WITH CHECK (public.check_user_role(organization_id, ARRAY['owner', 'admin', 'data_operator']));

-- ------------------------------------------------------------------------------
-- 7. Generation Jobs & Artifacts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    template_version_id UUID REFERENCES public.template_versions(id) ON DELETE SET NULL,
    output_mode TEXT NOT NULL CHECK (output_mode IN ('single_pdf', 'bulk_zip', 'print_sheet')),
    print_layout JSONB,
    total_records INTEGER NOT NULL,
    processed_records INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    artifact_url TEXT,
    error_message TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_gen_jobs_org ON public.generation_jobs(organization_id);
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view generation jobs"
    ON public.generation_jobs FOR SELECT
    USING (public.check_user_in_org(organization_id));

CREATE POLICY "Data Operators, Admins, Owners can trigger generation"
    ON public.generation_jobs FOR ALL
    USING (public.check_user_role(organization_id, ARRAY['owner', 'admin', 'data_operator']));

-- ------------------------------------------------------------------------------
-- 8. Assets Management
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    asset_category TEXT NOT NULL CHECK (asset_category IN ('logo', 'portrait', 'background', 'graphic')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view assets"
    ON public.assets FOR SELECT
    USING (public.check_user_in_org(organization_id));

CREATE POLICY "Designers, Admins, Owners can manage assets"
    ON public.assets FOR ALL
    USING (public.check_user_role(organization_id, ARRAY['owner', 'admin', 'designer']));

-- ------------------------------------------------------------------------------
-- 9. Custom Template Design Requests
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.template_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    organization_type TEXT NOT NULL,
    description TEXT NOT NULL,
    sample_files JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'in_progress', 'completed', 'rejected')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.template_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their template requests"
    ON public.template_requests FOR SELECT
    USING (public.check_user_in_org(organization_id));

CREATE POLICY "Org members can create template requests"
    ON public.template_requests FOR INSERT
    WITH CHECK (public.check_user_in_org(organization_id));

-- ------------------------------------------------------------------------------
-- 10. Storage Buckets (Assets & Portraits)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('portraits', 'portraits', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp']),
    ('id-card-assets', 'id-card-assets', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access for portraits and card assets so cards and exports render cleanly
CREATE POLICY "Public Read Portraits"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'portraits');

CREATE POLICY "Public Read ID Card Assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'id-card-assets');

-- Allow portrait uploads (students submitting public forms and editors uploading imagery)
CREATE POLICY "Allow Uploads To Portraits"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id IN ('portraits', 'id-card-assets'));

CREATE POLICY "Allow Updates To Portraits"
    ON storage.objects FOR UPDATE
    USING (bucket_id IN ('portraits', 'id-card-assets'));
