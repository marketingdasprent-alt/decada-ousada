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

import type { ReservaFormValues } from './reservaDialog.schema';
import type { ClienteComDocumentos } from '@/types/cliente';
import type { ViaturaBasic } from '@/hooks/useViaturas';
import type { Estacao } from '@/hooks/useEstacoes';

const SENTINEL_NONE = '__none__';

interface ReservaFormFieldsProps {
  form: UseFormReturn<ReservaFormValues>;
  clientes: ClienteComDocumentos[];
  viaturas: ViaturaBasic[];
  estacoes: Estacao[];
}

export const ReservaFormFields: React.FC<ReservaFormFieldsProps> = ({
  form,
  clientes,
  viaturas,
  estacoes,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="cliente_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              <Select
                value={field.value ?? SENTINEL_NONE}
                onValueChange={(v) => {
                  const newId = v === SENTINEL_NONE ? null : v;
                  field.onChange(newId);
                  const cli = clientes.find((c) => c.id === newId);
                  if (cli) form.setValue('cliente_nome', cli.nome);
                }}
              >
                <FormControl>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Sem cliente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={SENTINEL_NONE}>— Sem cliente —</SelectItem>
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
          name="viatura_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Viatura</FormLabel>
              <Select
                value={field.value ?? SENTINEL_NONE}
                onValueChange={(v) => {
                  const newId = v === SENTINEL_NONE ? null : v;
                  field.onChange(newId);
                  const via = viaturas.find((x) => x.id === newId);
                  if (via) form.setValue('matricula', via.matricula);
                }}
              >
                <FormControl>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Sem viatura atribuída" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={SENTINEL_NONE}>— Sem viatura —</SelectItem>
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
          name="data_inicio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data início</FormLabel>
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

        <FormField
          control={form.control}
          name="data_fim"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data fim</FormLabel>
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

        <FormField
          control={form.control}
          name="estacao_entrega_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estação entrega</FormLabel>
              <Select
                value={field.value ?? SENTINEL_NONE}
                onValueChange={(v) => field.onChange(v === SENTINEL_NONE ? null : v)}
              >
                <FormControl>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Sem estação" />
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
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="estacao_recolha_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estação recolha</FormLabel>
              <Select
                value={field.value ?? SENTINEL_NONE}
                onValueChange={(v) => field.onChange(v === SENTINEL_NONE ? null : v)}
              >
                <FormControl>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Sem estação" />
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
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="estado"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="em_curso">Em Curso</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="expirada">Expirada</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="valor_total"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor total (€)</FormLabel>
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
          name="grupo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grupo</FormLabel>
              <FormControl>
                <Input
                  className="bg-background"
                  {...field}
                  value={field.value ?? ''}
                  placeholder="ex.: Económico, SUV"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="condutor_nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Condutor (nome)</FormLabel>
              <FormControl>
                <Input className="bg-background" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="observacoes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Observações</FormLabel>
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
    </>
  );
};
