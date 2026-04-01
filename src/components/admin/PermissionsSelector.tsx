import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, Ticket, Users, Car, FileText, Wrench, Settings, ChevronDown, Wallet, Megaphone, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface Recurso {
  id: string;
  nome: string;
  categoria: string;
  descricao: string | null;
}

interface Permission {
  recurso_id: string;
  tem_acesso: boolean;
}

interface PermissionsSelectorProps {
  cargoId?: string;
  onChange: (permissions: Permission[]) => void;
  initialPermissions?: Permission[];
}

// Definição dos módulos com ícones e ordem fixa
const MODULOS = [
  { key: 'CRM', label: 'CRM', icon: BarChart3 },
  { key: 'Tickets', label: 'Tickets', icon: Ticket },
  { key: 'Motoristas', label: 'Motoristas', icon: Users },
  { key: 'Viaturas', label: 'Viaturas', icon: Car },
  { key: 'Contratos', label: 'Contratos', icon: FileText },
  { key: 'Financeiro', label: 'Financeiro', icon: Wallet },
  { key: 'Marketing', label: 'Marketing', icon: Megaphone },
  { key: 'Calendário', label: 'Calendário', icon: CalendarDays },
  { key: 'Assistência', label: 'Assistência', icon: Wrench },
  { key: 'Administração', label: 'Administração', icon: Settings },
];

// Labels amigáveis para os recursos
const getRecursoLabel = (nome: string): string => {
  const labels: Record<string, string> = {
    // CRM
    'crm_ver': 'Ver leads e pipeline',
    'crm_exportar': 'Exportar dados de leads',
    'crm_campanhas': 'Gerir campanhas e tags',
    'motoristas_crm': 'Gestão completa do CRM',
    
    // Tickets
    'tickets_ver': 'Ver tickets',
    'tickets_criar': 'Criar novos tickets',
    'tickets_gerir': 'Gerir todos os tickets',
    
    // Motoristas
    'motoristas_ver': 'Ver lista de motoristas',
    'motoristas_criar': 'Criar novos motoristas',
    'motoristas_editar': 'Editar dados de motoristas',
    'motoristas_eliminar': 'Eliminar motoristas',
    'motoristas_candidaturas': 'Gerir candidaturas',
    'motoristas_gestao': 'Gestão completa de motoristas',
    'motoristas_contactos': 'Gestão de contactos',
    'motorista_painel': 'Painel exclusivo do motorista',
    
    // Viaturas
    'viaturas_ver': 'Ver lista de viaturas',
    'viaturas_criar': 'Criar novas viaturas',
    'viaturas_editar': 'Editar dados de viaturas',
    'viaturas_eliminar': 'Eliminar viaturas',
    
    // Contratos
    'contratos_ver': 'Ver contratos',
    'contratos_criar': 'Criar novos contratos',
    'contratos_reimprimir': 'Reimprimir contratos',
    'motoristas_contratos': 'Gestão completa de contratos',
    
    // Financeiro
    'financeiro_recibos': 'Gestão de recibos verdes',
    
    // Marketing
    'marketing_ver': 'Aceder ao módulo de Marketing',
    
    // Calendário
    'calendario_ver': 'Ver eventos do calendário',
    'calendario_criar': 'Criar novos eventos',
    'calendario_editar': 'Editar eventos existentes',
    'calendario_eliminar': 'Eliminar eventos',
    
    // Assistência
    'assistencia_ver': 'Ver tickets de assistência',
    'assistencia_criar': 'Criar tickets de assistência',
    'assistencia_categorias': 'Gerir categorias',
    'assistencia_tickets': 'Gestão completa de tickets',
    
    // Administração
    'admin_utilizadores': 'Gerir utilizadores',
    'admin_grupos': 'Gerir grupos e permissões',
    'admin_documentos': 'Gerir templates de documentos',
    'admin_formularios': 'Gerir formulários',
    'admin_integracoes': 'Gerir integrações',
    'admin_configuracoes': 'Configurações do sistema',
  };
  return labels[nome] || nome;
};

