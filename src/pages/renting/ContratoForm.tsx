import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowLeft, FileText, Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { StickyPageHeader } from '@/components/ui/StickyPageHeader';

import { useClientes } from '@/hooks/useClientes';
import { useToast } from '@/hooks/use-toast';
import { useContratoCoberturas, useSyncContratoCoberturas } from '@/hooks/useContratoCoberturas';
import {
  useContratoExtras,
  useSyncContratoExtras,
  calcExtraTotal,
} from '@/hooks/useContratoExtras';
import { useContratoTaxas, useSyncContratoTaxas } from '@/hooks/useContratoTaxas';
import { useContratoCondutores, useSyncContratoCondutores } from '@/hooks/useContratoCondutores';
import {
  useContratoConflito,
  useContratoRenting,
  useCreateContratoRenting,
  useDeleteContratoRenting,
  useUpdateContratoRenting,
} from '@/hooks/useContratosRenting';
import { useEstacoes } from '@/hooks/useEstacoes';
import { useOrgDefinicoes, ivaParaRegime } from '@/hooks/useOrgDefinicoes';
import { useRentingCoberturas } from '@/hooks/useRentingCoberturas';
import { useRentingExtras } from '@/hooks/useRentingExtras';
import { useRentingTaxas } from '@/hooks/useRentingTaxas';
import { useReserva } from '@/hooks/useReservas';
import { useViaturas } from '@/hooks/useViaturas';
import { useMotoristas } from '@/hooks/useMotoristas';

import { ContratoDeleteConfirm } from '@/components/renting/contratos/ContratoDeleteConfirm';
import { ContratoFormSecoes } from '@/components/renting/contratos/ContratoFormSecoes';
import { ContratoTabAnexos } from '@/components/renting/contratos/ContratoTabAnexos';
import { ContratoTabCobertura } from '@/components/renting/contratos/ContratoTabCobertura';
import { ContratoTabExtras } from '@/components/renting/contratos/ContratoTabExtras';
import { ContratoTabTaxas } from '@/components/renting/contratos/ContratoTabTaxas';
import { ContratoTabsPlaceholder } from '@/components/renting/contratos/ContratoTabsPlaceholder';
import { ResumoContrato } from '@/components/renting/contratos/ResumoContrato';
import { CondutoresFields, type CondutorPessoa } from '@/components/renting/shared/CondutoresFields';
import {
  DEFAULT_CONTRATO_VALUES,
  contratoFormSchema,
  isoToLocalInput,
  localInputToIso,
  type ContratoFormValues,
} from '@/components/renting/contratos/contratoForm.schema';

import type {
  CoberturaFormItem,
  ContratoRentingInsert,
  ExtraFormItem,
  TaxaFormItem,
} from '@/types/contratoRenting';
import type { CondutorFormItem } from '@/types/reserva';

/** Recolhe as mensagens de erro de validação para mostrar ao utilizador. */
function collectErrorMessages(errors: FieldErrors<ContratoFormValues>): string[] {
  const out: string[] = [];
  for (const val of Object.values(errors)) {
    if (val && typeof val === 'object' && 'message' in val && typeof val.message === 'string') {
      out.push(val.message);
    }
  }
  return out;
}

