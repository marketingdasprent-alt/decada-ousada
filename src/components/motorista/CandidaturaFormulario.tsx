import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Send, User, FileText, Car, LogOut, Upload, X, CheckCircle2, FileCheck, Home, Building2 } from 'lucide-react';
import { Candidatura } from '@/pages/motorista/PainelMotorista';
import { DocumentUploader } from './DocumentUploader';
import { PhoneInput } from '@/components/ui/phone-input';

interface CandidaturaFormularioProps {
  candidatura: Candidatura | null;
  onUpdate: () => void;
}

const CATEGORIAS_CARTA = ['A', 'A1', 'A2', 'AM', 'B', 'B1', 'BE', 'C', 'C1', 'CE', 'D', 'D1', 'DE'];
const TIPOS_DOCUMENTO = [
  { value: 'cc', label: 'Cartão de Cidadão (CC)' },
  { value: 'bi', label: 'Bilhete de Identidade (BI)' },
  { value: 'ar', label: 'Autorização de Residência (AR)' },
  { value: 'tr', label: 'Título de Residência' },
  { value: 'passaporte', label: 'Passaporte' },
];

export const CandidaturaFormulario: React.FC<CandidaturaFormularioProps> = ({
  candidatura,
  onUpdate,
}) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const metadataNome = typeof user?.user_metadata?.nome === 'string' ? user.user_metadata.nome : '';
  const metadataTelefone = typeof user?.user_metadata?.telefone === 'string' ? user.user_metadata.telefone : '';

  // Dados pessoais
  const [nome, setNome] = useState(candidatura?.nome || metadataNome || '');
  const [email, setEmail] = useState(candidatura?.email || user?.email || '');
  const [telefone, setTelefone] = useState(candidatura?.telefone || metadataTelefone || '');
  const [nif, setNif] = useState(candidatura?.nif || '');
  const [morada, setMorada] = useState(candidatura?.morada || '');
  const [codigoPostal, setCodigoPostal] = useState(candidatura?.codigo_postal || '');
  const [cidade, setCidade] = useState(candidatura?.cidade || '');
  
  // Documento de identificação
  const [documentoTipo, setDocumentoTipo] = useState(candidatura?.documento_tipo || '');
  const [documentoNumero, setDocumentoNumero] = useState(candidatura?.documento_numero || '');
  const [documentoValidade, setDocumentoValidade] = useState(candidatura?.documento_validade || '');
  const [documentoFicheiroUrl, setDocumentoFicheiroUrl] = useState(candidatura?.documento_ficheiro_url || '');
  const [documentoIdentificacaoVersoUrl, setDocumentoIdentificacaoVersoUrl] = useState(candidatura?.documento_identificacao_verso_url || '');
  
  // Carta de condução
  const [cartaConducao, setCartaConducao] = useState(candidatura?.carta_conducao || '');
  const [cartaCategorias, setCartaCategorias] = useState<string[]>(candidatura?.carta_categorias || []);
  const [cartaValidade, setCartaValidade] = useState(candidatura?.carta_validade || '');
  const [cartaFicheiroUrl, setCartaFicheiroUrl] = useState(candidatura?.carta_ficheiro_url || '');
  const [cartaConducaoVersoUrl, setCartaConducaoVersoUrl] = useState(candidatura?.carta_conducao_verso_url || '');
  
  // Licença TVDE
  const [licencaTvdeNumero, setLicencaTvdeNumero] = useState(candidatura?.licenca_tvde_numero || '');
  const [licencaTvdeValidade, setLicencaTvdeValidade] = useState(candidatura?.licenca_tvde_validade || '');
  const [licencaTvdeFicheiroUrl, setLicencaTvdeFicheiroUrl] = useState(candidatura?.licenca_tvde_ficheiro_url || '');

  // Documentos adicionais
  const [registoCriminalUrl, setRegistoCriminalUrl] = useState(candidatura?.registo_criminal_url || '');
  const [comprovativoMoradaUrl, setComprovativoMoradaUrl] = useState(candidatura?.comprovativo_morada_url || '');
  const [comprovativoIbanUrl, setComprovativoIbanUrl] = useState(candidatura?.comprovativo_iban_url || '');

  useEffect(() => {
    setNome(candidatura?.nome || metadataNome || '');
    setEmail(candidatura?.email || user?.email || '');
    setTelefone(candidatura?.telefone || metadataTelefone || '');
    setNif(candidatura?.nif || '');
    setMorada(candidatura?.morada || '');
    setCodigoPostal(candidatura?.codigo_postal || '');
    setCidade(candidatura?.cidade || '');
    setDocumentoTipo(candidatura?.documento_tipo || '');
    setDocumentoNumero(candidatura?.documento_numero || '');
    setDocumentoValidade(candidatura?.documento_validade || '');
    setDocumentoFicheiroUrl(candidatura?.documento_frente_url || candidatura?.documento_ficheiro_url || '');
    setDocumentoIdentificacaoVersoUrl(candidatura?.documento_identificacao_verso_url || '');
    setCartaConducao(candidatura?.carta_conducao || '');
    setCartaCategorias(candidatura?.carta_categorias || []);
    setCartaValidade(candidatura?.carta_validade || '');
    setCartaFicheiroUrl(candidatura?.carta_frente_url || candidatura?.carta_ficheiro_url || '');
    setCartaConducaoVersoUrl(candidatura?.carta_conducao_verso_url || '');
    setLicencaTvdeNumero(candidatura?.licenca_tvde_numero || '');
    setLicencaTvdeValidade(candidatura?.licenca_tvde_validade || '');
    setLicencaTvdeFicheiroUrl(candidatura?.licenca_tvde_ficheiro_url || '');
    setRegistoCriminalUrl(candidatura?.registo_criminal_url || '');
    setComprovativoMoradaUrl(candidatura?.comprovativo_morada_url || '');
    setComprovativoIbanUrl(candidatura?.comprovativo_iban_url || '');
  }, [candidatura, metadataNome, metadataTelefone, user?.email]);

  const handleCategoriaToggle = (categoria: string) => {
    setCartaCategorias(prev => 
      prev.includes(categoria)
        ? prev.filter(c => c !== categoria)
        : [...prev, categoria]
    );
  };

  const buildCandidaturaData = () => ({
    user_id: user!.id,
    nome,
    email,
    telefone: telefone || null,
    nif: nif || null,
    morada: morada || null,
    codigo_postal: codigoPostal || null,
    cidade: cidade || null,
    documento_tipo: documentoTipo || null,
    documento_numero: documentoNumero || null,
    documento_validade: documentoValidade || null,
    documento_ficheiro_url: documentoFicheiroUrl || null,
    documento_identificacao_verso_url: documentoIdentificacaoVersoUrl || null,
    carta_conducao: cartaConducao || null,
    carta_categorias: cartaCategorias.length > 0 ? cartaCategorias : null,
    carta_validade: cartaValidade || null,
    carta_ficheiro_url: cartaFicheiroUrl || null,
    carta_conducao_verso_url: cartaConducaoVersoUrl || null,
    licenca_tvde_numero: licencaTvdeNumero || null,
    licenca_tvde_validade: licencaTvdeValidade || null,
    licenca_tvde_ficheiro_url: licencaTvdeFicheiroUrl || null,
    registo_criminal_url: registoCriminalUrl || null,
    comprovativo_morada_url: comprovativoMoradaUrl || null,
    comprovativo_iban_url: comprovativoIbanUrl || null,
  });

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const data = buildCandidaturaData();
      
      if (candidatura) {
        const { error } = await supabase
          .from('motorista_candidaturas')
          .update(data)
          .eq('id', candidatura.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('motorista_candidaturas')
          .insert({ ...data, status: 'rascunho' });
        
        if (error) throw error;
      }
      
      toast({
        title: 'Guardado',
        description: 'Os seus dados foram guardados com sucesso.',
      });
      
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao guardar:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao guardar.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const validateForm = (): string | null => {
    if (!nome.trim()) return 'Nome é obrigatório';
    if (!email.trim()) return 'Email é obrigatório';
    if (!telefone.trim()) return 'Telefone é obrigatório';
    if (!nif.trim()) return 'NIF é obrigatório';
    if (!morada.trim()) return 'Morada é obrigatória';
    if (!codigoPostal.trim()) return 'Código Postal é obrigatório';
    if (!cidade.trim()) return 'Cidade é obrigatória';
    if (!documentoTipo) return 'Tipo de documento é obrigatório';
    if (!documentoNumero.trim()) return 'Número do documento é obrigatório';
    if (!documentoValidade) return 'Validade do documento é obrigatória';
    if (!documentoFicheiroUrl) return 'Upload da frente do documento é obrigatório';
    if (!documentoIdentificacaoVersoUrl) return 'Upload do verso do documento é obrigatório';
    if (!cartaConducao.trim()) return 'Número da carta de condução é obrigatório';
    if (cartaCategorias.length === 0) return 'Selecione pelo menos uma categoria da carta';
    if (!cartaValidade) return 'Validade da carta de condução é obrigatória';
    if (!cartaFicheiroUrl) return 'Upload da frente da carta é obrigatório';
    if (!cartaConducaoVersoUrl) return 'Upload do verso da carta é obrigatório';
    if (!licencaTvdeNumero.trim()) return 'Número da licença TVDE é obrigatório';
    if (!licencaTvdeValidade) return 'Validade da licença TVDE é obrigatória';
    if (!licencaTvdeFicheiroUrl) return 'Upload da licença TVDE é obrigatório';
    if (!registoCriminalUrl) return 'Upload do Registo Criminal é obrigatório';
    if (!comprovativoMoradaUrl) return 'Upload do Comprovativo de Morada é obrigatório';
    if (!comprovativoIbanUrl) return 'Upload do Comprovativo de IBAN é obrigatório';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: 'Campos obrigatórios',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        ...buildCandidaturaData(),
        status: 'submetido',
        data_submissao: new Date().toISOString(),
      };
      
      if (candidatura) {
        const { error } = await supabase
          .from('motorista_candidaturas')
          .update(data)
          .eq('id', candidatura.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('motorista_candidaturas')
          .insert(data);
        
        if (error) throw error;
      }
      
      toast({
        title: 'Candidatura Submetida!',
        description: 'Os seus documentos serão analisados pela nossa equipa.',
      });
      
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao submeter:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao submeter a candidatura.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const completionPercentage = () => {
    const fields = [
      nome, email, telefone, nif, morada, cidade,
      documentoTipo, documentoNumero, documentoValidade, documentoFicheiroUrl,
      cartaConducao, cartaCategorias.length > 0, cartaValidade, cartaFicheiroUrl,
      licencaTvdeNumero, licencaTvdeValidade, licencaTvdeFicheiroUrl,
      registoCriminalUrl, comprovativoMoradaUrl, comprovativoIbanUrl,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card/50 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Rota Líquida</h1>
              <p className="text-sm text-muted-foreground">Candidatura de Motorista</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{nome || user?.email}</p>
              <p className="text-xs text-muted-foreground">{completionPercentage()}% completo</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${completionPercentage()}%` }}
          />
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 pb-8 space-y-6">
        {/* Dados Pessoais */}
        <Card className="border-border overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Dados Pessoais</CardTitle>
            </div>
            <CardDescription>Informações básicas para a sua candidatura</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="O seu nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <PhoneInput
                id="telefone"
                value={telefone}
                onChange={setTelefone}
                defaultCountry="PT"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nif">NIF *</Label>
              <Input
                id="nif"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                placeholder="123456789"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="morada">Morada *</Label>
              <Input
                id="morada"
                value={morada}
                onChange={(e) => setMorada(e.target.value)}
                placeholder="Rua, número, andar..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade *</Label>
              <Input
                id="cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Lisboa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigoPostal">Código Postal *</Label>
              <Input
                id="codigoPostal"
                value={codigoPostal}
                onChange={(e) => setCodigoPostal(e.target.value)}
                placeholder="0000-000"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="flex items-center gap-2 text-foreground">
                <Home className="h-4 w-4 text-muted-foreground" />
                Comprovativo de Morada *
              </Label>
              <DocumentUploader
                folder="comprovativo-morada"
                currentUrl={comprovativoMoradaUrl}
                onUpload={setComprovativoMoradaUrl}
                accept="application/pdf,image/jpeg,image/png"
              />
              <p className="text-xs text-muted-foreground">
                Fatura de serviços, contrato de arrendamento ou declaração da junta de freguesia
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Documento de Identificação */}
        <Card className="border-border overflow-hidden">
          <CardHeader className="bg-blue-50/50 dark:bg-blue-900/20 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-lg">Documento de Identificação</CardTitle>
            </div>
            <CardDescription>CC, Título de Residência ou outro documento válido</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de Documento *</Label>
              <Select value={documentoTipo} onValueChange={setDocumentoTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map(tipo => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentoNumero">Número do Documento *</Label>
              <Input
                id="documentoNumero"
                value={documentoNumero}
                onChange={(e) => setDocumentoNumero(e.target.value)}
                placeholder="Nº do documento"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentoValidade">Data de Validade *</Label>
              <Input
                id="documentoValidade"
                type="date"
                value={documentoValidade}
                onChange={(e) => setDocumentoValidade(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Documento de Identificação *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground block mb-1">Frente</span>
                  <DocumentUploader
                    folder="documento-identificacao"
                    currentUrl={documentoFicheiroUrl}
                    onUpload={setDocumentoFicheiroUrl}
                    accept="application/pdf,image/jpeg,image/png"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground block mb-1">Verso</span>
                  <DocumentUploader
                    folder="documento-identificacao"
                    currentUrl={documentoIdentificacaoVersoUrl}
                    onUpload={setDocumentoIdentificacaoVersoUrl}
                    accept="application/pdf,image/jpeg,image/png"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Carta de Condução */}
        <Card className="border-border overflow-hidden">
          <CardHeader className="bg-primary/10 pb-4">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Carta de Condução</CardTitle>
            </div>
            <CardDescription>Dados da sua carta de condução válida</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cartaConducao">Número da Carta *</Label>
              <Input
                id="cartaConducao"
                value={cartaConducao}
                onChange={(e) => setCartaConducao(e.target.value)}
                placeholder="Nº da carta de condução"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cartaValidade">Data de Validade *</Label>
              <Input
                id="cartaValidade"
                type="date"
                value={cartaValidade}
                onChange={(e) => setCartaValidade(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Categorias *</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS_CARTA.map(cat => (
                  <div key={cat} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cat-${cat}`}
                      checked={cartaCategorias.includes(cat)}
                      onCheckedChange={() => handleCategoriaToggle(cat)}
                    />
                    <label
                      htmlFor={`cat-${cat}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground"
                    >
                      {cat}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Upload da Carta de Condução *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground block mb-1">Frente</span>
                  <DocumentUploader
                    folder="carta-conducao"
                    currentUrl={cartaFicheiroUrl}
                    onUpload={setCartaFicheiroUrl}
                    accept="application/pdf,image/jpeg,image/png"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground block mb-1">Verso</span>
                  <DocumentUploader
                    folder="carta-conducao"
                    currentUrl={cartaConducaoVersoUrl}
                    onUpload={setCartaConducaoVersoUrl}
                    accept="application/pdf,image/jpeg,image/png"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Licença TVDE */}
        <Card className="border-border overflow-hidden">
          <CardHeader className="bg-indigo-50/50 dark:bg-indigo-900/20 pb-4">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <CardTitle className="text-lg">Licença TVDE</CardTitle>
            </div>
            <CardDescription>Certificado de formação TVDE obrigatório</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="licencaTvdeNumero">Número da Licença TVDE *</Label>
              <Input
                id="licencaTvdeNumero"
                value={licencaTvdeNumero}
                onChange={(e) => setLicencaTvdeNumero(e.target.value)}
                placeholder="Nº da licença TVDE"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licencaTvdeValidade">Data de Validade *</Label>
              <Input
                id="licencaTvdeValidade"
                type="date"
                value={licencaTvdeValidade}
                onChange={(e) => setLicencaTvdeValidade(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Upload da Licença TVDE *</Label>
              <DocumentUploader
                folder="licenca-tvde"
                currentUrl={licencaTvdeFicheiroUrl}
                onUpload={setLicencaTvdeFicheiroUrl}
                accept="application/pdf,image/jpeg,image/png"
              />
            </div>
          </CardContent>
        </Card>

        {/* Documentos Adicionais */}
        <Card className="border-border overflow-hidden">
          <CardHeader className="bg-amber-50/50 dark:bg-amber-900/20 pb-4">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-lg">Documentos Adicionais</CardTitle>
            </div>
            <CardDescription>Documentos obrigatórios para completar a candidatura</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-foreground">
                <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Registo Criminal *
              </Label>
              <DocumentUploader
                folder="registo-criminal"
                currentUrl={registoCriminalUrl}
                onUpload={setRegistoCriminalUrl}
                accept="application/pdf,image/jpeg,image/png"
              />
              <p className="text-xs text-muted-foreground">Certificado do registo criminal português (válido por 3 meses)</p>
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-foreground">
                <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Comprovativo de IBAN *
              </Label>
              <DocumentUploader
                folder="comprovativo-iban"
                currentUrl={comprovativoIbanUrl}
                onUpload={setComprovativoIbanUrl}
                accept="application/pdf,image/jpeg,image/png"
              />
              <p className="text-xs text-muted-foreground">Documento bancário com IBAN para recebimento de pagamentos</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saving || submitting}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A guardar...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Rascunho
              </>
            )}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A submeter...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submeter Candidatura
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
