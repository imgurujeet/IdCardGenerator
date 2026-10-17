import { RecordEntity } from '../types/database';
import { RecordFilterOptions, CSVColumnMapping, CSVImportResult } from '../types/record';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { generateUUID } from '../lib/utils';

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

export const recordService = {
  async getRecords(orgId: string, options: RecordFilterOptions = {}): Promise<{ records: RecordEntity[]; total: number }> {
    const local = getStoredLocalRecords().filter((r) => r.organization_id === orgId);

    if (isLiveSupabaseConfigured) {
      try {
        let query = supabase.from('records').select('*', { count: 'exact' }).eq('organization_id', orgId);

        if (options.status && options.status !== 'all') {
          query = query.eq('status', options.status);
        }
        if (options.source && options.source !== 'all') {
          query = query.eq('source', options.source);
        }
        if (options.search) {
          query = query.or(`full_name.ilike.%${options.search}%,identifier.ilike.%${options.search}%`);
        }

        const { data, count, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
          const combined = [...data];
          for (const l of local) {
            if (!combined.some((c) => c.id === l.id || c.identifier === l.identifier)) {
              combined.push(l);
            }
          }
          return { records: combined, total: count || combined.length };
        }
      } catch (err) {
        console.warn('Failed to query Supabase records:', err);
      }
    }

    let items = [...local];

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
    input: { identifier: string; fullName: string; data: Record<string, any>; status?: 'approved' | 'pending' }
  ): Promise<RecordEntity> {
    const newRecord: RecordEntity = {
      id: generateUUID(),
      organization_id: orgId,
      identifier: input.identifier,
      full_name: input.fullName,
      data: {
        ...input.data,
        student_id: input.identifier,
        employee_id: input.identifier,
        student_name: input.fullName,
        employee_name: input.fullName,
        full_name: input.fullName,
      },
      status: input.status || 'approved',
      source: 'manual',
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
          return data;
        }
      } catch (e) {
        console.warn('Supabase createRecord exception:', e);
      }
    }

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
      if (!error && data) return data;
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
    return true;
  },
};