const ContratoForm = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  // Server state
  const { data: clientes = [] } = useClientes();
  const { data: motoristas = [] } = useMotoristas({ apenasAtivos: true });
  const { data: viaturas = [] } = useViaturas();
  const { data: estacoes = [] } = useEstacoes({ apenasAtivas: false });
  const { data: coberturas = [] } = useRentingCoberturas({ apenasAtivas: true });
  const { data: extrasCatalogo = [] } = useRentingExtras({ apenasAtivos: true });
  const { data: taxasCatalogo = [] } = useRentingTaxas({ apenasAtivas: true });
  const { data: orgDefinicoes } = useOrgDefinicoes();
  const { data: contrato, isLoading: loadingContrato } = useContratoRenting(id ?? null);

  // Carrega reserva quando vier no query string (?reserva_id=X) e estamos a criar
  const reservaIdFromQuery = searchParams.get('reserva_id');
  const { data: reservaFromQuery } = useReserva(!isEdit ? reservaIdFromQuery : null);

  const createMutation = useCreateContratoRenting();
  const updateMutation = useUpdateContratoRenting();
  const deleteMutation = useDeleteContratoRenting();
  const syncCondutoresMutation = useSyncContratoCondutores();
  const syncCoberturasMutation = useSyncContratoCoberturas();
  const syncExtrasMutation = useSyncContratoExtras();
  const syncTaxasMutation = useSyncContratoTaxas();
  const { data: condutoresDb } = useContratoCondutores(contrato?.id ?? null);
  const { data: coberturasDb } = useContratoCoberturas(contrato?.id ?? null);
  const { data: extrasDb } = useContratoExtras(contrato?.id ?? null);
  const { data: taxasDb } = useContratoTaxas(contrato?.id ?? null);
  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    syncCondutoresMutation.isPending ||
    syncCoberturasMutation.isPending ||
    syncExtrasMutation.isPending ||
    syncTaxasMutation.isPending;

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { toast } = useToast();

  // Validação falhou — avisa o utilizador (senão "não acontece nada" ao Guardar).
  const onInvalid = (errors: FieldErrors<ContratoFormValues>) => {
    const messages = collectErrorMessages(errors);
    toast({
      title: 'Não foi possível guardar',
      description:
        messages[0] ?? 'Há campos obrigatórios por preencher. Verifique o formulário.',
      variant: 'destructive',
    });
  };

  const handleDelete = () => {
    if (!contrato) return;
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!contrato) return;
    deleteMutation.mutate(contrato.id, {
      onSuccess: () => {
        setConfirmDeleteOpen(false);
        navigate('/renting/contratos');
      },
    });
  };

  // Guard: criar contrato sem reserva_id na URL → redireccionar para lista
  // (a lista abre o selector). Reserva é obrigatória.
  useEffect(() => {
    if (!isEdit && !reservaIdFromQuery) {
      navigate('/renting/contratos', { replace: true });
    }
  }, [isEdit, reservaIdFromQuery, navigate]);

  const form = useForm<ContratoFormValues>({
    resolver: zodResolver(contratoFormSchema),
    defaultValues: DEFAULT_CONTRATO_VALUES,
  });

  // Hidratação: contrato existente OU pré-preenchimento via reserva_id
  useEffect(() => {
    if (isEdit && contrato) {
      form.reset({
        cliente_id: contrato.cliente_id,
        viatura_id: contrato.viatura_id,
        grupo: contrato.grupo ?? '',
        matricula: contrato.matricula ?? '',
        reserva_id: contrato.reserva_id,
        estacao_entrega_id: contrato.estacao_entrega_id,
        data_inicio: isoToLocalInput(contrato.data_inicio),
        estacao_recolha_id: contrato.estacao_recolha_id,
        data_fim: isoToLocalInput(contrato.data_fim),
        estacao_origem_viatura_id: contrato.estacao_origem_viatura_id,
        estado_operacional: contrato.estado_operacional,
        estado_financeiro: contrato.estado_financeiro,
        origem: contrato.origem,
        regime: contrato.regime,
        tarifa_diaria: contrato.tarifa_diaria,
        desconto_percentagem: contrato.desconto_percentagem,
        taxa_iva: contrato.taxa_iva,
        valor_total_manual: contrato.valor_total_manual,
        // ALD
        is_longa_duracao: contrato.is_longa_duracao,
        renovacao_opcao: contrato.renovacao_opcao,
        renovacao_intervalo_dias: contrato.renovacao_intervalo_dias,
        // Financeiro extra
        franquia_valor: contrato.franquia_valor,
        caucao_valor: contrato.caucao_valor,
        kms_incluidos: contrato.kms_incluidos,
        km_adicional_valor: contrato.km_adicional_valor,
        voucher_codigo: contrato.voucher_codigo ?? '',
        numero_processo: contrato.numero_processo ?? '',
        voo_referencia: contrato.voo_referencia ?? '',
        local_entrega: contrato.local_entrega ?? '',
        local_recolha: contrato.local_recolha ?? '',
        comentarios_entrega: contrato.comentarios_entrega ?? '',
        comentarios_recolha: contrato.comentarios_recolha ?? '',
        observacoes: contrato.observacoes ?? '',
        observacoes_internas: contrato.observacoes_internas ?? '',
      });
      return;
    }
    if (!isEdit && reservaFromQuery) {
      // Conversão reserva → contrato: copia TUDO o que faz sentido.
      // O orçamento da reserva (valor_total) torna-se valor_total_manual no contrato.
      form.reset({
        ...DEFAULT_CONTRATO_VALUES,
        reserva_id: reservaFromQuery.id,
        cliente_id: reservaFromQuery.cliente_id ?? '',
        viatura_id: reservaFromQuery.viatura_id ?? '',
        matricula: reservaFromQuery.matricula ?? '',
        grupo: reservaFromQuery.grupo ?? '',
        estacao_entrega_id: reservaFromQuery.estacao_entrega_id,
        estacao_recolha_id: reservaFromQuery.estacao_recolha_id,
        data_inicio: isoToLocalInput(reservaFromQuery.data_inicio),
        data_fim: isoToLocalInput(reservaFromQuery.data_fim),
        origem: 'sistema',
        regime: reservaFromQuery.regime,
        // Orçamento da reserva → override do total no contrato
        valor_total_manual: reservaFromQuery.valor_total,
        // ALD da reserva
        is_longa_duracao: reservaFromQuery.is_longa_duracao ?? false,
        renovacao_opcao: reservaFromQuery.renovacao_opcao ?? null,
        renovacao_intervalo_dias: reservaFromQuery.renovacao_intervalo_dias,
        // Financeiro extra da reserva
        franquia_valor: reservaFromQuery.franquia_valor,
        caucao_valor: reservaFromQuery.caucao_valor,
        kms_incluidos: reservaFromQuery.kms_incluidos,
        km_adicional_valor: reservaFromQuery.km_adicional_valor,
        observacoes: reservaFromQuery.observacoes ?? '',
        observacoes_internas: reservaFromQuery.observacoes_internas ?? '',
      });
    }
  }, [isEdit, contrato, reservaFromQuery, form]);

  // Hidratação dos condutores (vem em request separado — só em modo edit)
  useEffect(() => {
    if (!isEdit || !contrato || !condutoresDb) return;
    form.setValue(
      'condutores',
      condutoresDb.map((c) => ({
        pessoa_id: (c.cliente_id ?? c.motorista_id) as string,
        is_principal: c.is_principal,
      })),
      { shouldDirty: false }
    );
  }, [isEdit, contrato, condutoresDb, form]);

  // Hidratação das coberturas (request separado — só em modo edit)
  useEffect(() => {
    if (!isEdit || !contrato || !coberturasDb) return;
    form.setValue(
      'coberturas',
      coberturasDb.map((c) => ({
        cobertura_id: c.cobertura_id,
        cobertura_nome: c.cobertura_nome,
        preco_dia: c.preco_dia,
        franquia_valor: c.franquia_valor,
      })),
      { shouldDirty: false }
    );
  }, [isEdit, contrato, coberturasDb, form]);

  // Hidratação dos extras (request separado — só em modo edit)
  useEffect(() => {
    if (!isEdit || !contrato || !extrasDb) return;
    form.setValue(
      'extras',
      extrasDb.map((e) => ({
        extra_id: e.extra_id,
        extra_nome: e.extra_nome,
        preco_unidade: e.preco_unidade,
        tipo_calculo: e.tipo_calculo,
        quantidade: e.quantidade,
      })),
      { shouldDirty: false }
    );
  }, [isEdit, contrato, extrasDb, form]);

  // Hidratação das taxas (request separado — só em modo edit)
  useEffect(() => {
    if (!isEdit || !contrato || !taxasDb) return;
    form.setValue(
      'taxas',
      taxasDb.map((t) => ({
        taxa_id: t.taxa_id,
        taxa_nome: t.taxa_nome,
        percentagem: t.percentagem,
        valor_fixo: t.valor_fixo,
      })),
      { shouldDirty: false }
    );
  }, [isEdit, contrato, taxasDb, form]);

  // Valores reactivos (conflito + resumo de preço)
  const viaturaId = form.watch('viatura_id');
  const dataInicio = form.watch('data_inicio');
  const dataFim = form.watch('data_fim');
  const tarifaDiaria = form.watch('tarifa_diaria');
  const valorTotalManual = form.watch('valor_total_manual');
  const descontoPercentagem = form.watch('desconto_percentagem');
  const taxaIva = form.watch('taxa_iva');
  const regime = form.watch('regime');
  const isTvde = regime === 'tvde';
  const condutorPessoas: CondutorPessoa[] = isTvde ? motoristas : clientes;
  const coberturasForm = form.watch('coberturas');
  const extrasForm = form.watch('extras') as ExtraFormItem[];
  const taxasForm = form.watch('taxas') as TaxaFormItem[];

  // O IVA não é editável no contrato — é derivado do regime
  // (rent-a-car / TVDE) e das taxas configuradas na organização.
  useEffect(() => {
    form.setValue('taxa_iva', ivaParaRegime(orgDefinicoes, regime), {
      shouldDirty: false,
    });
  }, [regime, orgDefinicoes, form]);

  // Soma do preço/dia das coberturas seleccionadas (× dias no ResumoContrato)
  const coberturasPrecoDia = useMemo(
    () => (coberturasForm ?? []).reduce((soma, c) => soma + (c.preco_dia ?? 0), 0),
    [coberturasForm]
  );

  const isFacturado = contrato?.estado_financeiro === 'facturado';

  const conflitoArgs = useMemo(() => {
    const di = dataInicio ? new Date(dataInicio) : null;
    const df = dataFim ? new Date(dataFim) : null;
    return {
      viaturaId: viaturaId || null,
      dataInicio: di && !Number.isNaN(di.getTime()) ? di : null,
      dataFim: df && !Number.isNaN(df.getTime()) ? df : null,
      excluirId: contrato?.id ?? null,
      reservaId: form.watch('reserva_id') ?? null,
    };
  }, [viaturaId, dataInicio, dataFim, contrato?.id, form]);

  const { data: temConflito } = useContratoConflito(conflitoArgs);

  const onSubmit = (values: ContratoFormValues) => {
    // Snapshot matrícula a partir da viatura se não veio do form
    const viatura = viaturas.find((v) => v.id === values.viatura_id);
    const matriculaFinal = values.matricula || viatura?.matricula || null;

    const payload: ContratoRentingInsert = {
      reserva_id: values.reserva_id,
      cliente_id: values.cliente_id,
      viatura_id: values.viatura_id,
      matricula: matriculaFinal,
      grupo: values.grupo || null,
      estacao_entrega_id: values.estacao_entrega_id || null,
      data_inicio: localInputToIso(values.data_inicio),
      estacao_recolha_id: values.estacao_recolha_id || null,
      data_fim: localInputToIso(values.data_fim),
      estacao_origem_viatura_id: values.estacao_origem_viatura_id || null,
      estado_operacional: values.estado_operacional,
      estado_financeiro: values.estado_financeiro,
      origem: values.origem,
      regime: values.regime,
      tarifa_diaria: values.tarifa_diaria,
      desconto_percentagem: values.desconto_percentagem,
      taxa_iva: values.taxa_iva,
      valor_total_manual: values.valor_total_manual,
      // ALD
      is_longa_duracao: values.is_longa_duracao,
      renovacao_opcao: values.renovacao_opcao ?? null,
      renovacao_intervalo_dias: values.renovacao_intervalo_dias,
      // Financeiro extra
      franquia_valor: values.franquia_valor,
      caucao_valor: values.caucao_valor,
      kms_incluidos: values.kms_incluidos,
      km_adicional_valor: values.km_adicional_valor,
      voucher_codigo: values.voucher_codigo || null,
      numero_processo: values.numero_processo || null,
      voo_referencia: values.voo_referencia || null,
      local_entrega: values.local_entrega || null,
      local_recolha: values.local_recolha || null,
      comentarios_entrega: values.comentarios_entrega || null,
      comentarios_recolha: values.comentarios_recolha || null,
      observacoes: values.observacoes || null,
      observacoes_internas: values.observacoes_internas || null,
    };

    // Nº de dias do contrato — necessário para o total dos extras 'dia'.
    const msDia = 86400000;
    const diasContrato = Math.max(
      1,
      Math.ceil(
        (new Date(values.data_fim).getTime() - new Date(values.data_inicio).getTime()) / msDia
      )
    );

    // Subtotal do contrato — base de cálculo das taxas percentuais.
    // Espelha o cálculo do ResumoContrato: aluguer + coberturas + extras, com desconto.
    const baseAluguer =
      values.valor_total_manual != null && values.valor_total_manual > 0
        ? values.valor_total_manual
        : (values.tarifa_diaria ?? 0) * diasContrato;
    const custoCoberturas =
      values.coberturas.reduce((soma, c) => soma + (c.preco_dia ?? 0), 0) * diasContrato;
    // Os arrays do form já passaram a validação Zod do handleSubmit — os
    // elementos estão completos, daí o cast para os tipos *FormItem.
    const condutores = values.condutores as CondutorFormItem[];
    const coberturas = values.coberturas as CoberturaFormItem[];
    const extras = values.extras as ExtraFormItem[];
    const taxas = values.taxas as TaxaFormItem[];

    const custoExtras = extras.reduce((soma, e) => soma + calcExtraTotal(e, diasContrato), 0);
    const subtotalBruto = baseAluguer + custoCoberturas + custoExtras;
    const subtotalTaxas = subtotalBruto * (1 - (values.desconto_percentagem ?? 0) / 100);

    // Sincroniza condutores + coberturas + extras + taxas (junções) após o contrato existir.
    const syncRelacoes = (contratoId: string) => {
      syncCondutoresMutation.mutate({
        contratoId,
        desejados: condutores,
        tipo: isTvde ? 'motorista' : 'cliente',
      });
      syncCoberturasMutation.mutate({ contratoId, desejadas: coberturas });
      syncExtrasMutation.mutate({ contratoId, desejados: extras, dias: diasContrato });
      syncTaxasMutation.mutate({ contratoId, desejadas: taxas, subtotal: subtotalTaxas });
    };

    if (isEdit && contrato) {
      // Editar: ficar na própria página (utilizador vê toast e continua a trabalhar).
      updateMutation.mutate(
        { id: contrato.id, ...payload },
        { onSuccess: () => syncRelacoes(contrato.id) }
      );
    } else {
      // Criar: sincronizar relações e navegar para modo edição do novo contrato.
      createMutation.mutate(payload, {
        onSuccess: (created) => {
          syncRelacoes(created.id);
          navigate(`/renting/contratos/${created.id}`);
        },
      });
    }
  };

  if (isEdit && loadingContrato) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isEdit && !contrato) {
    return (
      <div className="w-full">
        <StickyPageHeader title="Contrato não encontrado" icon={FileText} />
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Este contrato não existe ou já foi removido.</p>
            <Button
              variant="outline"
              className="mt-4 gap-2"
              onClick={() => navigate('/renting/contratos')}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar à lista
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <StickyPageHeader
        title={isEdit ? `Contrato #${contrato?.codigo}` : 'Novo Contrato'}
        description={isEdit ? 'Editar dados do contrato existente' : 'Novo contrato de renting'}
        icon={FileText}
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/renting/contratos')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        {isEdit && contrato && (
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
        <Button
          type="button"
          onClick={form.handleSubmit(onSubmit, onInvalid)}
          disabled={isPending}
          className="gap-2"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? 'Guardar' : 'Abrir Contrato'}
        </Button>
      </StickyPageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 sm:p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
                <ContratoTabsPlaceholder
                  geralContent={
                    <ContratoFormSecoes
                      form={form}
                      clientes={clientes}
                      viaturas={viaturas}
                      estacoes={estacoes}
                    />
                  }
                  condutoresLabel={isTvde ? 'Motoristas' : 'Condutores'}
                  condutoresContent={
                    <CondutoresFields
                      pessoas={condutorPessoas}
                      tipo={isTvde ? 'motorista' : 'cliente'}
                      clientePrincipalLabel="Cliente do contrato também conduz"
                    />
                  }
                  coberturasContent={<ContratoTabCobertura form={form} coberturas={coberturas} />}
                  extrasContent={<ContratoTabExtras form={form} extras={extrasCatalogo} />}
                  taxasContent={<ContratoTabTaxas form={form} taxas={taxasCatalogo} />}
                  anexosContent={<ContratoTabAnexos contratoId={contrato?.id ?? null} />}
                />

                {temConflito && (
                  <div className="flex items-start gap-2 p-3 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p className="text-sm">
                      Conflito de disponibilidade — esta viatura já tem contrato ou reserva activa
                      sobreposta a este período. Guardar irá falhar.
                    </p>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        <aside>
          <ResumoContrato
            dataInicio={dataInicio}
            dataFim={dataFim}
            tarifaDiaria={tarifaDiaria}
            valorTotalManual={valorTotalManual}
            descontoPercentagem={descontoPercentagem}
            taxaIva={taxaIva}
            coberturasPrecoDia={coberturasPrecoDia}
            extras={extrasForm}
            taxas={taxasForm}
            isFacturado={isFacturado}
            totalSnapshot={contrato?.total_final}
            subtotalSnapshot={contrato?.total_subtotal}
            ivaSnapshot={contrato?.total_iva}
          />
        </aside>
      </div>

      <ContratoDeleteConfirm
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        contrato={contrato ?? null}
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default ContratoForm;
