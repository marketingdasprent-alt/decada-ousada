import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Car, FileText, AlertTriangle, Wrench, History, Calendar, Receipt, Radio, Paperclip, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ViaturaTabDados } from '@/components/viaturas/tabs/ViaturaTabDados';
import { ViaturaTabSeguro } from '@/components/viaturas/tabs/ViaturaTabSeguro';
import { ViaturaTabDanos } from '@/components/viaturas/tabs/ViaturaTabDanos';
import { ViaturaTabReparacoes } from '@/components/viaturas/tabs/ViaturaTabReparacoes';
import { ViaturaTabHistorico } from '@/components/viaturas/tabs/ViaturaTabHistorico';
import { ViaturaTabReservas } from '@/components/viaturas/tabs/ViaturaTabReservas';
import { ViaturaTabMultas } from '@/components/viaturas/tabs/ViaturaTabMultas';
import { ViaturaTabOBE } from '@/components/viaturas/tabs/ViaturaTabOBE';
import { ViaturaTabAnexos } from '@/components/viaturas/tabs/ViaturaTabAnexos';
import { useIsMobile } from '@/hooks/use-mobile';
import { getCategoriaBadgeClass, getStatusBadgeClass, getStatusLabel } from '@/lib/viaturas';

interface Viatura {
  id: string;
  matricula: string;
  marca: string;
  modelo: string;
  ano?: number | null;
  cor?: string | null;
  categoria?: string | null;
  combustivel?: string | null;
  status?: string | null;
  km_atual?: number | null;
  seguro_numero?: string | null;
  seguro_validade?: string | null;
  inspecao_validade?: string | null;
  observacoes?: string | null;
  numero_motor?: string | null;
  numero_chassis?: string | null;
  data_matricula?: string | null;
  seguradora?: string | null;
  obe_numero?: string | null;
  obe_estado?: string | null;
  valor_aluguer?: number | null;
  proprietario_id?: string | null;
  data_venda?: string | null;
}

const TABS = [
  { id: 'dados', label: 'Dados', icon: Car },
  { id: 'seguro', label: 'Seguro', icon: FileText },
  { id: 'danos', label: 'Danos', icon: AlertTriangle },
  { id: 'reparacoes', label: 'Reparações', icon: Wrench },
  { id: 'historico', label: 'Histórico', icon: History },
  { id: 'reservas', label: 'Reservas', icon: Calendar },
  { id: 'multas', label: 'Multas', icon: Receipt },
  { id: 'obe', label: 'OBE', icon: Radio },
  { id: 'anexos', label: 'Anexos', icon: Paperclip },
];

export default function ViaturaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isNew = id === 'nova';

  const [viatura, setViatura] = useState<Viatura | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('dados');

  useEffect(() => {
    if (!isNew && id) {
      loadViatura();
    }
  }, [id, isNew]);

  const loadViatura = async () => {
    if (!id || isNew) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('viaturas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setViatura(data as Viatura);
    } catch (error) {
      console.error('Erro ao carregar viatura:', error);
      toast.error('Erro ao carregar viatura');
      navigate('/viaturas');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveViatura = async (data: Partial<Viatura>) => {
    setSaving(true);
    try {
      if (isNew) {
        const { data: newViatura, error } = await supabase
          .from('viaturas')
          .insert([data as any])
          .select()
          .single();

        if (error) throw error;
        toast.success('Viatura criada com sucesso!');
        navigate(`/viaturas/${newViatura.id}`);
      } else if (viatura) {
        const { error } = await supabase
          .from('viaturas')
          .update(data)
          .eq('id', viatura.id);

        if (error) throw error;
        toast.success('Viatura atualizada com sucesso!');
        loadViatura();
      }
    } catch (error: any) {
      console.error('Erro ao guardar viatura:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma viatura com esta matrícula.');
      } else {
        toast.error('Erro ao guardar viatura');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/viaturas')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            {isNew ? (
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Car className="h-6 w-6" />
                Nova Viatura
              </h1>
            ) : (
              <>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Car className="h-6 w-6" />
                  {viatura?.marca} {viatura?.modelo}
                  <span className="font-mono text-muted-foreground">• {viatura?.matricula}</span>
                </h1>
                <div className="mt-1 flex items-center gap-2">
                  <Badge className={getCategoriaBadgeClass(viatura?.categoria)}>
                    {viatura?.categoria || 'Sem categoria'}
                  </Badge>
                  <Badge variant="outline" className={getStatusBadgeClass(viatura?.status)}>
                    {getStatusLabel(viatura?.status)}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Tab Navigation */}
        <div className="overflow-x-auto -mx-4 px-4">
          <TabsList className={`${isMobile ? 'w-max' : 'w-full grid grid-cols-9'} h-auto p-1`}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
                  disabled={isNew && tab.id !== 'dados'}
                >
                  <Icon className="h-4 w-4" />
                  <span className={isMobile ? '' : 'hidden lg:inline'}>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Tab Contents */}
        <TabsContent value="dados" className="mt-0">
          <ViaturaTabDados 
            viatura={viatura} 
            isNew={isNew} 
            onSave={handleSaveViatura} 
            saving={saving} 
          />
        </TabsContent>

        <TabsContent value="seguro" className="mt-0">
          <ViaturaTabSeguro viatura={viatura} onUpdate={loadViatura} />
        </TabsContent>

        <TabsContent value="danos" className="mt-0">
          <ViaturaTabDanos viaturaId={viatura?.id} />
        </TabsContent>

        <TabsContent value="reparacoes" className="mt-0">
          <ViaturaTabReparacoes viaturaId={viatura?.id} />
        </TabsContent>

        <TabsContent value="historico" className="mt-0">
          <ViaturaTabHistorico viaturaId={viatura?.id} />
        </TabsContent>

        <TabsContent value="reservas" className="mt-0">
          <ViaturaTabReservas viaturaId={viatura?.id} />
        </TabsContent>

        <TabsContent value="multas" className="mt-0">
          <ViaturaTabMultas viaturaId={viatura?.id} />
        </TabsContent>

        <TabsContent value="obe" className="mt-0">
          <ViaturaTabOBE viatura={viatura} onUpdate={loadViatura} />
        </TabsContent>

        <TabsContent value="anexos" className="mt-0">
          <ViaturaTabAnexos viaturaId={viatura?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
