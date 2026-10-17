export type FormFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'textarea'
  | 'image_upload';

export interface FormFieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  maxFileSizeMb?: number; // for image_upload
  allowedMimeTypes?: string[];
}

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldDefinition {
  id: string;
  key: string;               // e.g. "student_name", "blood_group"
  label: string;             // user-facing label
  placeholder?: string;
  helpText?: string;
  type: FormFieldType;
  options?: FormFieldOption[]; // for select, radio
  validation: FormFieldValidation;
  defaultValue?: any;
  order: number;
}

export interface FormSettings {
  allowMultipleSubmissions: boolean;
  duplicateCheckField?: string; // e.g. "student_id" or "email"
  successMessage?: string;
  redirectUrl?: string;
}
