export type UserRole = 'owner' | 'admin' | 'designer' | 'data_operator' | 'viewer';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  profile?: Profile;
}

export interface TemplateEntity {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  category: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  active_version?: TemplateVersionEntity;
}

export interface TemplateVersionEntity {
  id: string;
  template_id: string;
  version_number: number;
  design_data: any;
  thumbnail_url: string | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
}

export interface FormEntity {
  id: string;
  organization_id: string;
  template_id: string | null;
  title: string;
  description: string | null;
  public_slug: string;
  is_published: boolean;
  accepting_submissions: boolean;
  fields_schema: any[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormSubmissionEntity {
  id: string;
  organization_id: string;
  form_id: string;
  data: Record<string, any>;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'archived';
  record_id: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecordEntity {
  id: string;
  organization_id: string;
  identifier: string;
  full_name: string;
  data: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  source: 'manual' | 'form_submission' | 'csv_import';
  created_at: string;
  updated_at: string;
}

export interface GenerationJobEntity {
  id: string;
  organization_id: string;
  template_version_id: string | null;
  output_mode: 'single_pdf' | 'bulk_zip' | 'print_sheet';
  print_layout: any;
  total_records: number;
  processed_records: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  artifact_url: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetEntity {
  id: string;
  organization_id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  asset_category: 'logo' | 'portrait' | 'background' | 'graphic';
  created_by: string | null;
  created_at: string;
}

export interface TemplateRequestEntity {
  id: string;
  organization_id: string;
  title: string;
  organization_type: string;
  description: string;
  sample_files: string[];
  status: 'submitted' | 'in_review' | 'in_progress' | 'completed' | 'rejected';
  created_by: string | null;
  created_at: string;
}
