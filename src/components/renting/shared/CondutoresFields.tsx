import { useMemo, useState } from 'react';
import { useFieldArray, useFormContext, type FieldValues } from 'react-hook-form';
import { Info, Plus, Star, Trash2, UserCheck, Users } from 'lucide-react';

import { FormField, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const normalizeForSearch = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Pessoa que pode ser condutor — cliente (rent-a-car) ou motorista (TVDE). */
export interface CondutorPessoa {
  id: string;
  nome: string;
  nif?: string | null;
  telefone?: string | null;
  codigo?: string | number | null;
}

/**
 * Campos partilhados de Condutores entre Reserva e Contrato.
 * Usa useFormContext — o form pai precisa de ter:
 *   - condutores: { pessoa_id: string; is_principal: boolean }[]
 *   - cliente_id: string | null (opcional — atalho "também conduz")
 */
interface CondutoresFieldsShape extends FieldValues {
  cliente_id: string | null;
  condutores: { pessoa_id: string; is_principal: boolean }[];
}

interface CondutoresFieldsProps {
  /** Lista de pessoas a escolher — clientes ou motoristas. */
  pessoas: CondutorPessoa[];
  /** 'cliente' (rent-a-car) ou 'motorista' (TVDE). */
  tipo?: 'cliente' | 'motorista';
  /** Label do atalho "X também conduz" — só usado em tipo='cliente'. */
  clientePrincipalLabel?: string;
}

export const CondutoresFields: React.FC<CondutoresFieldsProps> = ({
  pessoas,
  tipo = 'cliente',
  clientePrincipalLabel = 'Cliente do contrato também conduz',
}) => {
  const form = useFormContext<CondutoresFieldsShape>();
  const [adicionarOpen, setAdicionarOpen] = useState(false);

  const isMotorista = tipo === 'motorista';
  const termo = isMotorista ? 'Motorista' : 'Condutor';
  const titulo = isMotorista ? 'Motoristas' : 'Condutores Autorizados';

  const clienteId = form.watch('cliente_id');
  const cliente =
    !isMotorista && clienteId ? (pessoas.find((p) => p.id === clienteId) ?? null) : null;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'condutores',
  });

  const pessoasPorId = useMemo(() => {
    const m = new Map<string, CondutorPessoa>();
    pessoas.forEach((p) => m.set(p.id, p));
    return m;
  }, [pessoas]);

  const pessoasDisponiveis = useMemo(() => {
    const usados = new Set(fields.map((f) => f.pessoa_id));
    return pessoas.filter((p) => !usados.has(p.id));
  }, [pessoas, fields]);

  const handleAdicionar = (novoId: string) => {
    if (fields.some((f) => f.pessoa_id === novoId)) return;
    const isFirst = fields.length === 0;
    append({ pessoa_id: novoId, is_principal: isFirst });
    setAdicionarOpen(false);
  };

  const handleAdicionarClientePrincipal = () => {
    if (cliente) handleAdicionar(cliente.id);
  };

  const handleDefinirPrincipal = (idx: number) => {
    const todos = form.getValues('condutores');
    form.setValue(
      'condutores',
      todos.map((c, i) => ({ ...c, is_principal: i === idx })),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const handleRemover = (idx: number) => {
    const removendoPrincipal = fields[idx]?.is_principal;
    remove(idx);
    if (removendoPrincipal) {
      setTimeout(() => {
        const restantes = form.getValues('condutores');
        if (restantes.length > 0 && !restantes.some((c) => c.is_principal)) {
          form.setValue(
            'condutores',
            restantes.map((c, i) => ({ ...c, is_principal: i === 0 })),
            { shouldDirty: true }
          );
        }
      }, 0);
    }
  };

  const clientePrincipalJaEhCondutor = cliente
    ? fields.some((f) => f.pessoa_id === cliente.id)
    : false;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between gap-2 pb-2 border-b mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">{titulo}</h3>
            {fields.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-semibold">
                {fields.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Popover open={adicionarOpen} onOpenChange={setAdicionarOpen} modal={false}>
            <PopoverTrigger asChild>
              <Button type="button" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar {termo}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[360px] p-0" align="start">
              <Command
                filter={(value, search) =>
                  normalizeForSearch(value).includes(normalizeForSearch(search)) ? 1 : 0
                }
              >
                <CommandInput
                  placeholder={`Pesquisar ${isMotorista ? 'motorista' : 'cliente'}...`}
                  className="h-9"
                />
                <CommandList>
                  <CommandEmpty>
                    {pessoasDisponiveis.length === 0
                      ? `Todos já foram adicionados.`
                      : `Nenhum ${isMotorista ? 'motorista' : 'cliente'} encontrado.`}
                  </CommandEmpty>
                  <CommandGroup>
                    {pessoasDisponiveis.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`${p.nome} ${p.nif ?? ''} ${p.telefone ?? ''} ${p.codigo ?? ''}`}
                        onSelect={() => handleAdicionar(p.id)}
                        className="cursor-pointer flex flex-col items-start gap-0.5"
                      >
                        <span className="font-medium">
                          {p.nome}
                          {p.codigo ? (
                            <span className="ml-1 text-xs text-muted-foreground">#{p.codigo}</span>
                          ) : null}
                        </span>
                        {(p.nif || p.telefone) && (
                          <span className="text-xs text-muted-foreground">
                            {p.nif && <>NIF {p.nif}</>}
                            {p.nif && p.telefone && ' · '}
                            {p.telefone}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {cliente && !clientePrincipalJaEhCondutor && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAdicionarClientePrincipal}
              className="gap-2"
            >
              <UserCheck className="h-4 w-4" />
              {clientePrincipalLabel}
            </Button>
          )}
        </div>

        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold uppercase tracking-wide">
                  Nome
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide w-36">
                  NIF
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide w-36">
                  Telemóvel
                </TableHead>
                <TableHead className="text-center w-36">
                  <Star
                    className="h-4 w-4 inline-block text-amber-500"
                    aria-label={`${termo} Principal`}
                  />
                  <span className="sr-only">{termo} Principal</span>
                </TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nenhum {termo.toLowerCase()} adicionado.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Usa o botão <strong>Adicionar {termo}</strong> para seleccionar quem pode
                      conduzir a viatura.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                fields.map((field, idx) => {
                  const p = pessoasPorId.get(field.pessoa_id);
                  const principal = field.is_principal;
                  return (
                    <TableRow key={field.id} className={cn(principal && 'bg-amber-500/5')}>
                      <TableCell className="font-medium">
                        {p ? (
                          <>
                            {p.nome}
                            {p.codigo && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                #{p.codigo}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground italic">
                            {termo} removido ({field.pessoa_id.slice(0, 8)}…)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p?.nif ?? '—'}</TableCell>
                      <TableCell className="text-sm">{p?.telefone ?? '—'}</TableCell>
                      <TableCell className="text-center">
                        {principal ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            Principal
                          </span>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDefinirPrincipal(idx)}
                            className="h-7 text-xs"
                          >
                            <Star className="h-3.5 w-3.5 mr-1" />
                            Marcar
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemover(idx)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title={`Remover ${termo.toLowerCase()}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {fields.length > 0 && !fields.some((f) => f.is_principal) && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
            <Info className="h-3.5 w-3.5" />
            Define um {termo.toLowerCase()} principal — será o snapshot usado no contrato.
          </p>
        )}

        <FormField control={form.control} name="condutores" render={() => <FormMessage />} />
      </div>
    </div>
  );
};
