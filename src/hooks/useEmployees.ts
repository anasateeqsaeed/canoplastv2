import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Employee {
  id: string;
  employee_code: string;
  employee_type: 'operator' | 'staff';
  employee_type_id: string | null;
  full_name: string;
  father_name: string | null;
  cnic: string | null;
  date_of_birth: string | null;
  gender: string | null;
  marital_status: string | null;
  blood_group: string | null;
  photo_url: string | null;
  phone: string;
  alt_phone: string | null;
  email: string | null;
  current_address: string | null;
  permanent_address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relation: string | null;
  emergency_contact_phone: string | null;
  designation: string | null;
  department_id: string | null;
  joining_date: string;
  employment_status: string;
  reporting_to: string | null;
  shift: string | null;
  probation_end_date: string | null;
  salary_type: string;
  basic_salary: number | null;
  allowances: Record<string, number> | null;
  overtime_rate: number | null;
  payment_mode: string | null;
  bank_name: string | null;
  bank_account: string | null;
  user_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  departments?: { id: string; name: string } | null;
}

export type EmployeeInput = Partial<Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'departments'>>;

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*, departments(id, name), employee_types(id, name, category)')
        .order('employee_code', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Employee[];
    },
  });
}

export function useEmployee(id?: string) {
  return useQuery({
    queryKey: ['employees', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*, departments(id, name), employee_types(id, name, category)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as Employee;
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmployeeInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = { ...input, created_by: user?.id };
      // Strip empty code so trigger generates it
      if (!payload.employee_code) delete payload.employee_code;
      const { data, error } = await supabase
        .from('employees')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success(`Employee ${data.employee_code} created`);
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create employee'),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: EmployeeInput & { id: string }) => {
      const payload: any = { ...input };
      delete payload.departments;
      delete payload.employee_types;
      const { data, error } = await supabase
        .from('employees')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update employee'),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee deleted');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete employee'),
  });
}

export function useToggleEmployeeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('employees').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
    onError: (e: any) => toast.error(e.message || 'Failed to update status'),
  });
}

// ============ PHOTO ============
export function useUploadEmployeePhoto() {
  return useMutation({
    mutationFn: async ({ employeeId, file }: { employeeId: string; file: File }) => {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${employeeId}/photo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('employee-photos')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('employee-photos').getPublicUrl(path);
      return data.publicUrl;
    },
    onError: (e: any) => toast.error(e.message || 'Upload failed'),
  });
}

// ============ DOCUMENTS ============
export interface EmployeeDocument {
  id: string;
  employee_id: string;
  doc_type: string;
  doc_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  notes: string | null;
  uploaded_at: string;
}

export function useEmployeeDocuments(employeeId?: string) {
  return useQuery({
    queryKey: ['employee_documents', employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data || []) as EmployeeDocument[];
    },
  });
}

export function useUploadEmployeeDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      file,
      docType,
      docName,
      notes,
    }: {
      employeeId: string;
      file: File;
      docType: string;
      docName: string;
      notes?: string;
    }) => {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${employeeId}/${docType}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('employee-documents')
        .upload(path, file, { cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('employee_documents')
        .insert({
          employee_id: employeeId,
          doc_type: docType,
          doc_name: docName,
          file_url: path,
          file_size: file.size,
          mime_type: file.type,
          notes: notes || null,
          uploaded_by: user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['employee_documents', vars.employeeId] });
      toast.success('Document uploaded');
    },
    onError: (e: any) => toast.error(e.message || 'Upload failed'),
  });
}

export function useDeleteEmployeeDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: EmployeeDocument) => {
      await supabase.storage.from('employee-documents').remove([doc.file_url]);
      const { error } = await supabase.from('employee_documents').delete().eq('id', doc.id);
      if (error) throw error;
      return doc;
    },
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ['employee_documents', doc.employee_id] });
      toast.success('Document deleted');
    },
    onError: (e: any) => toast.error(e.message || 'Delete failed'),
  });
}

export async function getDocumentSignedUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from('employee-documents')
    .createSignedUrl(filePath, 60 * 5);
  if (error) throw error;
  return data.signedUrl;
}
