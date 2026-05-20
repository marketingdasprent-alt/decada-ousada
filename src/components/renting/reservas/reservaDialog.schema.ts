import { z } from 'zod';
import { RENOVACAO_OPCOES, RESERVA_ESTADOS } from '@/types/reserva';
import { CONTRATO_MODALIDADES } from '@/types/contratoRenting';

const optionalNumber = z
  .union([z.number(), z.string()])
  .optional()
  .nullable()
  .transform((v) => {
    if (v === '' || v === null || v === undefined) return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

const datetimeLocal = z
  .string()
  .min(1, 'Data obrigatória')
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Data inválida');

export const reservaDialogSchema = z
  .object({
    viatura_id: z.string().uuid('Viatura inválida').nullable().optional(),
    matricula: z.string().max(20).optional().nullable(),
    grupo: z.string().max(50).optional().nullable(),

    estacao_entrega_id: z.string().uuid().nullable().optional(),
    estacao_recolha_id: z.string().uuid().nullable().optional(),

    data_inicio: datetimeLocal,
    data_fim: datetimeLocal,

    cliente_id: z.string().uuid().nullable().optional(),
    cliente_nome: z.string().max(255).optional().nullable(),

    condutor_id: z.string().uuid().nullable().optional(),
    condutor_nome: z.string().max(255).optional().nullable(),

    estado: z.enum(RESERVA_ESTADOS),

    // Modalidade — determina a taxa de IVA (rent-a-car vs TVDE)
    modalidade: z.enum(CONTRATO_MODALIDADES),

    valor_total: optionalNumber,
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
          cliente_id: z.string().uuid('Cliente inválido'),
          is_principal: z.boolean().default(false),
        })
      )
      .default([])
      .refine(
        (lista) => {
          const ids = lista.map((c) => c.cliente_id);
          return new Set(ids).size === ids.length;
        },
        { message: 'Cada cliente só pode aparecer uma vez como condutor.' }
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
        message: 'Cliente obrigatório quando a reserva é confirmada ou está em curso',
      });
    }
    if (!d.viatura_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['viatura_id'],
        message: 'Viatura obrigatória quando a reserva é confirmada ou está em curso',
      });
    }
    if (!d.estacao_entrega_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['estacao_entrega_id'],
        message: 'Estação de entrega obrigatória',
      });
    }
    if (!d.estacao_recolha_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['estacao_recolha_id'],
        message: 'Estação de recolha obrigatória',
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
