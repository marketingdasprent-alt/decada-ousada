import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Fuel, Zap, CheckCircle, Eye, EyeOff, Save } from 'lucide-react';
import type { IntegracaoConfig } from '../integracoes/types';

export const CombustivelPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<Record<string, IntegracaoConfig>>({});
  const [activeTab, setActiveTab] = useState('bp');
  const [saving, setSaving] = useState(false);

  // Form states
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('plataformas_configuracao')
        .select('*')
        .in('plataforma', ['combustivel', 'repsol', 'edp']);

      if (error) throw error;
      
      const configMap: Record<string, IntegracaoConfig> = {};
      data?.forEach(c => {
        const platform = c.plataforma === 'combustivel' ? 'bp' : c.plataforma;
        configMap[platform] = c as unknown as IntegracaoConfig;
      });
      setConfigs(configMap);
      
      // Update form with active tab
      const current = configMap[activeTab];
      setClientId(current?.client_id || '');
      setClientSecret(current?.client_secret || '');
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Erro ao carregar configurações.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const current = configs[activeTab];
    setClientId(current?.client_id || '');
    setClientSecret(current?.client_secret || '');
  }, [activeTab, configs]);

  const handleSave = async () => {
    const config = configs[activeTab];
    if (!config) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('plataformas_configuracao')
        .update({ 
          client_id: clientId, 
          client_secret: clientSecret,
          ativo: true // Ativar automaticamente ao guardar credenciais
        })
        .eq('id', config.id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: `Configuração ${activeTab.toUpperCase()} guardada.` });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Fuel className="h-5 w-5" />Gestão de Cartões Frota</CardTitle>
        <CardDescription>Configure as credenciais para importação automática e gestão de consumos.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="bp" className="gap-2">BP Fleet {configs.bp?.ativo && <Badge className="bg-green-500 h-2 w-2 p-0 rounded-full" />}</TabsTrigger>
            <TabsTrigger value="repsol" className="gap-2">Repsol Solred {configs.repsol?.ativo && <Badge className="bg-green-500 h-2 w-2 p-0 rounded-full" />}</TabsTrigger>
            <TabsTrigger value="edp" className="gap-2">EDP Mobilidade {configs.edp?.ativo && <Badge className="bg-green-500 h-2 w-2 p-0 rounded-full" />}</TabsTrigger>
          </TabsList>

          {['bp', 'repsol', 'edp'].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Client ID / Usuário</Label>
                  <Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder={`ID da conta ${tab.toUpperCase()}`} />
                </div>
                <div className="space-y-2">
                  <Label>Client Secret / Password</Label>
                  <div className="relative">
                    <Input type={showSecret ? 'text' : 'password'} value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="Secret/Password" />
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowSecret(!showSecret)}>
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {configs[tab]?.ultimo_sync && `Último sync: ${new Date(configs[tab].ultimo_sync!).toLocaleString('pt-PT')}`}
                </div>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar e Ativar {tab.toUpperCase()}
                </Button>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  {tab === 'edp' ? <Zap className="h-4 w-4 text-green-500" /> : <Fuel className="h-4 w-4 text-primary" />}
                  Como funciona?
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Após configurar as credenciais, o sistema fará o match automático das faturas {tab.toUpperCase()} com os motoristas baseando-se no número do cartão associado na ficha de cada motorista. 
                  Use o botão de importação no separador Administrativo para carregar os ficheiros CSV.
                </p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
