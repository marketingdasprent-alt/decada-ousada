import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Car,
  User,
  Search,
  Check,
  ChevronDown,
  Loader2,
  CalendarDays,
  MapPin,
  ArrowLeftRight,
  Info,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Viatura {
  id: string;
  matricula: string;
  marca: string;
  modelo: string;
  status: string;
  categoria: string | null;
}

export interface Motorista {
  id: string;
  nome: string;
  nif: string | null;
  telefone: string | null;
}

interface Props {
  userId: string;
  defaultDate?: Date;
  onClose: () => void;
}

// ── Event types ────────────────────────────────────────────────────────────────
//
// entrega   → motorista recebe viatura. Cria associação motorista_viaturas.
//             viatura → em_uso
//
// recolha   → motorista entrega a viatura (ex: posto de entrega, não parque ainda).
//             Fecha associação motorista_viaturas na data do evento.
//             viatura → em_recolha (pendente de confirmação de chegada ao parque)
//             A confirmação de chegada é feita por um gestor na lista de pendentes.
//
// devolucao → viatura já está no parque. Fecha associação + viatura → disponivel
//
// troca     → motorista troca de viatura. Sistema deteta a viatura atual pelo motorista.
//             Fecha associação antiga + cria nova. Histórico mantido em ambos.
//             viatura antiga → disponivel, nova → em_uso
//
// upgrade   → igual à troca, mas o tipo fica gravado para o dashboard calcular
//             variação de renda (valor_aluguer).

const TIPOS = [
  {
    value: 'entrega',
    label: 'Entrega',
    color: 'border-green-500 bg-green-500/10 text-green-700',
    desc: 'Entregar viatura a um motorista',
  },
  {
    value: 'recolha',
    label: 'Recolha',
    color: 'border-blue-500 bg-blue-500/10 text-blue-700',
    desc: 'Motorista entrega a viatura — pendente chegada ao parque',
  },
  {
    value: 'devolucao',
    label: 'Devolução',
    color: 'border-orange-500 bg-orange-500/10 text-orange-700',
    desc: 'Viatura já entregue no parque — fica disponível imediatamente',
  },
  {
    value: 'troca',
    label: 'Troca',
    color: 'border-purple-500 bg-purple-500/10 text-purple-700',
    desc: 'Substituir viatura para o mesmo motorista',
  },
  {
    value: 'upgrade',
    label: 'Upgrade / Downgrade',
    color: 'border-yellow-500 bg-yellow-500/10 text-yellow-700',
    desc: 'Mudar categoria de viatura (impacto no dashboard)',
  },
];

// ── Accent-insensitive search ─────────────────────────────────────────────────

function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function matchViatura(v: Viatura, q: string): boolean {
  const n = norm(q);
  return (
    norm(v.matricula).includes(n) ||
    norm(v.marca).includes(n) ||
    norm(v.modelo).includes(n) ||
    norm(v.categoria || '').includes(n)
  );
}

export function matchMotorista(m: Motorista, q: string): boolean {
  const n = norm(q);
  return (
    norm(m.nome).split(/\s+/).some(w => w.includes(n)) ||
    norm(m.nif || '').includes(n) ||
    norm(m.telefone || '').includes(n)
  );
}

// ── Searchable dropdown ────────────────────────────────────────────────────────

interface DropdownItem {
  id: string;
  primary: string;
  secondary?: string;
  badge?: string;
}

