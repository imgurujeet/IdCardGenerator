import { RecordEntity } from '../types/database';
import { RecordFilterOptions, CSVColumnMapping, CSVImportResult } from '../types/record';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { generateUUID } from '../lib/utils';
import { broadcastSync } from '../lib/sync';

const STORAGE_RECORDS_KEY = 'idforge_user_created_records';

function getStoredLocalRecords(): RecordEntity[] {
  try {
    const raw = localStorage.getItem(STORAGE_RECORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredLocalRecords(list: RecordEntity[]) {
  try {
    localStorage.setItem(STORAGE_RECORDS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save records to localStorage:', e);
  }
}

export function extractRecordDetails(data: Record<string, any>, fallbackId: string) {
  const identifier =
    data.student_roll ||
    data.roll_no ||
    data.roll ||
    data.student_id ||
    data.employee_id ||
    data.admission_no ||
    data.Mobile_number ||
    data.mobile ||
    data.phone ||
    data.identifier ||
    `REC-${fallbackId.substring(0, 8)}`;

  const fullName =
    data.student_name ||
    data.candidate_name ||
    data.full_name ||
    data.name ||
    data.employee_name ||
    'Student';

  return { identifier: String(identifier), fullName: String(fullName) };
}

export const recordService = {
  async getRecords(orgId: string, options: RecordFilterOptions = {}): Promise<{ records: RecordEntity[]; total: number }> {
    const local = getStoredLocalRecords().filter(
      (r) => !orgId || !r.organization_id || r.organization_id === orgId || r.organization_id === 'default'
    );
    let combined: RecordEntity[] = [...local];

    // Query local form submissions from localStorage so submitted responses always show in Records
    try {
      const localSubsRaw = localStorage.getItem('idforge_user_submissions');
      const localFormsRaw = localStorage.getItem('idforge_user_created_forms');
      const formsList: any[] = localFormsRaw ? JSON.parse(localFormsRaw) : [];
      const autoApproveFormIds = new Set(
        formsList.filter((f) => f.auto_approve !== false).map((f) => f.id)
      );
      // 'form-ptec-primary' is auto-approved by default
      autoApproveFormIds.add('form-ptec-primary');

      if (localSubsRaw) {
        const localSubs: any[] = JSON.parse(localSubsRaw);
        for (const sub of localSubs) {
          if (sub.status === 'rejected') continue;
          if (orgId && sub.organization_id && sub.organization_id !== orgId && sub.organization_id !== 'default') {
            continue;
          }
          const { identifier, fullName } = extractRecordDetails(sub.data || {}, sub.id);
          // Deduplicate strictly by linked record_id or exact submission ID, or identical student name AND roll
          const alreadyExists = combined.some(
            (r) =>
              (sub.record_id && r.id === sub.record_id) ||
              r.id === sub.id ||
              (r.identifier === identifier && r.full_name.trim().toLowerCase() === fullName.trim().toLowerCase())
          );
          if (!alreadyExists) {
            const isApproved = sub.status === 'approved' || autoApproveFormIds.has(sub.form_id);
            combined.push({
              id: sub.record_id || sub.id,
              organization_id: sub.organization_id || orgId || 'default',
              identifier,
              full_name: fullName,
              data: {
                ...sub.data,
                student_name: fullName,
                full_name: fullName,
                student_id: identifier,
                student_roll: identifier,
                roll_no: identifier,
                photo_url: sub.data?.photo_url || sub.data?.photo || '',
              },
              status: isApproved ? 'approved' : 'pending',
              source: 'form_submission',
              created_at: sub.created_at || new Date().toISOString(),
              updated_at: sub.updated_at || new Date().toISOString(),
            });
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse local form submissions for records:', e);
    }

    if (isLiveSupabaseConfigured) {
      try {
        let query = supabase.from('records').select('*');
        if (orgId) {
          query = query.eq('organization_id', orgId);
        }

        const { data: dbRecords, error } = await query.order('created_at', { ascending: false });
        if (!error && dbRecords) {
          combined = [...dbRecords];
          for (const l of local) {
            if (
              !combined.some(
                (c) =>
                  c.id === l.id ||
                  (c.identifier === l.identifier && c.full_name.trim().toLowerCase() === l.full_name.trim().toLowerCase())
              )
            ) {
              combined.push(l);
            }
          }
        }

        // Also query form_submissions for this organization so submitted student responses display in Records
        let subQuery = supabase.from('form_submissions').select('*');
        if (orgId) {
          subQuery = subQuery.eq('organization_id', orgId);
        }
        const { data: subsData, error: subsError } = await subQuery.order('created_at', { ascending: false });

        if (!subsError && subsData && subsData.length > 0) {
          for (const sub of subsData) {
            if (sub.status === 'rejected') continue;
            const { identifier, fullName } = extractRecordDetails(sub.data || {}, sub.id);
            const alreadyExists = combined.some(
              (r) =>
                (sub.record_id && r.id === sub.record_id) ||
                r.id === sub.id ||
                (r.identifier === identifier && r.full_name.trim().toLowerCase() === fullName.trim().toLowerCase())
            );

            if (!alreadyExists) {
              const mappedRecord: RecordEntity = {
                id: sub.record_id || sub.id,
                organization_id: sub.organization_id,
                identifier,
                full_name: fullName,
                data: {
                  ...sub.data,
                  student_name: fullName,
                  full_name: fullName,
                  student_id: identifier,
                  student_roll: identifier,
                  roll_no: identifier,
                  photo_url: sub.data?.photo_url || sub.data?.photo || '',
                },
                status: 'approved',
                source: 'form_submission',
                created_at: sub.created_at,
                updated_at: sub.updated_at,
              };

              combined.push(mappedRecord);

              // Proactively persist to Supabase records table
              supabase
                .from('records')
                .upsert([mappedRecord], { onConflict: 'organization_id,identifier' })
                .then(({ error: upErr }) => {
                  if (upErr) console.warn('Sync form submission to records table notice:', upErr.message);
                });
            }
          }
        }
      } catch (err) {
        console.warn('Failed to query Supabase records/submissions:', err);
      }
    }

    let items = [...combined];

    if (options.status && options.status !== 'all') {
      items = items.filter((r) => r.status === options.status);
    }
    if (options.source && options.source !== 'all') {
      items = items.filter((r) => r.source === options.source);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      items = items.filter(
        (r) => r.full_name.toLowerCase().includes(q) || r.identifier.toLowerCase().includes(q)
      );
    }

    return { records: items, total: items.length };
  },

  async getRecordById(recordId: string): Promise<RecordEntity | null> {
    if (isLiveSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('records').select('*').eq('id', recordId).single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('getRecordById error:', e);
      }
    }
    const local = getStoredLocalRecords();
    return local.find((r) => r.id === recordId) || null;
  },

  async createRecord(
    orgId: string,
    input: {
      identifier: string;
      fullName: string;
      data: Record<string, any>;
      status?: 'approved' | 'pending';
      source?: 'manual' | 'form_submission' | 'csv_import';
    }
  ): Promise<RecordEntity> {
    const newRecord: RecordEntity = {
      id: generateUUID(),
      organization_id: orgId || 'default',
      identifier: input.identifier,
      full_name: input.fullName,
      data: {
        ...input.data,
        student_id: input.identifier,
        student_roll: input.identifier,
        roll_no: input.identifier,
        employee_id: input.identifier,
        student_name: input.fullName,
        employee_name: input.fullName,
        full_name: input.fullName,
        photo_url: input.data?.photo_url || input.data?.photo || '',
      },
      status: input.status || 'approved',
      source: (input.source as any) || 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const local = getStoredLocalRecords().filter((r) => r.id !== newRecord.id);
    saveStoredLocalRecords([newRecord, ...local]);

    if (isLiveSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('records').insert([newRecord]).select().single();
        if (!error && data) {
          const updated = [data, ...local.filter((r) => r.id !== data.id)];
          saveStoredLocalRecords(updated);
          broadcastSync('RECORDS_UPDATED', data.id);
          return data;
        }
      } catch (e) {
        console.warn('Supabase createRecord exception:', e);
      }
    }

    broadcastSync('RECORDS_UPDATED', newRecord.id);
    return newRecord;
  },

  async updateRecord(recordId: string, updates: Partial<RecordEntity>): Promise<RecordEntity | null> {
    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase
        .from('records')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', recordId)
        .select()
        .single();
      if (!error && data) {
        broadcastSync('RECORDS_UPDATED', recordId);
        return data;
      }
    }

    const local = getStoredLocalRecords();
    const index = local.findIndex((r) => r.id === recordId);
    if (index === -1) return null;
    local[index] = {
      ...local[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveStoredLocalRecords(local);
    broadcastSync('RECORDS_UPDATED', recordId);
    return local[index];
  },

  async updateRecordStatus(recordId: string, status: 'approved' | 'rejected' | 'pending' | 'archived'): Promise<boolean> {
    const res = await this.updateRecord(recordId, { status });
    return Boolean(res);
  },

  async bulkUpdateStatus(recordIds: string[], status: 'approved' | 'rejected' | 'archived'): Promise<number> {
    let count = 0;
    for (const id of recordIds) {
      const updated = await this.updateRecord(id, { status } as any);
      if (updated) count++;
    }
    broadcastSync('RECORDS_UPDATED');
    return count;
  },

  async importCSVRecords(
    orgId: string,
    rawRows: Record<string, string>[],
    mappings: CSVColumnMapping[]
  ): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      totalProcessed: rawRows.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    const newRecordsToInsert: RecordEntity[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 1;
      const mappedData: Record<string, any> = {};

      let hasError = false;

      // Extract mapped fields
      for (const m of mappings) {
        const val = row[m.csvHeader]?.trim();
        if (m.required && !val) {
          result.errors.push({
            row: rowNum,
            reason: `Missing required field: ${m.csvHeader} (mapped to ${m.targetFieldKey})`,
          });
          hasError = true;
          break;
        }
        if (val) {
          mappedData[m.targetFieldKey] = val;
        }
      }

      if (hasError) {
        result.failed++;
        continue;
      }

      const identifier =
        mappedData['student_id'] ||
        mappedData['employee_id'] ||
        mappedData['identifier'] ||
        mappedData['id'] ||
        `IMP-${rowNum.toString().padStart(4, '0')}`;

      const fullName =
        mappedData['student_name'] ||
        mappedData['employee_name'] ||
        mappedData['full_name'] ||
        mappedData['name'] ||
        'Unknown Name';

      const record: RecordEntity = {
        id: generateUUID(),
        organization_id: orgId,
        identifier,
        full_name: fullName,
        data: {
          ...mappedData,
          student_id: identifier,
          employee_id: identifier,
          student_name: fullName,
          employee_name: fullName,
        },
        status: 'approved',
        source: 'csv_import',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      newRecordsToInsert.push(record);
      result.successful++;
    }

    const currentLocal = getStoredLocalRecords();
    saveStoredLocalRecords([...newRecordsToInsert, ...currentLocal]);

    if (isLiveSupabaseConfigured && newRecordsToInsert.length > 0) {
      try {
        await supabase.from('records').insert(newRecordsToInsert);
      } catch (e) {
        console.warn('Supabase CSV import insert exception:', e);
      }
    }

    broadcastSync('RECORDS_UPDATED');
    return result;
  },

  async deleteRecord(recordId: string): Promise<boolean> {
    if (isLiveSupabaseConfigured) {
      try {
        await supabase.from('records').delete().eq('id', recordId);
      } catch (e) {
        console.warn('Supabase deleteRecord exception:', e);
      }
    }
    const filtered = getStoredLocalRecords().filter((r) => r.id !== recordId);
    saveStoredLocalRecords(filtered);

    // Also clean up from local submissions if linked
    try {
      const subsRaw = localStorage.getItem('idforge_user_submissions');
      if (subsRaw) {
        const subs: any[] = JSON.parse(subsRaw);
        const updatedSubs = subs.filter((s) => s.id !== recordId && s.record_id !== recordId);
        localStorage.setItem('idforge_user_submissions', JSON.stringify(updatedSubs));
      }
    } catch {}

    broadcastSync('RECORDS_UPDATED', recordId);
    return true;
  },

  async bulkDeleteRecords(recordIds: string[]): Promise<boolean> {
    if (isLiveSupabaseConfigured) {
      try {
        await supabase.from('records').delete().in('id', recordIds);
      } catch (e) {
        console.warn('Supabase bulkDeleteRecords exception:', e);
      }
    }
    const set = new Set(recordIds);
    const filtered = getStoredLocalRecords().filter((r) => !set.has(r.id));
    saveStoredLocalRecords(filtered);

    try {
      const subsRaw = localStorage.getItem('idforge_user_submissions');
      if (subsRaw) {
        const subs: any[] = JSON.parse(subsRaw);
        const updatedSubs = subs.filter((s) => !set.has(s.id) && (!s.record_id || !set.has(s.record_id)));
        localStorage.setItem('idforge_user_submissions', JSON.stringify(updatedSubs));
      }
    } catch {}

    broadcastSync('RECORDS_UPDATED');
    return true;
  },
};
