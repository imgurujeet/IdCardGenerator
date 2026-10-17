import { z } from 'zod';

export const FormFieldOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const FormFieldValidationSchema = z.object({
  required: z.boolean().default(false),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  maxFileSizeMb: z.number().positive().default(5),
  allowedMimeTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/webp']),
});

export const FormFieldDefinitionSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1, 'Field key is required').regex(/^[a-z0-9_]+$/, 'Field key must be lowercase alphanumeric with underscores'),
  label: z.string().min(1, 'Field label is required'),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  type: z.enum([
    'text',
    'email',
    'phone',
    'number',
    'date',
    'select',
    'radio',
    'checkbox',
    'textarea',
    'image_upload',
    'india_pincode',
    'india_state',
    'india_district',
    'india_address',
  ]),
  options: z.array(FormFieldOptionSchema).optional(),
  validation: FormFieldValidationSchema.default({}),
  defaultValue: z.any().optional(),
  order: z.number().int().default(0),
});

export const FormCreateSchema = z.object({
  title: z.string().min(2, 'Form title must be at least 2 characters'),
  description: z.string().optional(),
  templateId: z.string().optional(),
  auto_approve: z.boolean().default(false),
  enforce_unique: z.boolean().default(false),
  unique_field_key: z.string().optional(),
  fields: z.array(FormFieldDefinitionSchema).min(1, 'Form must contain at least one field'),
});