interface SearchableDropdownProps {
  items: DropdownItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  matchFn: (item: DropdownItem, query: string) => boolean;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  items, value, onChange, placeholder, icon, disabled, matchFn,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = items.find(i => i.id === value);
  const filtered = query.trim() ? items.filter(i => matchFn(i, query)) : items;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={cn(
          'flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'ring-2 ring-ring ring-offset-1'
        )}
      >
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <span className={cn('flex-1 text-left truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.primary : placeholder}
        </span>
        {selected?.secondary && (
          <span className="text-xs text-muted-foreground shrink-0">{selected.secondary}</span>
        )}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Pesquisar..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">Nenhum resultado</p>
            ) : (
              filtered.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { onChange(item.id); setOpen(false); setQuery(''); }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left',
                    item.id === value && 'bg-primary/10 text-primary font-medium'
                  )}
                >
                  <Check className={cn('h-4 w-4 shrink-0', item.id === value ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex-1 truncate">{item.primary}</span>
                  {item.secondary && <span className="text-xs text-muted-foreground">{item.secondary}</span>}
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{item.badge}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Format helpers ─────────────────────────────────────────────────────────────

export function formatMatricula(v: string): string {
  const c = v.replace(/[-\s]/g, '').toUpperCase();
  return c.match(/.{1,2}/g)?.join('-') || c;
}

function todayLocalStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── Static display for auto-detected vehicle ──────────────────────────────────

const ViaturaAtualDisplay: React.FC<{
  viatura: Viatura | null;
  loading: boolean;
  motoristaSelected: boolean;
}> = ({ viatura, loading, motoristaSelected }) => {
  if (!motoristaSelected) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        Selecione o motorista para detetar a viatura atual
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        A detetar viatura atual...
      </div>
    );
  }
  if (!viatura) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-destructive/40 bg-destructive/5 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Motorista sem viatura atribuída
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/30 text-sm">
      <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="font-medium">{formatMatricula(viatura.matricula)}</span>
      <span className="text-muted-foreground">— {viatura.marca} {viatura.modelo}</span>
      {viatura.categoria && (
        <span className="ml-auto text-xs text-muted-foreground">{viatura.categoria}</span>
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

export const NovoEventoPage: React.FC<Props> = ({ userId, defaultDate, onClose }) => {
  const queryClient = useQueryClient();

  const [tipo, setTipo] = useState('entrega');
  const [motoristaId, setMotoristaId] = useState('');
  const [viaturaId, setViaturaId] = useState('');       // nova / principal
  const [autoViatura, setAutoViatura] = useState<Viatura | null>(null);   // auto-detectada pelo motorista
  const [loadingAutoViatura, setLoadingAutoViatura] = useState(false);
  const [data, setData] = useState(
    defaultDate
      ? `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, '0')}-${String(defaultDate.getDate()).padStart(2, '0')}`
      : todayLocalStr()
  );
  const [hora, setHora] = useState(nowTimeStr());
  const [cidade, setCidade] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [diaTodo, setDiaTodo] = useState(false);

  // ── Load all vehicles (non-sold) ────────────────────────────────────────────
  const { data: viaturas = [], isLoading: loadingViaturas } = useQuery({
    queryKey: ['viaturas-calendario'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('viaturas')
        .select('id, matricula, marca, modelo, status, categoria')
        .not('status', 'eq', 'vendida')
        .order('matricula');
      if (error) throw error;
      return data as Viatura[];
    },
  });

  // ── Load active drivers ─────────────────────────────────────────────────────
  const { data: motoristas = [], isLoading: loadingMotoristas } = useQuery({
    queryKey: ['motoristas-calendario'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('motoristas_ativos')
        .select('id, nome, nif, telefone')
        .eq('status_ativo', true)
        .order('nome');
      if (error) throw error;
      return data as Motorista[];
    },
  });

  // ── Auto-detect current vehicle when motorista changes ──────────────────────
  // Used for: recolha, troca, upgrade
  useEffect(() => {
    const tiposComAutoDetect = ['recolha', 'troca', 'upgrade'];
    if (!tiposComAutoDetect.includes(tipo) || !motoristaId) {
      setAutoViatura(null);
      return;
    }

    setLoadingAutoViatura(true);
    setAutoViatura(null);

    supabase
      .from('motorista_viaturas')
      .select('viatura_id')
      .eq('motorista_id', motoristaId)
      .eq('status', 'ativo')
      .is('data_fim', null)
      .maybeSingle()
      .then(({ data: assignment }) => {
        if (assignment?.viatura_id) {
          const v = viaturas.find(x => x.id === assignment.viatura_id) || null;
          setAutoViatura(v);
          // For recolha, also pre-fill the viaturaId with the current vehicle
          if (tipo === 'recolha') setViaturaId(assignment.viatura_id);
        } else {
          setAutoViatura(null);
        }
        setLoadingAutoViatura(false);
      });
  }, [motoristaId, tipo, viaturas]);

  // ── Reset when tipo changes ─────────────────────────────────────────────────
  useEffect(() => {
    setMotoristaId('');
    setViaturaId('');
    setAutoViatura(null);
  }, [tipo]);

  // ── Vehicle lists by tipo ───────────────────────────────────────────────────
  const viaturasDisponiveis = viaturas.filter(v => {
    const s = (v.status || '').toLowerCase();
    return s === 'disponivel' || s === 'disponível';
  });
  const viaturasEmUso = viaturas.filter(v => {
    const s = (v.status || '').toLowerCase();
    return s === 'em_uso' || s === 'em uso';
  });
  const viaturasRecuperaveis = viaturas.filter(v => {
    const s = (v.status || '').toLowerCase();
    return s === 'em_uso' || s === 'em uso' || s === 'em_recolha' || s === 'em recolha';
  });

  const viaturaOptions: Viatura[] = (() => {
    if (tipo === 'entrega') return viaturasDisponiveis;
    if (tipo === 'recolha') return viaturasEmUso;            // manual fallback if no motorista
    if (tipo === 'devolucao') return viaturasRecuperaveis;   // em_uso + em_recolha
    if (tipo === 'troca' || tipo === 'upgrade') return viaturasDisponiveis; // nova viatura
    return [];
  })();

  const toDropdownViatura = (v: Viatura): DropdownItem => ({
    id: v.id,
    primary: `${formatMatricula(v.matricula)} — ${v.marca} ${v.modelo}`,
    secondary: v.categoria || undefined,
    badge: (() => {
      const s = (v.status || '').toLowerCase();
      if (s === 'em_uso' || s === 'em uso') return 'em uso';
      if (s === 'disponivel' || s === 'disponível') return 'disponível';
      if (s === 'em_recolha' || s === 'em recolha') return 'em recolha';
      return v.status;
    })(),
  });

  const toDropdownMotorista = (m: Motorista): DropdownItem => ({
    id: m.id,
    primary: m.nome,
    secondary: m.nif || m.telefone || undefined,
  });

  // ── Validation ─────────────────────────────────────────────────────────────
  const canSave = (() => {
    if (!data) return false;
    if (tipo === 'entrega') return !!motoristaId && !!viaturaId;
    if (tipo === 'recolha') return !!viaturaId;           // motorista optional — fechamos pelo viatura_id
    if (tipo === 'devolucao') return !!viaturaId;
    if (tipo === 'troca' || tipo === 'upgrade') {
      return !!motoristaId && !!autoViatura && !!viaturaId;
    }
    return false;
  })();

  // ── Save ────────────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: async () => {
      // Determine the "main" vehicle (the one being delivered or involved)
      const mainViaturaId =
        tipo === 'troca' || tipo === 'upgrade'
          ? viaturaId                          // nova viatura
          : viaturaId;

      const mainViatura = viaturas.find(v => v.id === mainViaturaId);
      if (!mainViatura) throw new Error('Selecione uma viatura válida');

      // For troca/upgrade, the old vehicle comes from autoViatura
      const oldViatura = (tipo === 'troca' || tipo === 'upgrade') ? autoViatura : null;

      const dataISO = diaTodo
        ? new Date(`${data}T00:00:00`).toISOString()
        : new Date(`${data}T${hora}:00`).toISOString();

      // The event titulo = main vehicle plate
      const eventoPayload: Record<string, any> = {
        titulo: mainViatura.matricula.replace(/[-\s]/g, '').toUpperCase(),
        tipo,
        data_inicio: dataISO,
        data_fim: null,
        dia_todo: diaTodo,
        cidade: cidade.trim() || null,
        descricao: observacoes.trim() || null,
        matricula_devolver: oldViatura
          ? oldViatura.matricula.replace(/[-\s]/g, '').toUpperCase()
          : null,
        criado_por: userId,
      };

      if (motoristaId) eventoPayload.motorista_id = motoristaId;

      // Insert evento (resilient to missing motorista_id column)
      let result = await supabase.from('calendario_eventos').insert(eventoPayload).select('id').single();
      if (result.error) {
        const { motorista_id: _, ...fallback } = eventoPayload;
        result = await supabase.from('calendario_eventos').insert(fallback).select('id').single();
        if (result.error) throw result.error;
      }

      // ── Side effects ───────────────────────────────────────────────────────

      if (tipo === 'entrega') {
        // Associar ao motorista
        await supabase.from('motorista_viaturas').insert({
          motorista_id: motoristaId,
          viatura_id: mainViatura.id,
          data_inicio: data,
          status: 'ativo',
          observacoes: observacoes.trim() || null,
        });
        // Viatura → em_uso
        await supabase.from('viaturas').update({ status: 'em_uso' }).eq('id', mainViatura.id);
      }

      if (tipo === 'recolha') {
        // Fechar associação viatura-motorista na data do evento
        await supabase
          .from('motorista_viaturas')
          .update({ data_fim: data, status: 'encerrado' })
          .eq('viatura_id', mainViatura.id)
          .eq('status', 'ativo')
          .is('data_fim', null);
        // Viatura → em_recolha (aguarda confirmação de chegada ao parque)
        await supabase.from('viaturas').update({ status: 'em_recolha' }).eq('id', mainViatura.id);
      }

      if (tipo === 'devolucao') {
        // Fechar associação
        await supabase
          .from('motorista_viaturas')
          .update({ data_fim: data, status: 'encerrado' })
          .eq('viatura_id', mainViatura.id)
          .eq('status', 'ativo')
          .is('data_fim', null);
        // Viatura → disponivel imediatamente
        await supabase.from('viaturas').update({ status: 'disponivel' }).eq('id', mainViatura.id);
      }

      if ((tipo === 'troca' || tipo === 'upgrade') && oldViatura) {
        // Fechar associação da viatura antiga
        await supabase
          .from('motorista_viaturas')
          .update({ data_fim: data, status: 'encerrado' })
          .eq('viatura_id', oldViatura.id)
          .eq('status', 'ativo')
          .is('data_fim', null);

        // Criar nova associação com a nova viatura
        await supabase.from('motorista_viaturas').insert({
          motorista_id: motoristaId,
          viatura_id: mainViatura.id,
          data_inicio: data,
          status: 'ativo',
          observacoes: observacoes.trim() || null,
        });

        // Atualizar status das viaturas
        await supabase.from('viaturas').update({ status: 'disponivel' }).eq('id', oldViatura.id);
        await supabase.from('viaturas').update({ status: 'em_uso' }).eq('id', mainViatura.id);
      }

      // Notificação (fire & forget)
      try {
        await supabase.functions.invoke('send-calendar-notification', {
          body: {
            matricula: eventoPayload.titulo,
            cidade: eventoPayload.cidade,
            tipo: eventoPayload.tipo,
            data_inicio: eventoPayload.data_inicio,
            dia_todo: eventoPayload.dia_todo,
          },
        });
      } catch { /* non-critical */ }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendario-eventos'] });
      queryClient.invalidateQueries({ queryKey: ['viaturas-calendario'] });
      queryClient.invalidateQueries({ queryKey: ['viaturas-pendentes-recolha'] });
      queryClient.invalidateQueries({ queryKey: ['motorista-viaturas'] });
      toast.success('Evento criado com sucesso');
      onClose();
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar evento'),
  });

  const tipoInfo = TIPOS.find(t => t.value === tipo);

  // ── Helpers para mostrar/esconder campos por tipo ──────────────────────────
  const showMotorista = tipo === 'entrega' || tipo === 'recolha' || tipo === 'troca' || tipo === 'upgrade';
  const showViaturaAutoDetect = tipo === 'troca' || tipo === 'upgrade';
  const showViaturaManual = tipo !== 'troca' && tipo !== 'upgrade';
  // Para recolha, o campo viatura fica visível mas é preenchido automaticamente
  const viaturaLabel = (() => {
    if (tipo === 'entrega') return { label: 'Viatura a Entregar', hint: 'disponíveis' };
    if (tipo === 'recolha') return { label: 'Viatura a Recolher', hint: 'em uso' };
    if (tipo === 'devolucao') return { label: 'Viatura Devolvida', hint: 'em uso / em recolha' };
    if (tipo === 'troca' || tipo === 'upgrade') return { label: 'Nova Viatura', hint: 'disponíveis' };
    return { label: 'Viatura', hint: '' };
  })();

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold leading-tight">Novo Evento</h1>
          {tipoInfo && (
            <p className="text-xs text-muted-foreground truncate">{tipoInfo.desc}</p>
          )}
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={!canSave || mutation.isPending}
          className="shrink-0"
        >
          {mutation.isPending
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A guardar...</>
            : 'Guardar'}
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

          {/* ── Tipo de Evento ── */}
          <div className="space-y-2">
            <Label>Tipo de Evento</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TIPOS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={cn(
                    'rounded-lg border-2 px-3 py-2.5 text-left transition-all text-sm',
                    tipo === t.value
                      ? t.color + ' font-semibold border-opacity-100'
                      : 'border-border hover:border-primary/40 hover:bg-muted/50 text-foreground'
                  )}
                >
                  <div className="font-medium">{t.label}</div>
                  <div className={cn('text-xs mt-0.5 leading-tight', tipo === t.value ? 'opacity-80' : 'text-muted-foreground')}>
                    {t.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Viatura + Motorista ── */}
          <div className="space-y-4 rounded-lg border border-border p-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" />
              Viatura e Motorista
            </h2>

            {/* Motorista */}
            {showMotorista && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Motorista
                  {tipo === 'recolha' && (
                    <span className="text-muted-foreground font-normal text-xs">(opcional — preenche viatura automaticamente)</span>
                  )}
                  {(tipo === 'troca' || tipo === 'upgrade') && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
                {loadingMotoristas ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />A carregar motoristas...
                  </div>
                ) : (
                  <SearchableDropdown
                    items={motoristas.map(toDropdownMotorista)}
                    value={motoristaId}
                    onChange={setMotoristaId}
                    placeholder="Pesquisar motorista..."
                    icon={<User className="h-4 w-4" />}
                    matchFn={(item, q) => {
                      const m = motoristas.find(x => x.id === item.id);
                      return m ? matchMotorista(m, q) : false;
                    }}
                  />
                )}
              </div>
            )}

            {/* Viatura atual auto-detectada (troca/upgrade) */}
            {showViaturaAutoDetect && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                  Viatura Atual <span className="text-muted-foreground font-normal text-xs">(a devolver — detetada automaticamente)</span>
                </Label>
                <ViaturaAtualDisplay
                  viatura={autoViatura}
                  loading={loadingAutoViatura}
                  motoristaSelected={!!motoristaId}
                />
              </div>
            )}

