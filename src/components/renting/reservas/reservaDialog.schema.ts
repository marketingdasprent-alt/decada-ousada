import { z } from 'zod';
import { RENOVACAO_OPCOES, RESERVA_ESTADOS, RESERVA_REGIMES } from '@/types/reserva';

const optionalNumber = z
  .union([z.number(), z.string()])
  .optional()
  .nullable()
  .transform((v) => {
    if (v === '' || v === null || v === undefined) return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

/** Data/hora obrigatória, com mensagem amigável por campo. */
const datetimeLocal = (label: string) =>
  z
    .string()
    .min(1, `Indique a ${label}`)
    .refine((v) => !Number.isNaN(new Date(v).getTime()), `A ${label} é inválida`);

/** UUID opcional — string vazia conta como ausente (null), não como erro. */
const optionalUuid = (msg = 'Valor inválido') =>
  z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.string().uuid(msg).nullable()
  );

export const reservaDialogSchema = z
  .object({
    viatura_id: optionalUuid('Viatura inválida'),
    matricula: z.string().max(20).optional().nullable(),
    grupo: z.string().max(50).optional().nullable(),

    estacao_entrega_id: optionalUuid('Estação de início inválida'),
    estacao_recolha_id: optionalUuid('Estação de fim inválida'),

    data_inicio: datetimeLocal('data de início'),
    data_fim: datetimeLocal('data de fim'),

    cliente_id: optionalUuid('Cliente inválido'),
    cliente_nome: z.string().max(255).optional().nullable(),

    condutor_id: optionalUuid('Condutor inválido'),
    condutor_nome: z.string().max(255).optional().nullable(),

    estado: z.enum(RESERVA_ESTADOS),
    regime: z.enum(RESERVA_REGIMES).default('rent_a_car'),

    valor_total: optionalNumber,
    desconto: optionalNumber,
    valor_total_manual: optionalNumber,
    franquia_valor: optionalNumber,
    caucao_valor: optionalNumber,
    kms_incluidos: optionalNumber,
    km_adicional_valor: optionalNumber,

    is_longa_duracao: z.boolean().default(false),
    renovacao_opcao: z.enum(RENOVACAO_OPCOES).nullable().optional(),
    renovacao_intervalo_dias: optionalNumber,

    observacoes: z.string().max(2000).optional().nullable(),
    observacoes_internas: z.string().max(2000).optional().nullable(),

    condutores: z
      .array(
        z.object({
          pessoa_id: z.string().uuid('Condutor inválido'),
          is_principal: z.boolean().default(false),
        })
      )
      .min(1, 'É obrigatório pelo menos um condutor/motorista.')
      .default([])
      .refine(
        (lista) => {
          const ids = lista.map((c) => c.pessoa_id);
          return new Set(ids).size === ids.length;
        },
        { message: 'Cada pessoa só pode aparecer uma vez.' }
      )
      .refine((lista) => lista.filter((c) => c.is_principal).length <= 1, {
        message: 'Apenas um condutor pode ser principal.',
      }),
  })
  .refine((d) => new Date(d.data_fim).getTime() > new Date(d.data_inicio).getTime(), {
    message: 'Data fim tem que ser posterior à data início',
    path: ['data_fim'],
  })
  .refine(
    (d) => {
      const diffDays =
        (new Date(d.data_fim).getTime() - new Date(d.data_inicio).getTime()) /
        (1000 * 60 * 60 * 24);
      return diffDays <= 365;
    },
    { message: 'Duração máxima: 365 dias', path: ['data_fim'] }
  )
  // Validação condicional: estado confirmada/em_curso exige dados completos.
  // Reserva pendente pode ser rascunho com cliente/viatura/estações por preencher.
  .superRefine((d, ctx) => {
    const exigeCompleto = d.estado === 'confirmada' || d.estado === 'em_curso';
    if (!exigeCompleto) return;

    if (!d.cliente_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cliente_id'],
        message: 'Indique o cliente da reserva',
      });
    }
    if (!d.viatura_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['viatura_id'],
        message: 'Indique a viatura',
      });
    }
    if (!d.estacao_entrega_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['estacao_entrega_id'],
        message: 'Indique a estação de início',
      });
    }
    if (!d.estacao_recolha_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['estacao_recolha_id'],
        message: 'Indique a estação de fim',
      });
    }
  })
  // Renovação: o aluguer de longa duração obriga a escolher a opção de renovação.
  .superRefine((d, ctx) => {
    if (d.is_longa_duracao && !d.renovacao_opcao) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['renovacao_opcao'],
        message: 'Escolha a opção de renovação.',
      });
    }
    if (
      d.is_longa_duracao &&
      d.renovacao_opcao === 'intervalo_dias' &&
      (d.renovacao_intervalo_dias == null || d.renovacao_intervalo_dias <= 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['renovacao_intervalo_dias'],
        message: 'Indique o intervalo de dias da renovação.',
      });
    }
  });

export type ReservaFormValues = z.infer<typeof reservaDialogSchema>;

/** Converte ISO timestamp para input[type=datetime-local] no fuso do browser. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Converte input[type=datetime-local] (fuso local) para ISO UTC. */
export function localInputToIso(local: string): string {
  return new Date(local).toISOString();
}
