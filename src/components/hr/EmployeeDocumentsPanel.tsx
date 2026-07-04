import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2, Upload, FileText, Download } from 'lucide-react';
import {
  useEmployeeDocuments,
  useUploadEmployeeDocument,
  useDeleteEmployeeDocument,
  getDocumentSignedUrl,
} from '@/hooks/useEmployees';
import { format } from 'date-fns';
import { toast } from 'sonner';

const DOC_TYPES = [
  { value: 'cnic_front', label: 'CNIC Front' },
  { value: 'cnic_back', label: 'CNIC Back' },
  { value: 'joining_letter', label: 'Joining Letter' },
  { value: 'education', label: 'Education Certificate' },
  { value: 'experience', label: 'Experience Letter' },
  { value: 'medical', label: 'Medical Report' },
  { value: 'other', label: 'Other' },
];

export function EmployeeDocumentsPanel({ employeeId }: { employeeId: string }) {
  const { data: docs = [], isLoading } = useEmployeeDocuments(employeeId);
  const upload = useUploadEmployeeDocument();
  const del = useDeleteEmployeeDocument();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState('cnic_front');
  const [docName, setDocName] = useState('');

  const handleUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) return toast.error('File must be under 10MB');
    await upload.mutateAsync({
      employeeId,
      file,
      docType,
      docName: docName.trim() || file.name,
    });
    setDocName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const openDoc = async (path: string) => {
    try {
      const url = await getDocumentSignedUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch (e: any) {
      toast.error(e.message || 'Failed to open');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Name (optional)</Label>
            <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Defaults to file name" />
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={upload.isPending} className="w-full">
              {upload.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Upload
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No documents yet</p>
        ) : (
          <div className="space-y-2">
            {docs.map(d => (
              <div key={d.id} className="flex items-center justify-between border rounded-md p-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.doc_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOC_TYPES.find(t => t.value === d.doc_type)?.label || d.doc_type} ·{' '}
                      {format(new Date(d.uploaded_at), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openDoc(d.file_url)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => del.mutate(d)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
