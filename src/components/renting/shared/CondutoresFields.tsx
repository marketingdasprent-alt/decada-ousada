import { useMemo, useState } from 'react';
import { useFieldArray, useFormContext, type FieldValues } from 'react-hook-form';
import { Info, Plus, Star, Trash2, UserCheck, UserPlus, Users } from 'lucide-react';

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

import type { ClienteComDocumentos } from '@/types/cliente';
import type { Motorista } from '@/types/motorista';

const normalizeForSearch = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Forma genérica do form pai. Em rent-a-car cada condutor tem
 * `cliente_id` preenchido; em TVDE tem `motorista_id`.
 */
interface CondutoresFieldsShape extends FieldValues {
  cliente_id?: string | null;
  condutores: Array<{
    cliente_id: string | null;
    motorista_id: string | null;
    is_principal: boolean;
  }>;
}

interface CondutoresFieldsProps {
  /** Regime do contrato/reserva — bifurca a lista de entidades. */
  regime: 'rent_a_car' | 'tvde';
  clientes: ClienteComDocumentos[];
  motoristas?: Motorista[];
  /** Label para o botão de "X também conduz" (rent-a-car). */
  clientePrincipalLabel?: string;
  /** Callback para abrir o dialog de criar novo cliente (só rent-a-car). */
  onCriarNovoCliente?: () => void;
  /** Callback para abrir o dialog de criar novo motorista (só TVDE). */
  onCriarNovoMotorista?: () => void;
}

