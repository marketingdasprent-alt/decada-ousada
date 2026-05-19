import type { UseFormReturn } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { ContratoFormValues } from './contratoForm.schema';
import type { ClienteComDocumentos } from '@/types/cliente';
import type { ViaturaBasic } from '@/hooks/useViaturas';
import type { Estacao } from '@/hooks/useEstacoes';

const SENTINEL_NONE = '__none__';

interface ContratoFormSecoesProps {
  form: UseFormReturn<ContratoFormValues>;
  clientes: ClienteComDocumentos[];
  viaturas: ViaturaBasic[];
  estacoes: Estacao[];
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b border-border/50 pb-2 mb-3">
    {children}
  </h3>
);

const EstacaoSelect: React.FC<{
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  estacoes: Estacao[];
  placeholder?: string;
}> = ({ value, onChange, estacoes, placeholder = 'Sem estação' }) => (
  <Select
    value={value ?? SENTINEL_NONE}
    onValueChange={(v) => onChange(v === SENTINEL_NONE ? null : v)}
  >
    <FormControl>
      <SelectTrigger className="bg-background">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
    </FormControl>
    <SelectContent>
      <SelectItem value={SENTINEL_NONE}>— Sem estação —</SelectItem>
      {estacoes.map((e) => (
        <SelectItem key={e.id} value={e.id}>
          {e.nome}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const ContratoFormSecoes: React.FC<ContratoFormSecoesProps> = ({
  form,
  clientes,
  viaturas,
  estacoes,
}) => {
  return (
    <div className="space-y-6">
      {/* ───── ENTREGA + RECOLHA ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <SectionTitle>Entrega</SectionTitle>
          <div className="space-y-3">
            <FormField
              control={form.control}
              name="estacao_entrega_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estação Início</FormLabel>
                  <EstacaoSelect
                    value={field.value}
                    onChange={field.onChange}
                    estacoes={estacoes}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="data_inicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Início *</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      className="bg-background"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div>
          <SectionTitle>Recolha</SectionTitle>
          <div className="space-y-3">
            <FormField
              control={form.control}
              name="estacao_recolha_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estação Fim</FormLabel>
                  <EstacaoSelect
                    value={field.value}
                    onChange={field.onChange}
                    estacoes={estacoes}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="data_fim"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Fim *</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      className="bg-background"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>

      {/* ───── VIATURA ───── */}
      <div>
        <SectionTitle>Viatura</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="estacao_origem_viatura_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estação Origem Viatura</FormLabel>
                <EstacaoSelect value={field.value} onChange={field.onChange} estacoes={estacoes} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="viatura_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Viatura *</FormLabel>
                <Select
                  value={field.value || SENTINEL_NONE}
                  onValueChange={(v) => {
                    const newId = v === SENTINEL_NONE ? '' : v;
                    field.onChange(newId);
                    const via = viaturas.find((x) => x.id === newId);
                    if (via) form.setValue('matricula', via.matricula);
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Seleccione viatura" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={SENTINEL_NONE} disabled>
                      — Seleccione —
                    </SelectItem>
                    {viaturas.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.matricula} — {v.marca} {v.modelo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="grupo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grupo</FormLabel>
                <FormControl>
                  <Input
                    className="bg-background"
                    {...field}
                    value={field.value ?? ''}
                    placeholder="ex.: C4 (ou similar)"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* ───── GERAL ───── */}
      <div>
        <SectionTitle>Geral</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="cliente_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente *</FormLabel>
                <Select
                  value={field.value || SENTINEL_NONE}
                  onValueChange={(v) => field.onChange(v === SENTINEL_NONE ? '' : v)}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Seleccione cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={SENTINEL_NONE} disabled>
                      — Seleccione —
                    </SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} {c.codigo ? `(#${c.codigo})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="origem"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origem</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sistema">Sistema</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="balcao">Balcão</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estado_operacional"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado Operacional</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="em_curso">Em Curso</SelectItem>
                    <SelectItem value="devolvido">Devolvido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estado_financeiro"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado Financeiro</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="facturado">Facturado</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="anulado">Anulado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tarifa_diaria"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tarifa diária (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="bg-background"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valor_total_manual"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor total manual (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="bg-background"
                    placeholder="Opcional — sobrepõe cálculo"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="desconto_percentagem"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Desconto (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="bg-background"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="taxa_iva"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IVA (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="bg-background"
                    value={field.value ?? 23}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="voucher_codigo"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Voucher</FormLabel>
                <FormControl>
                  <Input
                    className="bg-background"
                    {...field}
                    value={field.value ?? ''}
                    placeholder="Código promocional"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* ───── INFORMAÇÃO ADICIONAL ───── */}
      <div>
        <SectionTitle>Informação Adicional</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="numero_processo"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Nº Processo / Referência</FormLabel>
                <FormControl>
                  <Input className="bg-background" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="voo_referencia"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Referência de Voo</FormLabel>
                <FormControl>
                  <Input
                    className="bg-background"
                    {...field}
                    value={field.value ?? ''}
                    placeholder="ex.: TP1234 chegada / TP5678 partida"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="local_entrega"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Local Entrega</FormLabel>
                <FormControl>
                  <Input
                    className="bg-background"
                    {...field}
                    value={field.value ?? ''}
                    placeholder="ex.: Hotel XYZ"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="local_recolha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Local Recolha</FormLabel>
                <FormControl>
                  <Input className="bg-background" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="comentarios_entrega"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comentários Entrega</FormLabel>
                <FormControl>
                  <Textarea
                    className="bg-background min-h-[80px]"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="comentarios_recolha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comentários Recolha</FormLabel>
                <FormControl>
                  <Textarea
                    className="bg-background min-h-[80px]"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="observacoes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Observações (apresentadas no relatório)</FormLabel>
                <FormControl>
                  <Textarea
                    className="bg-background min-h-[80px]"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};
