import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowLeft, CalendarCheck, FileText, Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { StickyPageHeader } from '@/components/ui/StickyPageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useClientes } from '@/hooks/useClientes';
import { useEstacoes } from '@/hooks/useEstacoes';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateReserva,
  useDeleteReserva,
  useReserva,
  useReservaConflito,
  useUpdateReserva,
} from '@/hooks/useReservas';
import { useReservaCondutores, useSyncReservaCondutores } from '@/hooks/useReservaCondutores';
import { uploadReservaAnexoSync } from '@/hooks/useReservaAnexos';
import { useViaturas } from '@/hooks/useViaturas';
import { useMotoristas } from '@/hooks/useMotoristas';
import type { CondutorPessoa } from '@/components/renting/shared/CondutoresFields';

import { ReservaDeleteConfirm } from '@/components/renting/reservas/ReservaDeleteConfirm';
import { ReservaResumoSidebar } from '@/components/renting/reservas/ReservaResumoSidebar';
import {
  ReservaTabAnexos,
  type AnexoPendente,
} from '@/components/renting/reservas/tabs/ReservaTabAnexos';
import { ReservaTabCondutores } from '@/components/renting/reservas/tabs/ReservaTabCondutores';
import { ReservaTabGeral } from '@/components/renting/reservas/tabs/ReservaTabGeral';
import {
  isoToLocalInput,
  localInputToIso,
  reservaDialogSchema,
  type ReservaFormValues,
} from '@/components/renting/reservas/reservaDialog.schema';

import type { ReservaInsert } from '@/types/reserva';

const DEFAULT_VALUES: ReservaFormValues = {
  viatura_id: null,
  matricula: '',
  grupo: '',
  estacao_entrega_id: null,
  estacao_recolha_id: null,
  data_inicio: '',
  data_fim: '',
  cliente_id: null,
  cliente_nome: '',
  condutor_id: null,
  condutor_nome: '',
  estado: 'pendente',
  regime: 'rent_a_car',
  valor_total: null,
  desconto: null,
  valor_total_manual: null,
  franquia_valor: null,
  caucao_valor: null,
  kms_incluidos: null,
  km_adicional_valor: null,
  is_longa_duracao: false,
  renovacao_opcao: null,
  renovacao_intervalo_dias: null,
  observacoes: '',
  observacoes_internas: '',
  condutores: [],
};

/** Recolhe as mensagens de erro de validação para mostrar ao utilizador. */
function collectErrorMessages(errors: FieldErrors<ReservaFormValues>): string[] {
  const out: string[] = [];
  for (const val of Object.values(errors)) {
    if (val && typeof val === 'object' && 'message' in val && typeof val.message === 'string') {
      out.push(val.message);
    }
  }
  return out;
}

const RentingReservaForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== 'nova';

  const { data: reserva, isLoading: loadingReserva } = useReserva(isEdit ? id : null);
  const { data: condutoresAtuais = [] } = useReservaCondutores(isEdit ? id : null);

  const { data: clientes = [] } = useClientes();
  const { data: viaturas = [] } = useViaturas({ apenasDisponiveis: !isEdit });
  const { data: estacoes = [] } = useEstacoes({ apenasAtivas: false });
  const { data: motoristas = [] } = useMotoristas({ apenasAtivos: true });

  const createMutation = useCreateReserva();
  const updateMutation = useUpdateReserva();
  const deleteMutation = useDeleteReserva();
  const syncCondutoresMutation = useSyncReservaCondutores();

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('geral');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [anexosPendentes, setAnexosPendentes] = useState<AnexoPendente[]>([]);

  const adicionarAnexosPendentes = (files: File[]) => {
    setAnexosPendentes((prev) => [
      ...prev,
      ...files.map((file) => ({
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
        file,
        nome: file.name,
      })),
    ]);
  };

  const renomearAnexoPendente = (id: string, nome: string) => {
    setAnexosPendentes((prev) => prev.map((p) => (p.id === id ? { ...p, nome } : p)));
  };

  const removerAnexoPendente = (id: string) => {
    setAnexosPendentes((prev) => prev.filter((p) => p.id !== id));
  };

  const isPending =
    createMutation.isPending || updateMutation.isPending || syncCondutoresMutation.isPending;

  const form = useForm<ReservaFormValues>({
    resolver: zodResolver(reservaDialogSchema),
    defaultValues: DEFAULT_VALUES,
  });

  // TVDE → condutores são motoristas; rent-a-car → clientes.
  const isTvde = form.watch('regime') === 'tvde';
  const condutorPessoas: CondutorPessoa[] = isTvde ? motoristas : clientes;

  // Hidrata o formulário quando a reserva carrega (modo edição).
  useEffect(() => {
    if (!isEdit) return;
    if (!reserva) return;
    form.reset({
      viatura_id: reserva.viatura_id,
      matricula: reserva.matricula ?? '',
      grupo: reserva.grupo ?? '',
      estacao_entrega_id: reserva.estacao_entrega_id,
      estacao_recolha_id: reserva.estacao_recolha_id,
      data_inicio: isoToLocalInput(reserva.data_inicio),
      data_fim: isoToLocalInput(reserva.data_fim),
      cliente_id: reserva.cliente_id,
      cliente_nome: reserva.cliente_nome ?? '',
      condutor_id: reserva.condutor_id,
      condutor_nome: reserva.condutor_nome ?? '',
      estado: reserva.estado,
      regime: reserva.regime,
      valor_total: reserva.valor_total,
      desconto: reserva.desconto,
      valor_total_manual: reserva.valor_total_manual,
      franquia_valor: reserva.franquia_valor,
      caucao_valor: reserva.caucao_valor,
      kms_incluidos: reserva.kms_incluidos,
      km_adicional_valor: reserva.km_adicional_valor,
      is_longa_duracao: reserva.is_longa_duracao,
      renovacao_opcao: reserva.renovacao_opcao,
      renovacao_intervalo_dias: reserva.renovacao_intervalo_dias,
      observacoes: reserva.observacoes ?? '',
      observacoes_internas: reserva.observacoes_internas ?? '',
      condutores: condutoresAtuais.map((c) => ({
        pessoa_id: (c.cliente_id ?? c.motorista_id) as string,
        is_principal: c.is_principal,
      })),
    });
  }, [isEdit, reserva, condutoresAtuais, form]);

  // Pré-check de conflito de datas (UX-only — o gate real é o EXCLUDE na BD).
  const viaturaId = form.watch('viatura_id');
  const dataInicio = form.watch('data_inicio');
  const dataFim = form.watch('data_fim');

  const conflitoArgs = useMemo(() => {
    const di = dataInicio ? new Date(dataInicio) : null;
    const df = dataFim ? new Date(dataFim) : null;
    return {
      viaturaId: viaturaId ?? null,
      dataInicio: di && !Number.isNaN(di.getTime()) ? di : null,
      dataFim: df && !Number.isNaN(df.getTime()) ? df : null,
      excluirId: reserva?.id ?? null,
    };
  }, [viaturaId, dataInicio, dataFim, reserva?.id]);

  const { data: temConflito } = useReservaConflito(conflitoArgs);

  const onSubmit = async (values: ReservaFormValues) => {
    try {
      const viaturaSelecionada = viaturas.find((v) => v.id === values.viatura_id);
      const matriculaFinal = values.matricula || viaturaSelecionada?.matricula || null;

      // Condutor principal — derivado da lista para snapshot na reserva.
      const condutorPrincipal = values.condutores.find((c) => c.is_principal) ?? null;
      const condutorPrincipalPessoa = condutorPrincipal
        ? (condutorPessoas.find((p) => p.id === condutorPrincipal.pessoa_id) ?? null)
        : null;

      const payload: ReservaInsert = {
        viatura_id: values.viatura_id || null,
        matricula: matriculaFinal,
        grupo: values.grupo || null,
        estacao_entrega_id: values.estacao_entrega_id || null,
        estacao_recolha_id: values.estacao_recolha_id || null,
        data_inicio: localInputToIso(values.data_inicio),
        data_fim: localInputToIso(values.data_fim),
        cliente_id: values.cliente_id || null,
        cliente_nome: values.cliente_nome || null,
        // condutor_id refere motoristas_ativos — preenchido só em TVDE.
        condutor_id: isTvde ? (condutorPrincipal?.pessoa_id ?? null) : null,
        condutor_nome: condutorPrincipalPessoa?.nome ?? null,
        estado: values.estado,
        regime: values.regime,
        valor_total: values.valor_total,
        desconto: values.desconto,
        valor_total_manual: values.valor_total_manual,
        franquia_valor: values.franquia_valor,
        caucao_valor: values.caucao_valor,
        kms_incluidos: values.kms_incluidos,
        km_adicional_valor: values.km_adicional_valor,
        is_longa_duracao: values.is_longa_duracao,
        renovacao_opcao: values.is_longa_duracao ? (values.renovacao_opcao ?? null) : null,
        renovacao_intervalo_dias:
          values.is_longa_duracao && values.renovacao_opcao === 'intervalo_dias'
            ? values.renovacao_intervalo_dias
            : null,
        observacoes: values.observacoes || null,
        observacoes_internas: values.observacoes_internas || null,
      };

      if (isEdit && reserva) {
        // Editar: ficar na própria página (utilizador vê toast e continua a trabalhar).
        updateMutation.mutate(
          { id: reserva.id, ...payload },
          {
            onSuccess: () => {
              syncCondutoresMutation.mutate({
                reservaId: reserva.id,
                desejados: values.condutores,
                tipo: isTvde ? 'motorista' : 'cliente',
              });
            },
          }
        );
      } else {
        // Criar: navegar para modo edição da nova reserva.
        // Permite clicar logo "Criar Contrato" sem voltar à lista.
        createMutation.mutate(payload, {
          onSuccess: async (created) => {
            // Sincroniza os condutores na nova reserva.
            syncCondutoresMutation.mutate({
              reservaId: created.id,
              desejados: values.condutores,
              tipo: isTvde ? 'motorista' : 'cliente',
            });
            // Upload em batch dos anexos pendentes — best-effort.
            if (anexosPendentes.length > 0) {
              for (const p of anexosPendentes) {
                try {
                  await uploadReservaAnexoSync(created.id, p.file, p.nome);
                } catch (err) {
                  // Log + continua para os próximos. O utilizador pode re-anexar
                  // em edição se algum falhar.
                  console.error(`Falha a anexar ${p.nome}:`, err);
                }
              }
              setAnexosPendentes([]);
            }
            navigate(`/renting/reservas/${created.id}`);
          },
        });
      }
    } catch {
      // Erros são reportados via toast pelas mutations
    }
  };

  // Validação falhou — avisa o utilizador (senão "não acontece nada" ao Guardar).
  const onInvalid = (errors: FieldErrors<ReservaFormValues>) => {
    if (errors.condutores) setActiveTab('condutores');
    const messages = collectErrorMessages(errors);
    toast({
      title: 'Não foi possível guardar',
      description: messages[0] ?? 'Há campos obrigatórios por preencher. Verifique o formulário.',
      variant: 'destructive',
    });
  };

  const handleDelete = () => {
    if (!reserva) return;
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!reserva) return;
    deleteMutation.mutate(reserva.id, {
      onSuccess: () => {
        setConfirmDeleteOpen(false);
        navigate('/renting/reservas');
      },
    });
  };

  // Estados de carregamento em edição
  if (isEdit && loadingReserva) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isEdit && !loadingReserva && !reserva) {
    return (
      <div className="w-full">
        <StickyPageHeader title="Reserva não encontrada" icon={CalendarCheck}>
          <Button variant="outline" onClick={() => navigate('/renting/reservas')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </StickyPageHeader>
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            A reserva pedida não existe ou foi eliminada.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="w-full">
        <StickyPageHeader
          title={isEdit ? `Reserva #${reserva?.codigo}` : 'Nova Reserva'}
          description={
            isEdit ? 'Editar dados da reserva existente' : 'Cria uma nova reserva de renting'
          }
          icon={CalendarCheck}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/renting/reservas')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          {isEdit && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="gap-2"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Eliminar
            </Button>
          )}
          {isEdit &&
            reserva &&
            reserva.cliente_id &&
            reserva.viatura_id &&
            (reserva.estado === 'confirmada' || reserva.estado === 'em_curso') && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/renting/contratos/novo?reserva_id=${reserva.id}`)}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Criar Contrato
              </Button>
            )}
          <Button
            type="button"
            onClick={form.handleSubmit(onSubmit, onInvalid)}
            disabled={isPending}
            className="gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Guardar' : 'Criar'}
          </Button>
        </StickyPageHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
            {temConflito && (
              <div className="flex items-start gap-2 p-3 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">
                  Conflito de datas — esta viatura já tem outra reserva activa que se sobrepõe a
                  este período. Guardar irá falhar.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-4 items-start">
              <Card className="bg-card border-border">
                <CardContent className="p-4 sm:p-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid grid-cols-3 w-full sm:w-auto sm:inline-flex">
                      <TabsTrigger value="geral">Geral</TabsTrigger>
                      <TabsTrigger value="condutores">
                        {isTvde ? 'Motoristas' : 'Condutores'}
                      </TabsTrigger>
                      <TabsTrigger value="anexos">Anexos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="geral" className="pt-4">
                      <ReservaTabGeral
                        form={form}
                        viaturas={viaturas}
                        estacoes={estacoes}
                        clientes={clientes}
                        isEdit={isEdit}
                      />
                    </TabsContent>

                    <TabsContent value="condutores" className="pt-4">
                      <ReservaTabCondutores
                        pessoas={condutorPessoas}
                        tipo={isTvde ? 'motorista' : 'cliente'}
                      />
                    </TabsContent>

                    <TabsContent value="anexos" className="pt-4">
                      <ReservaTabAnexos
                        reservaId={isEdit ? (id ?? null) : null}
                        pendentes={anexosPendentes}
                        onAdicionarPendentes={adicionarAnexosPendentes}
                        onRenomearPendente={renomearAnexoPendente}
                        onRemoverPendente={removerAnexoPendente}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <div className="xl:sticky xl:top-24">
                <ReservaResumoSidebar
                  form={form}
                  estacoes={estacoes}
                  viaturas={viaturas}
                  isEdit={isEdit}
                />
              </div>
            </div>
          </form>
        </Form>
      </div>

      <ReservaDeleteConfirm
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        reserva={reserva ?? null}
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
};

export default RentingReservaForm;