export const CondutoresFields: React.FC<CondutoresFieldsProps> = ({
  regime,
  clientes,
  motoristas = [],
  clientePrincipalLabel = 'Cliente do contrato também conduz',
  onCriarNovoCliente,
  onCriarNovoMotorista,
}) => {
  const form = useFormContext<CondutoresFieldsShape>();
  const [adicionarOpen, setAdicionarOpen] = useState(false);
  const isTvde = regime === 'tvde';

  const clienteId = form.watch('cliente_id');
  const cliente = clienteId ? (clientes.find((c) => c.id === clienteId) ?? null) : null;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'condutores',
  });

  const clientesPorId = useMemo(() => {
    const m = new Map<string, ClienteComDocumentos>();
    clientes.forEach((c) => m.set(c.id, c));
    return m;
  }, [clientes]);

  const motoristasPorId = useMemo(() => {
    const m = new Map<string, Motorista>();
    motoristas.forEach((mo) => m.set(mo.id, mo));
    return m;
  }, [motoristas]);

  const disponiveis = useMemo(() => {
    if (isTvde) {
      const usados = new Set(fields.map((f) => f.motorista_id).filter(Boolean));
      return motoristas.filter((mo) => !usados.has(mo.id));
    }
    const usados = new Set(fields.map((f) => f.cliente_id).filter(Boolean));
    return clientes.filter((c) => !usados.has(c.id));
  }, [isTvde, clientes, motoristas, fields]);

  const handleAdicionar = (id: string) => {
    if (isTvde) {
      if (fields.some((f) => f.motorista_id === id)) return;
    } else {
      if (fields.some((f) => f.cliente_id === id)) return;
    }
    const isFirst = fields.length === 0;
    append({
      cliente_id: isTvde ? null : id,
      motorista_id: isTvde ? id : null,
      is_principal: isFirst,
    });
    setAdicionarOpen(false);
  };

  const handleAdicionarClientePrincipal = () => {
    if (!cliente) return;
    handleAdicionar(cliente.id);
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

  const clientePrincipalJaEhCondutor =
    cliente && !isTvde ? fields.some((f) => f.cliente_id === cliente.id) : false;

  const entidadeLabel = isTvde ? 'motorista' : 'cliente';
  const placeholderTexto = isTvde ? 'Pesquisar motorista...' : 'Pesquisar cliente...';
  const emptyTexto =
    disponiveis.length === 0
      ? `Todos os ${entidadeLabel}s já foram adicionados como condutores.`
      : `Nenhum ${entidadeLabel} encontrado.`;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between gap-2 pb-2 border-b mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Condutores Autorizados</h3>
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
                Adicionar Condutor
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[360px] p-0" align="start">
              <Command
                filter={(value, search) =>
                  normalizeForSearch(value).includes(normalizeForSearch(search)) ? 1 : 0
                }
              >
                <CommandInput placeholder={placeholderTexto} className="h-9" />
                <CommandList>
                  <CommandEmpty>{emptyTexto}</CommandEmpty>
                  <CommandGroup>
                    {isTvde
                      ? motoristas
                          .filter((mo) => !fields.some((f) => f.motorista_id === mo.id))
                          .map((mo) => (
                            <CommandItem
                              key={mo.id}
                              value={`${mo.nome} ${mo.nif ?? ''} ${mo.telefone ?? ''}`}
                              onSelect={() => handleAdicionar(mo.id)}
                              className="cursor-pointer flex flex-col items-start gap-0.5"
                            >
                              <span className="font-medium">
                                {mo.nome}
                                {mo.codigo ? (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    #{mo.codigo}
                                  </span>
                                ) : null}
                              </span>
                              {(mo.nif || mo.telefone) && (
                                <span className="text-xs text-muted-foreground">
                                  {mo.nif && <>NIF {mo.nif}</>}
                                  {mo.nif && mo.telefone && ' · '}
                                  {mo.telefone}
                                </span>
                              )}
                            </CommandItem>
                          ))
                      : clientes
                          .filter((c) => !fields.some((f) => f.cliente_id === c.id))
                          .map((c) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.nome} ${c.nif ?? ''} ${c.telefone ?? ''} ${c.codigo}`}
                              onSelect={() => handleAdicionar(c.id)}
                              className="cursor-pointer flex flex-col items-start gap-0.5"
                            >
                              <span className="font-medium">
                                {c.nome}
                                {c.codigo ? (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    #{c.codigo}
                                  </span>
                                ) : null}
                              </span>
                              {(c.nif || c.telefone) && (
                                <span className="text-xs text-muted-foreground">
                                  {c.nif && <>NIF {c.nif}</>}
                                  {c.nif && c.telefone && ' · '}
                                  {c.telefone}
                                </span>
                              )}
                            </CommandItem>
                          ))}
                  </CommandGroup>
                </CommandList>
                {isTvde && onCriarNovoMotorista && (
                  <div className="border-t p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-primary"
                      onClick={() => {
                        setAdicionarOpen(false);
                        onCriarNovoMotorista();
                      }}
                    >
                      <UserPlus className="h-4 w-4" />
                      Novo motorista
                    </Button>
                  </div>
                )}
                {!isTvde && onCriarNovoCliente && (
                  <div className="border-t p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-primary"
                      onClick={() => {
                        setAdicionarOpen(false);
                        onCriarNovoCliente();
                      }}
                    >
                      <UserPlus className="h-4 w-4" />
                      Novo cliente
                    </Button>
                  </div>
                )}
              </Command>
            </PopoverContent>
          </Popover>

          {cliente && !isTvde && !clientePrincipalJaEhCondutor && (
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
                    aria-label="Condutor Principal"
                  />
                  <span className="sr-only">Condutor Principal</span>
                </TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">Nenhum condutor adicionado.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Usa o botão <strong>Adicionar Condutor</strong> para seleccionar{' '}
                      {entidadeLabel}s.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                fields.map((field, idx) => {
                  const c = field.cliente_id ? clientesPorId.get(field.cliente_id) : null;
                  const mo = field.motorista_id ? motoristasPorId.get(field.motorista_id) : null;
                  const principal = field.is_principal;
                  const entidade = c ?? mo;
                  const idFallback = (field.cliente_id ?? field.motorista_id ?? '').slice(0, 8);
                  return (
                    <TableRow key={field.id} className={cn(principal && 'bg-amber-500/5')}>
                      <TableCell className="font-medium">
                        {entidade ? (
                          <>
                            {entidade.nome}
                            {'codigo' in entidade && entidade.codigo != null && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                #{entidade.codigo}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground italic">
                            {entidadeLabel.charAt(0).toUpperCase() + entidadeLabel.slice(1)}{' '}
                            removido ({idFallback}…)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{entidade?.nif ?? '—'}</TableCell>
                      <TableCell className="text-sm">{entidade?.telefone ?? '—'}</TableCell>
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
                          title="Remover condutor"
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
            Define um condutor principal — será o snapshot usado no contrato.
          </p>
        )}

        <FormField control={form.control} name="condutores" render={() => <FormMessage />} />
      </div>
    </div>
  );
};
