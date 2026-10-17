-- ==============================================================================
-- IDForge Database Seeds — Realistic Demo Organizations & Starter Templates
-- Migration: 20261017000002_seed_demo_data.sql
-- ==============================================================================

-- Demo Organization 1: Oakwood International Academy (School)
INSERT INTO public.organizations (id, name, slug, industry, logo_url)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Oakwood International Academy',
    'oakwood-academy',
    'K-12 Education',
    'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=200&q=80'
) ON CONFLICT (id) DO NOTHING;

-- Demo Organization 2: NexaCorp Technologies (Corporate)
INSERT INTO public.organizations (id, name, slug, industry, logo_url)
VALUES (
    'a0000000-0000-0000-0000-000000000002',
    'NexaCorp Technologies',
    'nexacorp-tech',
    'Enterprise Technology',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80'
) ON CONFLICT (id) DO NOTHING;

-- Demo Template 1: Oakwood Standard Student ID (Portrait CR80)
INSERT INTO public.templates (id, organization_id, name, description, category)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Oakwood Premium Student Card',
    'Official student identification badge featuring school seal, portrait frame, barcode, and blood group.',
    'school'
) ON CONFLICT (id) DO NOTHING;

-- Version 1 for Oakwood Student ID
INSERT INTO public.template_versions (id, template_id, version_number, is_published, design_data)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    1,
    true,
    '{
      "schemaVersion": 1,
      "id": "c0000000-0000-0000-0000-000000000001",
      "name": "Oakwood Premium Student Card",
      "category": "school",
      "orientation": "portrait",
      "dimensions": { "width": 53.98, "height": 85.60, "unit": "mm", "dpi": 300, "cornerRadius": 3.18 },
      "layouts": {
        "front": {
          "backgroundColor": "#ffffff",
          "elements": [
            { "id": "header-bg", "type": "shape", "name": "Header Band", "x": 0, "y": 0, "width": 53.98, "height": 18, "rotation": 0, "opacity": 1, "locked": true, "visible": true, "zIndex": 1, "shapeType": "rectangle", "fillColor": "#1e3a8a" },
            { "id": "school-title", "type": "text", "name": "School Name", "x": 2, "y": 4, "width": 49.98, "height": 6, "rotation": 0, "opacity": 1, "locked": false, "visible": true, "zIndex": 2, "content": "OAKWOOD ACADEMY", "fontFamily": "Inter", "fontSize": 8, "fontWeight": "bold", "fontStyle": "normal", "textAlign": "center", "color": "#ffffff" },
            { "id": "badge-subtitle", "type": "text", "name": "Badge Type", "x": 2, "y": 10, "width": 49.98, "height": 4, "rotation": 0, "opacity": 1, "locked": false, "visible": true, "zIndex": 2, "content": "STUDENT IDENTIFICATION", "fontFamily": "Inter", "fontSize": 4.5, "fontWeight": "medium", "fontStyle": "normal", "textAlign": "center", "color": "#93c5fd" },
            { "id": "portrait-box", "type": "portrait", "name": "Student Photo", "x": 14.49, "y": 21, "width": 25, "height": 30, "rotation": 0, "opacity": 1, "locked": false, "visible": true, "zIndex": 3, "src": "", "fieldKey": "photo_url", "objectFit": "cover", "borderRadius": 2, "borderColor": "#1e3a8a", "borderWidth": 0.5 },
            { "id": "student-name", "type": "dynamic-text", "name": "Student Name", "x": 2, "y": 53, "width": 49.98, "height": 5, "rotation": 0, "opacity": 1, "locked": false, "visible": true, "zIndex": 4, "content": "{{student_name}}", "fieldKey": "student_name", "fallback": "STUDENT NAME", "fontFamily": "Inter", "fontSize": 7, "fontWeight": "bold", "fontStyle": "normal", "textAlign": "center", "color": "#0f172a" },
            { "id": "student-id-label", "type": "text", "name": "ID Label", "x": 4, "y": 59, "width": 20, "height": 3.5, "rotation": 0, "opacity": 1, "locked": false, "visible": true, "zIndex": 4, "content": "STUDENT ID:", "fontFamily": "Inter", "fontSize": 4, "fontWeight": "semibold", "fontStyle": "normal", "textAlign": "left", "color": "#64748b" },
            { "id": "student-id-val", "type": "dynamic-text", "name": "ID Value", "x": 24, "y": 59, "width": 26, "height": 3.5, "rotation": 0, "opacity": 1, "locked": false, "visible": true, "zIndex": 4, "content": "{{student_id}}", "fieldKey": "student_id", "fallback": "OA-2026-000", "fontFamily": "Inter", "fontSize": 4.2, "fontWeight": "bold", "fontStyle": "normal", "textAlign": "right", "color": "#0f172a" },
            { "id": "grade-label", "type": "text", "name": "Grade Label", "x": 4, "y": 63, "width": 20, "height": 3.5, "rotation": 0, "opacity": 1, "locked": false, "visible": true, "zIndex": 4, "content": "GRADE / SEC:", "fontFamily": "Inter", "fontSize": 4, "fontWeight": "semibold", "fontStyle": "normal", "textAlign": "left", "color": "#64748b" },
            { "id": "grade-val", "type": "dynamic-text", "name": "Grade Value", "x": 24, "y": 63, "width": 26, "height": 3.5, "rotation": 0, "opacity": 1, "locked": false, "visible": true, "zIndex": 4, "content": "{{grade}} - {{section}}", "fieldKey": "grade", "fallback": "Grade 10 - A", "fontFamily": "Inter", "fontSize": 4.2, "fontWeight": "bold", "fontStyle": "normal", "textAlign": "right", "color": "#0f172a" },
            { "id": "blood-label", "type": "text", "name": "Blood Group Label", "x": 4, "y": 67, "width": 20, "height": 3.5, "rotation": 0, "opacity": 1, "locked": false, "visible": true, "zIndex": 4, "content": "BLOOD GROUP:", "fontFamily": "Inter", "fontSize": 4, "fontWeight": "semibold", "fontStyle": "normal", "textAlign": "left", "color": "#64748b" },
            { "id": "blood-val", "type": "dynamic-text", "name": "Blood Group Value", "x": 24, "y": 67, "width": 26, "height": 3.5, "rotation": 0, "opacity": 1, "locked": false, "visible": true, "zIndex": 4, "content": "{{blood_group}}", "fieldKey": "blood_group", "fallback": "O+", "fontFamily": "Inter", "fontSize": 4.2, "fontWeight": "bold", "fontStyle": "normal", "textAlign": "right", "color": "#dc2626" },
            { "id": "qr-code", "type": "qr-code", "name": "Verification QR", "x": 19.99, "y": 72, "width": 14, "height": 14, "rotation": 0, "opacity": 1, "locked": false, "visible": true, "zIndex": 5, "dataContent": "https://verify.oakwood.edu/id/{{student_id}}", "fieldKey": "student_id", "color": "#000000", "backgroundColor": "#ffffff" }
          ]
        }
      },
      "defaultFieldMappings": {
        "student_name": "Full Name",
        "student_id": "Student ID",
        "grade": "Grade",
        "section": "Section",
        "blood_group": "Blood Group",
        "photo_url": "Photo URL"
      },
      "createdAt": "2026-10-17T00:00:00Z",
      "updatedAt": "2026-10-17T00:00:00Z"
    }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Sample Records for Oakwood
INSERT INTO public.records (id, organization_id, identifier, full_name, data, status, source)
VALUES
(
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'OA-2026-101',
    'Eleanor Vance',
    '{"student_name": "Eleanor Vance", "student_id": "OA-2026-101", "grade": "Grade 11", "section": "A", "blood_group": "A+", "emergency_contact": "+1 (555) 019-2834", "photo_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"}'::jsonb,
    'approved',
    'manual'
),
(
    'd0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'OA-2026-102',
    'Lucas Montgomery',
    '{"student_name": "Lucas Montgomery", "student_id": "OA-2026-102", "grade": "Grade 11", "section": "B", "blood_group": "O-", "emergency_contact": "+1 (555) 019-8765", "photo_url": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80"}'::jsonb,
    'approved',
    'manual'
),
(
    'd0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'OA-2026-103',
    'Sophia Chen',
    '{"student_name": "Sophia Chen", "student_id": "OA-2026-103", "grade": "Grade 12", "section": "A", "blood_group": "B+", "emergency_contact": "+1 (555) 019-4521", "photo_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80"}'::jsonb,
    'approved',
    'form_submission'
)
ON CONFLICT (id) DO NOTHING;