export const PermissionsSelector: React.FC<PermissionsSelectorProps> = ({
  cargoId,
  onChange,
  initialPermissions = [],
}) => {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecursos();
  }, []);

  useEffect(() => {
    if (cargoId) {
      fetchPermissions(cargoId);
    }
  }, [cargoId]);

  const fetchRecursos = async () => {
    try {
      const { data, error } = await supabase
        .from('recursos')
        .select('*')
        .order('categoria', { ascending: true })
        .order('nome', { ascending: true });

      if (error) throw error;
      setRecursos(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar recursos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async (cargoId: string) => {
    try {
      const { data, error } = await supabase
        .from('cargo_permissoes')
        .select('recurso_id, tem_acesso')
        .eq('cargo_id', cargoId);

      if (error) throw error;

      const mappedPermissions: Permission[] = (data || []).map(p => ({
        recurso_id: p.recurso_id,
        tem_acesso: p.tem_acesso ?? false,
      }));

      setPermissions(mappedPermissions);
      onChange(mappedPermissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const getPermissionForRecurso = (recursoId: string): boolean => {
    const existing = permissions.find(p => p.recurso_id === recursoId);
    return existing?.tem_acesso || false;
  };

  const updatePermission = (recursoId: string, value: boolean) => {
    const updatedPermissions = permissions.filter(p => p.recurso_id !== recursoId);
    
    if (value) {
      updatedPermissions.push({
        recurso_id: recursoId,
        tem_acesso: true,
      });
    }

    setPermissions(updatedPermissions);
    onChange(updatedPermissions);
  };

  const getRecursosForModulo = (moduloKey: string): Recurso[] => {
    return recursos.filter(r => r.categoria === moduloKey);
  };

  const getModuloStats = (moduloKey: string): { active: number; total: number } => {
    const moduloRecursos = getRecursosForModulo(moduloKey);
    const active = moduloRecursos.filter(r => getPermissionForRecurso(r.id)).length;
    return { active, total: moduloRecursos.length };
  };

  const toggleAllInModulo = (moduloKey: string, value: boolean) => {
    const moduloRecursos = getRecursosForModulo(moduloKey);
    let updatedPermissions = [...permissions];

    moduloRecursos.forEach(recurso => {
      updatedPermissions = updatedPermissions.filter(p => p.recurso_id !== recurso.id);
      if (value) {
        updatedPermissions.push({
          recurso_id: recurso.id,
          tem_acesso: true,
        });
      }
    });

    setPermissions(updatedPermissions);
    onChange(updatedPermissions);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filtrar módulos que têm recursos
  const modulosComRecursos = MODULOS.filter(m => getRecursosForModulo(m.key).length > 0);

  return (
    <div className="space-y-2">
      <Accordion type="multiple" className="w-full" defaultValue={['CRM', 'Motoristas']}>
        {modulosComRecursos.map((modulo) => {
          const Icon = modulo.icon;
          const stats = getModuloStats(modulo.key);
          const allSelected = stats.active === stats.total && stats.total > 0;
          const someSelected = stats.active > 0 && stats.active < stats.total;
          const moduloRecursos = getRecursosForModulo(modulo.key);

          return (
            <AccordionItem 
              key={modulo.key} 
              value={modulo.key}
              className="border border-border rounded-lg mb-2 overflow-hidden bg-card"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/30">
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-foreground">{modulo.label}</span>
                  </div>
                  <Badge 
                    variant={stats.active > 0 ? "default" : "secondary"}
                    className="ml-auto mr-2"
                  >
                    {stats.active}/{stats.total}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3 pt-2">
                  {/* Toggle todos */}
                  <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md border border-border">
                    <Label 
                      htmlFor={`toggle-all-${modulo.key}`}
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      Selecionar todos
                    </Label>
                    <Checkbox
                      id={`toggle-all-${modulo.key}`}
                      checked={allSelected}
                      ref={(ref) => {
                        if (ref && someSelected) {
                          (ref as any).indeterminate = true;
                        }
                      }}
                      onCheckedChange={(checked) => toggleAllInModulo(modulo.key, checked as boolean)}
                    />
                  </div>

                  {/* Lista de recursos */}
                  <div className="space-y-1">
                    {moduloRecursos.map((recurso) => {
                      const isChecked = getPermissionForRecurso(recurso.id);
                      return (
                        <div 
                          key={recurso.id} 
                          className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex flex-col">
                            <Label 
                              htmlFor={`perm-${recurso.id}`}
                              className="text-sm font-medium text-foreground cursor-pointer"
                            >
                              {getRecursoLabel(recurso.nome)}
                            </Label>
                            {recurso.descricao && (
                              <span className="text-xs text-muted-foreground">
                                {recurso.descricao}
                              </span>
                            )}
                          </div>
                          <Checkbox
                            id={`perm-${recurso.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              updatePermission(recurso.id, checked as boolean)
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};
