import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Check, Pencil, Plus, Star, Trash2, UserPlus, Users } from 'lucide-react';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { ReservaFormValues } from '../reservaDialog.schema';
import type { ClienteComDocumentos } from '@/types/cliente';

const SENTINEL_NONE = '__none__';

interface ReservaTabCondutoresProps {
  form: UseFormReturn<ReservaFormValues>;
  clientes: ClienteComDocumentos[];
}

export const ReservaTabCondutores: React.FC<ReservaTabCondutoresProps> = ({ form, clientes }) => {
  const [editingNome, setEditingNome] = useState(false);
  const [nomeBuffer, setNomeBuffer] = useState('');

  const clienteId = form.watch('cliente_id');
  const clienteNome = form.watch('cliente_nome');
  const condutorNome = form.watch('condutor_nome');

  const cliente = clienteId ? clientes.find((c) => c.id === clienteId) : null;

  const handleAssociarCliente = () => {
    if (!cliente) return;
    form.setValue('condutor_nome', cliente.nome);
  };

  const handleEditar = () => {
    setNomeBuffer(condutorNome ?? '');
    setEditingNome(true);
  };

  const handleSaveNome = () => {
    form.setValue('condutor_nome', nomeBuffer.trim() || null);
    setEditingNome(false);
  };

  const handleRemoverCondutor = () => {
    form.setValue('condutor_nome', null);
  };

  return (
    <div className="space-y-8">
      {/* Cliente */}
      <div>
        <div className="flex items-center gap-2 pb-2 border-b mb-4">
          <h3 className="text-base font-semibold">Cliente</h3>
          <span className="text-destructive text-sm">*</span>
        </div>

        <FormField
          control={form.control}
          name="cliente_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Cliente</FormLabel>
              <Select
                value={field.value ?? SENTINEL_NONE}
                onValueChange={(v) => {
                  const newId = v === SENTINEL_NONE ? null : v;
                  field.onChange(newId);
                  const cli = clientes.find((c) => c.id === newId);
                  form.setValue('cliente_nome', cli?.nome ?? '');
                }}
              >
                <FormControl>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Clique para escolher ou criar cliente..." />
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

        {cliente && (
          <div className="mt-3 p-3 rounded-md border bg-muted/20 text-sm grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="font-medium">{cliente.nome}</p>
            </div>
            {cliente.nif && (
              <div>
                <p className="text-xs text-muted-foreground">NIF</p>
                <p className="font-mono">{cliente.nif}</p>
              </div>
            )}
            {cliente.telefone && (
              <div>
                <p className="text-xs text-muted-foreground">Telemóvel</p>
                <p>{cliente.telefone}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Condutores */}
      <div>
        <div className="flex items-center gap-2 pb-2 border-b mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Condutores</h3>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Button
            type="button"
            size="sm"
            onClick={handleAssociarCliente}
            disabled={!cliente}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Associar Cliente
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleEditar}
            className="gap-2"
          >
            {condutorNome ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {condutorNome ? 'Editar Condutor' : 'Adicionar Condutor'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleRemoverCondutor}
            disabled={!condutorNome}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Remover
          </Button>
        </div>

        {editingNome && (
          <div className="mb-3 p-3 rounded-md border bg-muted/30 flex flex-col sm:flex-row gap-2">
            <Input
              autoFocus
              value={nomeBuffer}
              onChange={(e) => setNomeBuffer(e.target.value)}
              placeholder="Nome do condutor"
              className="bg-background flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveNome();
                } else if (e.key === 'Escape') {
                  setEditingNome(false);
                }
              }}
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleSaveNome}>
                Guardar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditingNome(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold uppercase tracking-wide">
                  Nome
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">
                  Origem
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-center w-32">
                  Principal
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-center w-20">
                  Activo
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {condutorNome ? (
                <TableRow>
                  <TableCell className="font-medium">{condutorNome}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {cliente && cliente.nome === condutorNome ? 'Cliente' : 'Manual'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Star className="h-4 w-4 mx-auto text-amber-500 fill-amber-500" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Check className="h-4 w-4 mx-auto text-emerald-500" />
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">Nenhum registo encontrado.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Usa os botões acima para associar o cliente ou adicionar um condutor manual.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground mt-2 italic">
          Por agora apenas é suportado um condutor por reserva. Suporte multi-condutor brevemente.
        </p>
      </div>

      {/* Snapshot do nome do cliente (oculto — usado pelo schema) */}
      <FormField
        control={form.control}
        name="cliente_nome"
        render={({ field }) => <input type="hidden" {...field} value={field.value ?? ''} />}
      />
    </div>
  );
};
