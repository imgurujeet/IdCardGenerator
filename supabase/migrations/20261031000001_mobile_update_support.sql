-- ==============================================================================
-- Mobile-Based Unique Identification & Update Support for Public Forms
-- ==============================================================================

-- 1. Helper to fetch previous submission by mobile number for a public form
CREATE OR REPLACE FUNCTION public.get_submission_by_mobile(
    p_slug TEXT,
    p_mobile TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_form RECORD;
    v_submission RECORD;
    v_clean_mobile TEXT;
BEGIN
    -- Extract trailing 10 digits
    v_clean_mobile := regexp_replace(p_mobile, '\D', '', 'g');
    IF length(v_clean_mobile) > 10 THEN
        v_clean_mobile := substring(v_clean_mobile from length(v_clean_mobile) - 9);
    END IF;

    IF length(v_clean_mobile) < 10 THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_form FROM public.forms
    WHERE public_slug = p_slug AND is_published = true;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Find latest submission matching the 10-digit mobile number
    SELECT * INTO v_submission
    FROM public.form_submissions
    WHERE form_id = v_form.id
      AND (
        substring(regexp_replace(COALESCE(data->>'mobile', data->>'phone', data->>'mobile_number', data->>'contact', ''), '\D', '', 'g') from '([0-9]{10})$') = v_clean_mobile
      )
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN row_to_json(v_submission)::jsonb;
END;
$$;

-- 2. Upgrade submit_public_form to update existing submission if matching mobile number exists
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
    v_clean_mobile TEXT;
    v_existing_id UUID;
    v_submission_id UUID;
BEGIN
    SELECT * INTO v_form FROM public.forms
    WHERE public_slug = p_slug AND is_published = true AND accepting_submissions = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Form is not published or no longer accepting submissions.';
    END IF;

    -- Extract 10-digit mobile number
    v_clean_mobile := regexp_replace(COALESCE(p_data->>'mobile', p_data->>'phone', p_data->>'mobile_number', p_data->>'contact', ''), '\D', '', 'g');
    IF length(v_clean_mobile) > 10 THEN
        v_clean_mobile := substring(v_clean_mobile from length(v_clean_mobile) - 9);
    END IF;

    -- Check for existing submission for this mobile number on this form
    IF length(v_clean_mobile) = 10 THEN
        SELECT id INTO v_existing_id
        FROM public.form_submissions
        WHERE form_id = v_form.id
          AND substring(regexp_replace(COALESCE(data->>'mobile', data->>'phone', data->>'mobile_number', data->>'contact', ''), '\D', '', 'g') from '([0-9]{10})$') = v_clean_mobile
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    IF v_existing_id IS NOT NULL THEN
        -- UPDATE EXISTING SUBMISSION
        UPDATE public.form_submissions
        SET data = data || p_data,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_existing_id
        RETURNING id INTO v_submission_id;

        RETURN jsonb_build_object(
            'success', true,
            'submission_id', v_submission_id,
            'is_update', true
        );
    ELSE
        -- INSERT NEW SUBMISSION
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
            'submission_id', v_submission_id,
            'is_update', false
        );
    END IF;
END;
$$;