            {/* Viatura principal (entrega, recolha, devolução) */}
            {showViaturaManual && (
              <div className="space-y-1.5">
                <Label>
                  {viaturaLabel.label}
                  {viaturaLabel.hint && (
                    <span className="text-muted-foreground font-normal ml-1 text-xs">({viaturaLabel.hint})</span>
                  )}
                </Label>
                {loadingViaturas ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />A carregar viaturas...
                  </div>
                ) : (
                  <SearchableDropdown
                    items={viaturaOptions.map(toDropdownViatura)}
                    value={viaturaId}
                    onChange={setViaturaId}
                    placeholder="Selecionar viatura..."
                    icon={<Car className="h-4 w-4" />}
                    matchFn={(item, q) => {
                      const v = viaturas.find(x => x.id === item.id);
                      return v ? matchViatura(v, q) : false;
                    }}
                  />
                )}
                {!loadingViaturas && viaturaOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    {tipo === 'entrega'
                      ? 'Sem viaturas disponíveis no parque.'
                      : tipo === 'devolucao'
                      ? 'Sem viaturas em uso ou em recolha.'
                      : 'Sem viaturas em uso.'}
                  </p>
                )}
              </div>
            )}

            {/* Nova viatura (troca/upgrade) */}
            {(tipo === 'troca' || tipo === 'upgrade') && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5 text-muted-foreground" />
                  Nova Viatura <span className="text-muted-foreground font-normal text-xs">(disponíveis)</span>
                </Label>
                {loadingViaturas ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />A carregar viaturas...
                  </div>
                ) : (
                  <SearchableDropdown
                    items={viaturaOptions.map(toDropdownViatura)}
                    value={viaturaId}
                    onChange={setViaturaId}
                    placeholder="Selecionar nova viatura..."
                    icon={<Car className="h-4 w-4" />}
                    matchFn={(item, q) => {
                      const v = viaturas.find(x => x.id === item.id);
                      return v ? matchViatura(v, q) : false;
                    }}
                  />
                )}
                {!loadingViaturas && viaturaOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />Sem viaturas disponíveis no parque.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Data e Localização ── */}
          <div className="space-y-4 rounded-lg border border-border p-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Data e Localização
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="data">Data *</Label>
                <Input id="data" type="date" value={data} onChange={e => setData(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <Label htmlFor="hora">Hora</Label>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={diaTodo}
                      onChange={e => setDiaTodo(e.target.checked)}
                      className="rounded"
                    />
                    Dia inteiro
                  </label>
                </div>
                <Input
                  id="hora"
                  type="time"
                  value={hora}
                  onChange={e => setHora(e.target.value)}
                  disabled={diaTodo}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cidade" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Cidade
              </Label>
              <Input
                id="cidade"
                value={cidade}
                onChange={e => setCidade(e.target.value)}
                placeholder="Ex: Lisboa, Porto, Faro..."
              />
            </div>
          </div>

          {/* ── Observações ── */}
          <div className="space-y-1.5">
            <Label htmlFor="obs">Observações</Label>
            <Textarea
              id="obs"
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Notas adicionais sobre esta movimentação..."
              rows={3}
            />
          </div>

          {/* ── Info contextual ── */}
          <div className={cn(
            'rounded-lg border p-3 text-xs space-y-1',
            tipo === 'recolha'
              ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300'
              : 'border-border bg-muted/40 text-muted-foreground'
          )}>
            {tipo === 'entrega' && (
              <p>A viatura ficará <strong>associada ao motorista</strong> a partir da data indicada e mudará para estado <strong>em uso</strong>.</p>
            )}
            {tipo === 'recolha' && (
              <>
                <p className="font-medium">⚠ A viatura ficará em estado <strong>em recolha</strong> — pendente de confirmação de chegada ao parque.</p>
                <p>Um gestor terá de confirmar a chegada para que a viatura fique <strong>disponível</strong>.</p>
              </>
            )}
            {tipo === 'devolucao' && (
              <p>A viatura é desassociada do motorista e fica <strong>disponível imediatamente</strong> no parque.</p>
            )}
            {(tipo === 'troca' || tipo === 'upgrade') && (
              <p>A viatura atual será devolvida ao parque e a nova ficará associada ao motorista. O histórico é preservado em ambas as fichas.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
