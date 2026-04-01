import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { Upload, FileSpreadsheet, Loader2, Check, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

type SystemField = 'nome' | 'email' | 'ignorar';

interface RawRow {
  [key: string]: any;
}

const STEP_LABELS = ['Carregar Ficheiro', 'Mapear Dados', 'Selecionar Lista', 'Finalizar'];

const ImportarTab = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [step, setStep] = useState(0);

  // Step 1 – file
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<RawRow[]>([]);
  const [dragging, setDragging] = useState(false);

  // Step 2 – mapping
  const [mapping, setMapping] = useState<Record<string, SystemField>>({});

  // Step 3 – list
  const [mode, setMode] = useState<'existente' | 'nova'>('existente');
  const [listaId, setListaId] = useState('');
  const [novaListaNome, setNovaListaNome] = useState('');

  // Step 4 – options
  const [updateExisting, setUpdateExisting] = useState(false);
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(true);
  const [optInAccepted, setOptInAccepted] = useState(false);
  const [importing, setImporting] = useState(false);

  const { data: listas } = useQuery({
    queryKey: ['marketing-listas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('marketing_listas').select('id, nome').order('nome');
      if (error) throw error;
      return data;
    },
  });

  // ── File parsing ──
  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData: RawRow[] = XLSX.utils.sheet_to_json(ws);

        if (!jsonData.length) {
          toast.error('Ficheiro vazio ou sem dados válidos.');
          return;
        }

        const detectedHeaders = Object.keys(jsonData[0]);
        setHeaders(detectedHeaders);
        setRawData(jsonData);
        setFileName(file.name);

        // Auto-map common names
        const autoMap: Record<string, SystemField> = {};
        detectedHeaders.forEach((h) => {
          const lower = h.toLowerCase().trim();
          if (['nome', 'name', 'nome completo'].includes(lower)) autoMap[h] = 'nome';
          else if (['email', 'e-mail', 'mail'].includes(lower)) autoMap[h] = 'email';
          else autoMap[h] = 'ignorar';
        });
        setMapping(autoMap);

        toast.success(`${jsonData.length} linhas encontradas em "${file.name}"`);
      } catch {
        toast.error('Erro ao ler o ficheiro.');
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }, [parseFile]);

  // ── Mapped preview rows ──
  const getMappedRows = () => {
    const nomeCol = Object.entries(mapping).find(([, v]) => v === 'nome')?.[0];
    const emailCol = Object.entries(mapping).find(([, v]) => v === 'email')?.[0];
    return rawData.slice(0, 5).map((row) => ({
      nome: nomeCol ? String(row[nomeCol] ?? '').trim() : '',
      email: emailCol ? String(row[emailCol] ?? '').trim().toLowerCase() : '',
    }));
  };

  // ── Validation ──
  const canAdvance = (): boolean => {
    if (step === 0) return rawData.length > 0;
    if (step === 1) {
      const vals = Object.values(mapping);
      return vals.includes('nome') && vals.includes('email');
    }
    if (step === 2) return mode === 'nova' ? novaListaNome.trim().length > 0 : listaId.length > 0;
    return false;
  };

  // ── Import logic ──
  const handleImport = async () => {
    if (!optInAccepted) {
      toast.error('Deve aceitar a certificação opt-in para continuar.');
      return;
    }
    setImporting(true);

    try {
      let targetListaId = listaId;

      if (mode === 'nova') {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from('marketing_listas')
          .insert({ nome: novaListaNome.trim(), criado_por: user?.id })
          .select('id')
          .single();
        if (error) throw error;
        targetListaId = data.id;
      }

      const nomeCol = Object.entries(mapping).find(([, v]) => v === 'nome')![0];
      const emailCol = Object.entries(mapping).find(([, v]) => v === 'email')![0];

      const contactsRaw = rawData
        .map((row) => ({
          lista_id: targetListaId,
          nome: String(row[nomeCol] ?? '').trim(),
          email: String(row[emailCol] ?? '').trim().toLowerCase(),
        }))
        .filter((c) => c.nome && c.email && c.email.includes('@'));

      // Deduplicar por email para evitar erro "cannot affect row a second time"
      const uniqueMap = new Map<string, typeof contactsRaw[0]>();
      contactsRaw.forEach(c => uniqueMap.set(c.email, c));
      const contacts = Array.from(uniqueMap.values());

      const batchSize = 100;
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        const { error } = await supabase
          .from('marketing_contactos')
          .upsert(batch, { onConflict: 'lista_id,email', ignoreDuplicates: ignoreDuplicates && !updateExisting });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['marketing-listas'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-listas-with-count'] });
      toast.success(`${contacts.length} contactos importados com sucesso!`);

      // Reset wizard
      setStep(0);
      setRawData([]);
      setHeaders([]);
      setFileName('');
      setMapping({});
      setOptInAccepted(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar');
    } finally {
      setImporting(false);
    }
  };

  // ── Step renderers ──

  const renderStep0 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" /> Carregar Ficheiro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Carregue um ficheiro <strong>.xlsx</strong> ou <strong>.csv</strong> com os seus contactos.
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">Arraste o ficheiro aqui ou clique para selecionar</p>
          <p className="text-xs text-muted-foreground mt-1">Formatos aceites: .xlsx, .xls, .csv</p>
        </div>

        <input type="file" accept=".xlsx,.xls,.csv" ref={fileInputRef} className="hidden" onChange={handleFileInput} />

        {fileName && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted text-sm">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span className="font-medium">{fileName}</span>
            <span className="text-muted-foreground">— {rawData.length} linhas</span>
            <button onClick={() => { setFileName(''); setRawData([]); setHeaders([]); setMapping({}); }} className="ml-auto">
              <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mapear Dados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Associe cada coluna do ficheiro ao campo correspondente do sistema.
        </p>

        <div className="space-y-3">
          {headers.map((header) => (
            <div key={header} className="flex items-center gap-4">
              <span className="text-sm font-medium w-40 truncate" title={header}>{header}</span>
              <Select value={mapping[header] || 'ignorar'} onValueChange={(v) => setMapping((prev) => ({ ...prev, [header]: v as SystemField }))}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome">Nome</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="ignorar">Ignorar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {Object.values(mapping).includes('nome') && Object.values(mapping).includes('email') && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Pré-visualização</h4>
            <div className="rounded-md border overflow-auto max-h-48">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getMappedRows().map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.nome}</TableCell>
                      <TableCell>{r.email}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Selecionar Lista</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button variant={mode === 'existente' ? 'default' : 'outline'} size="sm" onClick={() => setMode('existente')}>
            Lista existente
          </Button>
          <Button variant={mode === 'nova' ? 'default' : 'outline'} size="sm" onClick={() => setMode('nova')}>
            Criar nova lista
          </Button>
        </div>

        {mode === 'existente' ? (
          <div className="space-y-2">
            <Label>Lista</Label>
            <Select value={listaId} onValueChange={setListaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar lista" />
              </SelectTrigger>
              <SelectContent>
                {listas?.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Nome da nova lista</Label>
            <Input value={novaListaNome} onChange={(e) => setNovaListaNome(e.target.value)} placeholder="Ex: Importação Fevereiro" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderStep3 = () => {
    const nomeCol = Object.entries(mapping).find(([, v]) => v === 'nome')?.[0] ?? '';
    const emailCol = Object.entries(mapping).find(([, v]) => v === 'email')?.[0] ?? '';
    const allValid = rawData.filter((row) => {
      const email = String(row[emailCol] ?? '').trim().toLowerCase();
      return String(row[nomeCol] ?? '').trim() && email.includes('@');
    });
    const uniqueEmails = new Set(allValid.map(row => String(row[emailCol] ?? '').trim().toLowerCase()));
    const validContacts = uniqueEmails.size;
    const duplicatesRemoved = allValid.length - validContacts;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Finalizar Importação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md bg-muted p-4 space-y-2 text-sm">
            <p><strong>Ficheiro:</strong> {fileName}</p>
            <p><strong>Contactos válidos:</strong> {validContacts}</p>
            {duplicatesRemoved > 0 && (
              <p className="text-warning"><strong>Duplicados removidos:</strong> {duplicatesRemoved}</p>
            )}
            <p><strong>Lista destino:</strong> {mode === 'nova' ? novaListaNome : listas?.find((l) => l.id === listaId)?.nome ?? '—'}</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="update-existing" className="text-sm">Atualizar atributos de contactos existentes</Label>
              <Switch id="update-existing" checked={updateExisting} onCheckedChange={setUpdateExisting} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ignore-duplicates" className="text-sm">Ignorar contactos duplicados</Label>
              <Switch id="ignore-duplicates" checked={ignoreDuplicates} onCheckedChange={setIgnoreDuplicates} />
            </div>
          </div>

          <div className="border rounded-md p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="opt-in"
                checked={optInAccepted}
                onCheckedChange={(v) => setOptInAccepted(v === true)}
              />
              <label htmlFor="opt-in" className="text-sm leading-snug cursor-pointer">
                Certifico que todos os contactos desta lista deram o seu consentimento explícito para receber comunicações de marketing (opt-in).
              </label>
            </div>
          </div>

          <Button onClick={handleImport} disabled={importing || !optInAccepted} className="w-full gap-2">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Confirme a sua importação
          </Button>
        </CardContent>
      </Card>
    );
  };

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3];

  return (
    <div className="space-y-6">
      <ProgressIndicator currentStep={step} totalSteps={4} stepLabels={STEP_LABELS} />

      {stepRenderers[step]()}

      <div className="flex justify-between">
        {step > 0 ? (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Anterior
          </Button>
        ) : <div />}

        {step < 3 && (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()} className="gap-2">
            Próximo <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ImportarTab;
