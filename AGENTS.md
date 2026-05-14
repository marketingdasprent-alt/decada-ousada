# AGENTS.md — Guia de Arquitectura e Convenções

> **Década Ousada / WeGest** · Sistema de gestão de frotas TVDE
> Stack: React 18 + TypeScript + Vite + Supabase + TanStack Query + Tailwind + Capacitor 8

Este documento é a **fonte de verdade** sobre como escrever código neste repositório. Aplica-se tanto a developers humanos como a agentes de IA. Quando há conflito entre este documento e o código existente legacy, **este documento prevalece** — código legacy deve ser refactorizado para seguir estas convenções gradualmente.

---

## Índice

**Arquitectura**
1. [Visão geral & fluxo](#1-visão-geral--fluxo)
2. [Estrutura de ficheiros](#2-estrutura-de-ficheiros)
3. [Convenções de nomenclatura](#3-convenções-de-nomenclatura)
4. [Convenções de código](#4-convenções-de-código)

**Padrões por camada**
5. [Padrão de páginas](#5-padrão-de-páginas)
6. [Padrão de componentes](#6-padrão-de-componentes)
7. [Hooks & server state com React Query](#7-hooks--server-state-com-react-query)
8. [Estado: local vs global vs server](#8-estado-local-vs-global-vs-server)
9. [Padrão de services (quando criar)](#9-padrão-de-services-quando-criar)

**Qualidade transversal**
10. [Validação com Zod](#10-validação-com-zod)
11. [Error handling](#11-error-handling)
12. [Tipos TypeScript](#12-tipos-typescript)
13. [UX patterns](#13-ux-patterns)
14. [Segurança](#14-segurança)
15. [Anti-patterns](#15-anti-patterns)

**Ambiente & tooling**
16. [Prettier](#16-prettier)
17. [ESLint](#17-eslint)
18. [Variáveis de ambiente](#18-variáveis-de-ambiente)
19. [Autenticação & permissões](#19-autenticação--permissões)
20. [Capacitor (mobile)](#20-capacitor-mobile)
21. [Package manager & scripts](#21-package-manager--scripts)

**Workflow**
22. [Boas práticas para AI Agents](#22-boas-práticas-para-ai-agents)
23. [Git commit messages](#23-git-commit-messages)
24. [Checklist antes de commit](#24-checklist-antes-de-commit)

---

## 1. Visão geral & fluxo

A aplicação segue uma arquitectura em camadas. **Cada camada tem uma responsabilidade única e só comunica com a camada imediatamente abaixo.**

```
┌─────────────────────────────────────────────────────┐
│  Page  (src/pages/*.tsx)                             │
│  Composição: layout + componentes + hooks            │
│  Sem lógica de dados, sem queries directas           │
└──────────────────────┬──────────────────────────────┘
                       │ consome
┌──────────────────────▼──────────────────────────────┐
│  Component  (src/components/<feature>/*.tsx)         │
│  UI + interacção. Recebe dados e callbacks por props │
└──────────────────────┬──────────────────────────────┘
                       │ usa
┌──────────────────────▼──────────────────────────────┐
│  Hook  (src/hooks/use*.ts)                           │
│  Server state via React Query (useQuery/useMutation) │
│  Encapsula queryKey, mutation, invalidation          │
└──────────────────────┬──────────────────────────────┘
                       │ chama
┌──────────────────────▼──────────────────────────────┐
│  Supabase client  (src/integrations/supabase/client) │
│  Auto-tipado via src/integrations/supabase/types.ts  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
                  ┌─────────┐
                  │Supabase │  ← RLS aplica-se aqui
                  └─────────┘
```

**Regras:**
- **Páginas** compõem componentes e hooks. Não fazem queries directas. Não contêm lógica de domínio.
- **Componentes** recebem dados via props. Podem usar hooks de UI (toast, navigation), mas idealmente não chamam Supabase directamente — se precisarem, é sinal de extrair um hook.
- **Hooks** são o ponto único de acesso ao server state. Cada feature de domínio tem o seu hook (`useMotoristas`, `useViaturas`, `useEmpresas`).
- **Mutations** preferencialmente também em hooks (ex.: `useCreateMotorista`, `useUpdateMotorista`). Quando inline num componente, manter pequeno e localizado.

> **Estado actual:** ~29 ficheiros já usam React Query. Mutations inline em componentes ainda existem (ex.: [EstacoesTab.tsx](src/components/admin/EstacoesTab.tsx)) — aceitável quando localizado, mas hooks dedicados são preferíveis para mutations reutilizáveis.

---

## 2. Estrutura de ficheiros

```
src/
├── App.tsx                          ← Providers + escolha web vs native
├── main.tsx                         ← Entry point
│
├── routes/                          ← Routing dividido por plataforma
│   ├── WebAppRoutes.tsx
│   └── NativeAppRoutes.tsx
│
├── pages/                           ← Top-level pages (flat)
│   ├── Dashboard.tsx, Login.tsx, Motoristas.tsx, ...
│   └── (sem subpastas por role)
│
├── components/
│   ├── ui/                          ← Shadcn/Radix primitives — NÃO EDITAR
│   ├── <feature>/                   ← admin, crm, marketing, financeiro,
│   │                                   contratos, viaturas, motoristas,
│   │                                   formularios, calendario, assistencia,
│   │                                   administrativo, navigation, reports,
│   │                                   auth, landing, motorista-portal
│   └── *.tsx                        ← Componentes partilhados (AppSidebar,
│                                       DashboardLayout, UpdateNotification, ...)
│
├── hooks/                           ← Custom hooks (server state + lógica)
│   └── use*.ts | use*.tsx
│
├── contexts/
│   ├── AuthContext.tsx              ← user, session, signOut
│   └── PermissionsContext.tsx       ← Permissões granulares
│
├── services/                        ← (Camada vazia/futura — ver §9)
│   └── supabase.ts                  ← Apenas re-export do client
│
├── types/                           ← Tipos de domínio escritos à mão
│   ├── motorista.ts, contrato.ts, lead.ts, ticket.ts,
│   │   convites.ts, index.ts
│
├── lib/                             ← Helpers de domínio/integração
│   ├── utils.ts                     ← cn() e helpers gerais
│   ├── native.ts, native-bootstrap.ts  ← Detecção Capacitor
│   ├── pt-validators.ts             ← Validações PT (NIF, IBAN, CP)
│   ├── cronPresets.ts, pixel.ts, viaturas.ts
│
├── utils/                           ← Helpers puros (sem dependências externas)
│   ├── formatters.ts, permissions.ts, promoteUser.ts,
│   └── generateContract.ts, generateFinanceiroPDF.ts,
│       generateDocumentFromTemplate.ts, recursoLabels.ts
│
└── integrations/
    └── supabase/
        ├── client.ts                ← Instância Supabase
        └── types.ts                 ← Auto-gerado — NÃO EDITAR
```

### Onde colocar código novo

| Tipo de código                       | Localização                                                            |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Nova página                          | `src/pages/NomeDaPagina.tsx` (flat)                                    |
| Componente de uma feature            | `src/components/<feature>/NomeDoComponente.tsx`                        |
| Componente partilhado entre features | `src/components/NomeDoComponente.tsx` (raiz)                           |
| Hook de domínio (server state)       | `src/hooks/useNomeDoDominio.ts`                                        |
| Hook de UI                           | `src/hooks/use-nome.tsx` (kebab — convenção Shadcn)                    |
| Tipo de domínio                      | `src/types/nomeDoDominio.ts` (e re-export em `src/types/index.ts`)     |
| Helper puro (formatadores, etc.)     | `src/utils/nomeDoHelper.ts`                                            |
| Helper com side-effects/integrações  | `src/lib/nome.ts`                                                      |
| Lógica de Supabase nova              | Criar/estender hook em `src/hooks/` — **não em componente nem página** |

> **`lib/` vs `utils/`:** A divisão actual é histórica e algo difusa. Regra prática: `utils/` para funções puras sem dependências externas; `lib/` para código que toca Capacitor, integrações ou domínio específico do projeto.

---

## 3. Convenções de nomenclatura

| Artefacto                          | Convenção                  | Exemplo                                       |
| ---------------------------------- | -------------------------- | --------------------------------------------- |
| Componente / página                | `PascalCase.tsx`           | `MotoristaCard.tsx`, `Dashboard.tsx`          |
| Hook de domínio                    | `camelCase.ts`             | `useMotoristas.ts`, `useViaturas.ts`          |
| Hook de UI (estilo Shadcn)         | `use-kebab.tsx`            | `use-toast.ts`, `use-mobile.tsx`              |
| Service                            | `camelCase.ts`             | `motoristaService.ts` (ver §9)                |
| Helper puro                        | `camelCase.ts`             | `formatters.ts`, `generateContract.ts`        |
| Helper com integração              | `kebab-case.ts`            | `pt-validators.ts`, `native-bootstrap.ts`     |
| Tipo de domínio                    | `camelCase.ts`             | `motorista.ts`, `contrato.ts`                 |
| Subpasta de feature                | `kebab-case` ou `lowercase`| `motorista-portal/`, `admin/`, `crm/`         |
| Variáveis / funções                | `camelCase`                | `motoristaAtivo`, `fetchMotoristas`           |
| Componentes React                  | `PascalCase`               | `MotoristaCard`, `EmpresaTable`               |
| Constantes                         | `SCREAMING_SNAKE_CASE`     | `MAX_RETRIES`, `ROUTES`, `ERROR_MESSAGES`     |
| Tipos / interfaces                 | `PascalCase`               | `Motorista`, `UseMotoristasOptions`           |
| Enums (preferir union types)       | `PascalCase` + valores ALL | `type Status = 'ativo' \| 'inativo'`          |
| `queryKey` (React Query)           | `[domínio, filtros?]`      | `['motoristas', { apenasAtivos: true }]`      |
| Boolean variables                  | `is/has/should/can` prefix | `isLoading`, `hasError`, `shouldRefetch`      |
| Event handlers                     | `handle<Event>`            | `handleSubmit`, `handleDelete`                |
| Props event handlers               | `on<Event>`                | `onSubmit`, `onDelete`                        |

### Vocabulário do domínio (PT-PT)

Usar sempre os termos do domínio em português, alinhados com as tabelas Supabase:
`motorista`, `viatura`, `empresa`, `contrato`, `recolha`, `troca`, `entrega`, `check-in`, `check-out`, `assistencia`, `ticket`, `lead`, `estacao`.

**Não misturar inglês e português** dentro do mesmo conceito. Ex.: usar `motorista` (não `driver`), `viatura` (não `vehicle`).

---

## 4. Convenções de código

```tsx
// ✅ Ordem de imports: 1) React, 2) externos, 3) @/ (internos), 4) relativos, 5) tipos
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useMotoristas } from '@/hooks/useMotoristas';
import { formatDate } from '@/utils/formatters';
import type { Motorista } from '@/types/motorista';

// ✅ Props sempre tipadas com interface explícita
interface MotoristaCardProps {
  motorista: Motorista;
  onEdit: (id: string) => void;
  isLoading?: boolean;
}

// ✅ Export nomeado + arrow function + React.FC opcional
export const MotoristaCard: React.FC<MotoristaCardProps> = ({
  motorista,
  onEdit,
  isLoading = false,
}) => {
  return <div className="p-4 border rounded-lg">{motorista.nome}</div>;
};
```

**Regras-chave:**
- Path alias `@/*` → `src/*`. **Nunca** usar paths relativos com mais de um `../`. Configurado em [vite.config.ts](vite.config.ts) e [tsconfig.json](tsconfig.json).
- Preferir `export const Foo = ...` (named export) a `export default`. Excepção: páginas em `src/pages/` podem usar default export para compatibilidade com lazy loading.
- Uma exportação principal por ficheiro (componente, hook, ou helper).
- Strings com aspas simples (Prettier aplica). JSX attributes com aspas duplas.

---

## 5. Padrão de páginas

**As páginas compõem — não fazem.** Uma página deve:
- Compor layout (`DashboardLayout`, etc.) + componentes de feature
- Consumir hooks de domínio (`useMotoristas`, etc.)
- Tratar routing/params (`useParams`, `useNavigate`)
- **Não** conter lógica de fetching directa
- **Não** ultrapassar ~150 linhas — extrair componentes ou hooks

```tsx
// ✅ src/pages/Motoristas.tsx
import { DashboardLayout } from '@/components/DashboardLayout';
import { MotoristasTable } from '@/components/motoristas/MotoristasTable';
import { MotoristasFiltros } from '@/components/motoristas/MotoristasFiltros';
import { useMotoristas } from '@/hooks/useMotoristas';
import { useState } from 'react';

export default function MotoristasPage() {
  const [apenasAtivos, setApenasAtivos] = useState(false);
  const { data: motoristas, isLoading, error } = useMotoristas({ apenasAtivos });

  return (
    <DashboardLayout>
      <MotoristasFiltros apenasAtivos={apenasAtivos} onChange={setApenasAtivos} />
      <MotoristasTable motoristas={motoristas ?? []} isLoading={isLoading} error={error} />
    </DashboardLayout>
  );
}
```

```tsx
// ❌ Página a fazer demasiado
export default function MotoristasPage() {
  const [data, setData] = useState([]);
  useEffect(() => {
    supabase.from('motoristas').select('*').then(({ data }) => setData(data));
  }, []);                              // queries directas — extrair para hook
  // + 200 linhas de filtros, tabela, modais, etc.
}
```

---

## 6. Padrão de componentes

**Limite indicativo:** ~150 linhas. Acima disso, dividir em sub-componentes na mesma feature folder.

```tsx
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Empresa } from '@/types';

interface EmpresaTableProps {
  empresas: Empresa[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
}

export const EmpresaTable: React.FC<EmpresaTableProps> = ({ empresas, isLoading, onDelete }) => {
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id);
      toast({ title: 'Empresa eliminada com sucesso' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (empresas.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">Sem empresas registadas.</p>;
  }

  return (
    <div className="space-y-2">
      {empresas.map((empresa) => (
        <div key={empresa.id} className="flex items-center justify-between p-3 border rounded">
          <span>{empresa.nome}</span>
          <Button variant="destructive" size="sm" onClick={() => handleDelete(empresa.id)}>
            Eliminar
          </Button>
        </div>
      ))}
    </div>
  );
};
```

Note os **três estados explícitos**: loading, empty, populated. Ver §13 (UX patterns).

---

## 7. Hooks & server state com React Query

**Toda a interacção com o Supabase passa por React Query.** É a fonte de verdade para cache, refetching, loading e error states.

QueryClient global configurado em [App.tsx](src/App.tsx) com `refetchOnWindowFocus: false`.

### 7.1 Hook de leitura (`useQuery`)

```typescript
// src/hooks/useMotoristas.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Motorista } from '@/types/motorista';

interface UseMotoristasOptions {
  apenasAtivos?: boolean;
  enabled?: boolean;
}

export function useMotoristas(options: UseMotoristasOptions = {}) {
  const { apenasAtivos = false, enabled = true } = options;

  return useQuery({
    queryKey: ['motoristas', { apenasAtivos }],
    queryFn: async () => {
      let q = supabase.from('motoristas_ativos').select('*').order('nome');
      if (apenasAtivos) q = q.eq('status_ativo', true);

      const { data, error } = await q;
      if (error) throw error;
      return data as Motorista[];
    },
    enabled,
  });
}
```

**Convenções:**
- `queryKey` é sempre `[domínio, filtrosObj?]`. O objeto de filtros vai como segundo elemento — permite invalidações granulares.
- `queryFn` lança o `error` do Supabase com `throw` — React Query trata-o.
- Retornar o objecto do `useQuery` directamente (`{ data, isLoading, error, refetch, ... }`). Não embrulhar.
- Opções tipadas como interface `Use<Nome>Options`.
- `enabled` aceito como opção para queries condicionais.

### 7.2 Hook de mutation (`useMutation`)

```typescript
// src/hooks/useCreateMotorista.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type MotoristaInsert = Database['public']['Tables']['motoristas']['Insert'];

export function useCreateMotorista() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (motorista: MotoristaInsert) => {
      const { data, error } = await supabase
        .from('motoristas')
        .insert(motorista)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motoristas'] });
      toast({ title: 'Motorista criado com sucesso' });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Erro inesperado';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    },
  });
}
```

**Uso no componente:**

```tsx
const createMutation = useCreateMotorista();

const handleSubmit = (data: MotoristaInput) => {
  createMutation.mutate(data);
};

<Button disabled={createMutation.isPending} onClick={...}>Guardar</Button>
```

### 7.3 Invalidação

```typescript
// Invalidar todas as queries de motoristas (qualquer filtro)
queryClient.invalidateQueries({ queryKey: ['motoristas'] });

// Invalidar uma combinação específica
queryClient.invalidateQueries({ queryKey: ['motoristas', { apenasAtivos: true }] });

// Após mutation que afecta múltiplos domínios
queryClient.invalidateQueries({ queryKey: ['motoristas'] });
queryClient.invalidateQueries({ queryKey: ['viaturas'] });
```

### 7.4 Quando NÃO usar React Query

- Estado puramente local de UI (toggle de modal, valor de input, tab activa) → `useState`
- Estado partilhado entre poucos componentes próximos → lifting state up ou prop drilling
- Estado global de auth/permissões/tema → Context (ver §8)

---

## 8. Estado: local vs global vs server

| Tipo de estado          | Ferramenta                  | Exemplos                                     |
| ----------------------- | --------------------------- | -------------------------------------------- |
| **Server state**        | React Query                 | Motoristas, viaturas, contratos, leads       |
| **Local UI state**      | `useState` / `useReducer`   | Modal aberto, tab activa, valor de filtro    |
| **Form state**          | `react-hook-form` + Zod     | Formulários complexos                        |
| **Global (raro, lento)**| Context API                 | Auth, permissões, tema                       |
| **URL state**           | `useSearchParams` / params  | Filtros partilháveis, paginação              |

### Regras

- **Não duplicar server state em `useState`.** Se vier do Supabase, vive no React Query cache. Acesso via `useQuery`.
- **Evitar criar Contexts.** O projeto tem dois Contexts ([AuthContext](src/contexts/AuthContext.tsx), [PermissionsContext](src/contexts/PermissionsContext.tsx)) e não precisa de mais. Antes de criar um novo Context, perguntar: "isto pode ser uma queryKey?"
- **Preferir URL state para filtros partilháveis** — utilizador pode bookmarkar/partilhar o estado.
- **Form state nunca em Context.** Usar `react-hook-form` local ao formulário.

---

## 9. Padrão de services (quando criar)

**Estado actual:** [src/services/supabase.ts](src/services/supabase.ts) é apenas um re-export do client. **Não existe camada de service.** Os hooks chamam o Supabase directamente. Isto é aceitável para a escala actual.

**Quando criar um service:** se a lógica de query/mutation for usada por **múltiplos hooks** ou tiver **transformações complexas** que merecem ser testadas isoladamente.

```typescript
// src/services/motoristaService.ts (exemplo aspiracional)
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Motorista = Database['public']['Tables']['motoristas']['Row'];
type MotoristaInsert = Database['public']['Tables']['motoristas']['Insert'];

export const motoristaService = {
  listarAtivos: async (): Promise<Motorista[]> => {
    const { data, error } = await supabase
      .from('motoristas')
      .select('*')
      .eq('status_ativo', true)
      .order('nome');
    if (error) throw error;
    return data;
  },

  criar: async (motorista: MotoristaInsert): Promise<Motorista> => {
    const { data, error } = await supabase
      .from('motoristas')
      .insert(motorista)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
```

Hooks consomem o service:

```typescript
return useQuery({
  queryKey: ['motoristas', 'ativos'],
  queryFn: motoristaService.listarAtivos,
});
```

> **Princípio:** o service **lança erros** (não retorna `{ data, error }`), e o React Query (no hook) é que captura. Não inventar tipos `ServiceResult<T>` — usar Promises tipadas.

---

## 10. Validação com Zod

```typescript
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { validarNIF } from '@/lib/pt-validators';

export const motoristaSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  apelido: z.string().min(2, 'Apelido deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefone: z.string().optional(),
  nif: z.string().refine(validarNIF, 'NIF inválido'),
  empresa_id: z.string().uuid('Empresa inválida'),
  ativo: z.boolean().default(true),
});

export type MotoristaInput = z.infer<typeof motoristaSchema>;

const form = useForm<MotoristaInput>({
  resolver: zodResolver(motoristaSchema),
  defaultValues: { ativo: true },
});
```

**Convenções:**
- **Schema é fonte de verdade do tipo.** Derivar TypeScript com `z.infer<typeof schema>`, não duplicar.
- Mensagens de erro em **português europeu**, descritivas.
- Validações PT (NIF, IBAN, código postal, telemóvel) usar helpers de [src/lib/pt-validators.ts](src/lib/pt-validators.ts).
- Validação no client é UX — **não substitui** validação no Supabase (ver §14).

---

## 11. Error handling

```tsx
// ✅ Padrão em handlers async
const handleSubmit = async (data: MotoristaInput) => {
  try {
    const { error } = await supabase.from('motoristas').insert(data);
    if (error) throw error;
    toast({ title: 'Motorista criado com sucesso' });
    navigate('/motoristas');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado';
    toast({ title: 'Erro', description: message, variant: 'destructive' });
  }
};
```

- `catch (error: unknown)` — **nunca** `any`.
- Reduzir a `string` com `error instanceof Error ? error.message : 'fallback'`.
- Em mutations com `useMutation`, usar `onError` em vez de try/catch no callsite.
- **Nunca silenciar erros** com `catch {}` vazio. Pelo menos `console.error(error)` ou propagar.

---

## 12. Tipos TypeScript

```typescript
// ✅ Tipos auto-gerados do Supabase
import type { Database } from '@/integrations/supabase/types';
type Motorista = Database['public']['Tables']['motoristas']['Row'];
type MotoristaInsert = Database['public']['Tables']['motoristas']['Insert'];
type MotoristaUpdate = Database['public']['Tables']['motoristas']['Update'];

// ✅ Tipos de domínio à mão (composições, derivações)
import type { Motorista } from '@/types/motorista';

// ✅ Generic para resultados paginados
interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

**Regras:**
- Para dados do Supabase, **sempre** usar os tipos auto-gerados em [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts). Para regenerar: `supabase gen types typescript ...`. **Nunca editar este ficheiro manualmente** (está no `ignores` do ESLint).
- Para composições de domínio (ex.: `Motorista` com `viatura_atual` populada), criar tipo em `src/types/<dominio>.ts`.
- `@typescript-eslint/no-explicit-any` está **off** no projeto, mas preferir sempre tipos específicos. `any` é dívida.
- Preferir **union types literais** a enums TypeScript: `type Status = 'ativo' | 'inativo' | 'suspenso'`.

---

## 13. UX patterns

Todos os componentes que mostram dados devem tratar **três estados explicitamente**: loading, empty, populated. E adicionar error quando aplicável.

### Loading

```tsx
import { Loader2 } from 'lucide-react';

if (isLoading) {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}
```

Para botões durante mutations: `disabled={mutation.isPending}` + ícone spinner.

### Empty

```tsx
if (data.length === 0) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p className="text-lg">Sem motoristas registados</p>
      <p className="text-sm mt-2">Adicione o primeiro motorista para começar.</p>
      <Button className="mt-4" onClick={...}>Adicionar motorista</Button>
    </div>
  );
}
```

### Error

```tsx
if (error) {
  return (
    <div className="text-destructive text-center py-8">
      Erro ao carregar motoristas: {error.message}
    </div>
  );
}
```

### Feedback após acções

| Acção                  | Feedback                                                   |
| ---------------------- | ---------------------------------------------------------- |
| Mutation com sucesso   | Toast verde (`title` apenas, sem `variant`)                |
| Mutation com erro      | Toast destructive (`variant: 'destructive'`) + descrição   |
| Loading de mutation    | Botão `disabled` + spinner inline                          |
| Após criar/editar      | Invalidate queries + toast + navigate (se aplicável)       |
| Após eliminar          | Confirmação prévia (`AlertDialog`) + invalidate + toast    |

### Componentes Toast disponíveis
- `useToast()` de [src/hooks/use-toast.ts](src/hooks/use-toast.ts) — sistema interno, baseado em Radix
- `<Sonner />` — também montado em [App.tsx](src/App.tsx), API `import { toast } from 'sonner'`

**Convenção:** usar `useToast` (do `use-toast.ts`) por defeito. Sonner reserva-se para notificações persistentes/empilhadas.

---

## 14. Segurança

> **Princípio fundamental:** o frontend é hostil. Toda a segurança real vive no Supabase via RLS.

### Row-Level Security (RLS)

- **Todas as tabelas** que contêm dados de utilizador devem ter RLS **activado**.
- Políticas devem assumir o pior caso: utilizador sem permissões, com sessão expirada, com tentativa de elevação de privilégio.
- Verificar RLS no Supabase Dashboard → Authentication → Policies.

### O que NUNCA fazer

```typescript
// ❌ Confiar em check de role só no frontend
if (user.role === 'admin') {
  return <DeleteAllButton />;     // RLS deve impedir delete server-side independentemente
}

// ❌ Expor service-role key no client
const supabase = createClient(url, SERVICE_ROLE_KEY); // SÓ em scripts/edge functions

// ❌ Assumir que validação Zod no client é suficiente
const data = motoristaSchema.parse(input);
await supabase.from('motoristas').insert(data);  // Validar TAMBÉM no Supabase via constraints + RLS

// ❌ Lógica de autorização em hooks/componentes
const { data } = await supabase.from('admins').select('*');
if (data.find(a => a.id === user.id)) { /* ... */ }  // Usar RLS + has_role()
```

### Boas práticas

- **Permissões granulares** vivem em tabelas Supabase (`user_permissions`, `roles`) e são aplicadas via RLS + functions (`auth.uid()`, `has_role()`).
- O hook [usePermissions](src/hooks/usePermissions.ts) e o [PermissionsContext](src/contexts/PermissionsContext.tsx) servem **apenas para UX** (esconder botões). A autorização real é no Supabase.
- Para operações sensíveis (delete em massa, mudança de role), preferir **Edge Functions** com service-role + checks explícitos.
- Service-role key **nunca** em variável `VITE_*` (essas são bundled no client). Usar `SUPABASE_SERVICE_ROLE_KEY` apenas em Edge Functions e workflows CI.
- Logs e erros do Supabase podem revelar estrutura — não os mostrar literalmente ao utilizador final. Usar mensagens amigáveis em produção.

### Variáveis de ambiente

- `VITE_*` é **público** (bundled no client). Só usar para anon key e URL.
- `SUPABASE_SERVICE_ROLE_KEY` **nunca** com prefixo `VITE_`.
- `.env.local` está no `.gitignore`. Confirmar antes de cada commit que não foi accidentalmente adicionado.

---

## 15. Anti-patterns

A lista do que **não fazer**, com a alternativa correcta.

| Anti-pattern                                       | Em vez disso                                                  |
| -------------------------------------------------- | ------------------------------------------------------------- |
| Query do Supabase dentro do JSX / inline em página | Extrair para hook `useFeature()` com React Query              |
| `useState + useEffect` para fetch                  | `useQuery` do React Query                                     |
| `any` por preguiça                                 | Tipo do Supabase auto-gerado ou type custom                   |
| Componente com 500+ linhas                         | Dividir em sub-componentes na feature folder                  |
| Context para server state                          | React Query — cache, refetch, invalidation já incluídos       |
| Context novo para cada feature                     | Hook + React Query; Context só para auth/permissões/tema     |
| `console.log` em código merged                     | Remover, ou usar `console.warn`/`error` com contexto          |
| `import { foo } from '../../../utils/foo'`         | `import { foo } from '@/utils/foo'`                           |
| Validação só no client                             | Validar **também** no Supabase (constraints + RLS)            |
| Service-role key no client                         | Edge Function com service-role + checks                       |
| `catch {}` vazio                                   | Log do erro + toast ao utilizador, ou propagar                |
| Misturar `driver`/`motorista` no mesmo conceito    | Escolher um (motorista) e usar consistentemente               |
| Lógica de fetch repetida em vários componentes     | Extrair para hook partilhado                                  |
| Estado de loading manual quando há `useQuery`      | Usar `isLoading`/`isPending` do próprio hook                  |
| Mutation sem `invalidateQueries`                   | Sempre invalidar as queries afectadas no `onSuccess`          |
| Edit de `src/integrations/supabase/types.ts`       | Regenerar com `supabase gen types typescript`                 |
| Hardcoded routes em strings                        | Constantes centralizadas (criar `src/lib/routes.ts` quando os routes crescerem) |
| Default export para componentes não-página         | Named export                                                  |
| Tipo derivado de outro tipo duplicado à mão        | `z.infer<typeof schema>` ou `Pick<T, K>` / `Omit<T, K>`       |

---

## 16. Prettier

Configuração em [.prettierrc](.prettierrc):

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "es5",
  "tabWidth": 2,
  "bracketSameLine": false
}
```

```bash
pnpm format         # Auto-format src/**/*.{ts,tsx}
pnpm format:check   # Verificação no CI (não altera ficheiros)
```

---

## 17. ESLint

Configuração em [eslint.config.js](eslint.config.js).

| Regra                                  | Nível   | Notas                                                 |
| -------------------------------------- | ------- | ----------------------------------------------------- |
| `@typescript-eslint/no-explicit-any`   | **off** | Permitido pela escala/integração com Supabase dinâmico|
| `@typescript-eslint/no-unused-vars`    | **off** | Permitido (legacy)                                    |
| `@typescript-eslint/no-require-imports`| off     | `require()` em `tailwind.config.ts` é legítimo        |
| `@typescript-eslint/no-empty-object-type`| off   | Padrão Shadcn (interface estende `Props`)             |
| `react-hooks/rules-of-hooks`           | warn    | Rebaixado de error — corrigir gradualmente            |
| `react-hooks/exhaustive-deps`          | warn    | Avisa sobre deps em falta                             |
| `react-refresh/only-export-components` | warn    | HMR                                                   |
| `prefer-const`                         | warn    |                                                       |
| `@typescript-eslint/ban-ts-comment`    | warn    | Preferir `@ts-expect-error` com motivo                |
| `no-useless-escape`                    | off     | Regexes PT podem ter escapes intencionais             |

**Ignorados:** `dist/`, `android/`, `ios/`, `supabase/` (Edge Functions Deno), `*.js` na raiz, `src/integrations/supabase/types.ts`, `.claude/`.

```bash
pnpm lint                  # Verificar
pnpm exec eslint . --fix   # Auto-fix (não há script dedicado)
```

> **Princípio:** apesar de várias regras estarem em `warn`/`off` por motivos históricos, **código novo deve passar como se fossem `error`**. As regras estão laxistas para não bloquear o CI em código legacy.

---

## 18. Variáveis de ambiente

### Setup local

```bash
cp .env.example .env.local      # se existir
# Editar .env.local — NUNCA commitar
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx
```

### Origem por ambiente

| Ambiente      | Origem                                    | Disparo            |
| ------------- | ----------------------------------------- | ------------------ |
| Local dev     | `.env.local` (git-ignored)                | `pnpm dev`         |
| CI (Actions)  | GitHub Secrets                            | Workflows em [.github/workflows/](.github/workflows/) |
| Produção web  | Vercel Dashboard → Environment Variables  | Deploy automático  |

### Nomes obrigatórios

- `VITE_SUPABASE_URL` — URL do projeto Supabase (público — bundled no client)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Anon/publishable key (público — bundled no client)
- `SUPABASE_SERVICE_ROLE_KEY` — **Apenas Edge Functions e CI**. **Nunca** prefixar com `VITE_`.

### Acesso

```typescript
// ✅ Frontend (qualquer ficheiro em src/)
const url = import.meta.env.VITE_SUPABASE_URL;

// ❌ Service-role no frontend
const secret = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;   // Não existe — e não devia
```

---

## 19. Autenticação & permissões

Fluxo:

```
App.tsx
  └── <AuthProvider>            (src/contexts/AuthContext.tsx)
        ├── user, session, loading, signOut
        └── Sync da sessão Supabase + listener onAuthStateChange
              └── <PermissionsProvider>   (src/contexts/PermissionsContext.tsx)
                    └── Permissões granulares (vindas do Supabase)
```

API dos contexts:

```typescript
const { user, session, loading, signOut } = useAuth();
const { ... } = usePermissions();           // ver implementação para shape exacto
```

**Hooks de autorização** em [src/hooks/](src/hooks/):
- [useRBAC](src/hooks/useRBAC.ts) — verificações de role
- [useAdmin](src/hooks/useAdmin.ts) — shortcut para role admin
- [usePermissions](src/hooks/usePermissions.ts) — permissões granulares

> Estes hooks servem **UX** (esconder botões, redirecionar). **A autorização real é via RLS no Supabase** — ver §14.

---

## 20. Capacitor (mobile)

Duas plataformas servidas a partir do mesmo bundle:

- **Web** (Vercel) → [src/routes/WebAppRoutes.tsx](src/routes/WebAppRoutes.tsx)
- **Native** (Android/iOS via Capacitor) → [src/routes/NativeAppRoutes.tsx](src/routes/NativeAppRoutes.tsx)

A escolha é feita em [App.tsx](src/App.tsx) via `isNativeDriverOnlyMode()` ([src/lib/native.ts](src/lib/native.ts)).

```bash
# Sync após mudar código web
pnpm build
npx cap sync android        # ou: npx cap sync ios

# Abrir o projeto nativo
npx cap open android
npx cap open ios
```

**Releases CI/CD:**
- [.github/workflows/android-release.yml](.github/workflows/android-release.yml) — trigger por tag `android-v*` ou manual
- [.github/workflows/ios-release.yml](.github/workflows/ios-release.yml) — trigger por tag `ios-v*` ou manual (envia para TestFlight)

Config Capacitor: [capacitor.config.ts](capacitor.config.ts).

> **Nota:** o app ID `app.lovable.dcede7f4...` em [ios-release.yml](.github/workflows/ios-release.yml) é legacy da fase Lovable e mantido por compatibilidade com a App Store. Não confundir com o Android `applicationId` (`com.wegest.myapp`).

---

## 21. Package manager & scripts

O projeto usa **pnpm** (não npm). Versão travada em [package.json](package.json) via `packageManager: pnpm@11.0.9`.

```bash
# Instalar pnpm (uma vez, globalmente)
npm install -g pnpm

# Operações comuns
pnpm install                 # ou --frozen-lockfile em CI
pnpm add <pkg>
pnpm add -D <pkg>            # devDependency
pnpm remove <pkg>
```

### Scripts ([package.json](package.json))

```bash
pnpm dev               # Vite dev server
pnpm build             # Build de produção (output em /dist)
pnpm build:dev         # Build em modo development
pnpm preview           # Preview do build
pnpm lint              # ESLint
pnpm format            # Prettier (escrita)
pnpm format:check      # Prettier (verificação CI)
pnpm type-check        # tsc --noEmit
```

> Não há scripts de teste. Adicionar Vitest está em backlog.

### Build scripts aprovados

`@swc/core` e `esbuild` precisam de executar postinstall scripts (binários nativos). Aprovados em [pnpm-workspace.yaml](pnpm-workspace.yaml). Se adicionares deps que precisem de scripts e o pnpm bloquear, juntá-los à `allowBuilds`.

---

## 22. Boas práticas para AI Agents

Quando trabalhares neste repositório como agente:

### Antes de escrever código
1. **Lê este documento na íntegra.** Especialmente §1, §3, §15.
2. **Verifica padrões existentes** antes de criar algo novo — grep por feature semelhante (`useViaturas`, `MotoristasTable`, etc.).
3. **Confirma localização correcta** (§2). Hooks em `src/hooks/`, tipos em `src/types/`, etc.
4. **Confere se o tipo já existe** em `src/integrations/supabase/types.ts` (auto-gerado) ou `src/types/`.

### Ao criar código
1. **Hooks para tudo o que toca Supabase.** Nunca queries directas em pages/components (§1, §7).
2. **React Query é obrigatório** para server state. Não criar `useState + useEffect` para fetching (§7).
3. **Props sempre tipadas** com interface. Sem `any` em código novo (§4, §12).
4. **Validação Zod com `z.infer`** — não duplicar tipos (§10).
5. **3 estados em listas:** loading, empty, populated (+ error quando há). Ver §13.
6. **Mutations sempre invalidam queries** afectadas (§7.3).
7. **Mensagens ao utilizador em PT-PT.** Usar vocabulário do domínio (§3).
8. **Path alias `@/`** — nunca `../../`.

### Ao modificar código
1. **Não introduzir regressões em padrões.** Se o ficheiro usa React Query, manter React Query.
2. **Não converter named exports em default** sem motivo (e vice-versa).
3. **Não tocar em `src/integrations/supabase/types.ts`** (auto-gerado).
4. **Não tocar em `src/components/ui/`** sem necessidade (são Shadcn primitives).
5. **Não criar Contexts novos** sem justificação forte (§8).
6. **Não adicionar deps** sem confirmar com o utilizador.

### Antes de declarar tarefa concluída
1. `pnpm type-check` passa.
2. `pnpm lint` passa (warnings tolerados, errors não).
3. `pnpm build` passa.
4. Se houver UI nova, **testar manualmente** os 3 estados (loading, empty, populated) — não confiar só em type-check.
5. Tocou em rotas? Confirmar que ambos [WebAppRoutes](src/routes/WebAppRoutes.tsx) e [NativeAppRoutes](src/routes/NativeAppRoutes.tsx) estão consistentes (ou justificadamente diferentes).
6. Tocou em Supabase? **Verificar RLS** das tabelas afectadas (§14).

### Não fazer
- Não inventar scripts que não existem (`test`, `validate`, `ci`, ...).
- Não assumir Vitest/Playwright instalados — não estão.
- Não criar ficheiros `*.test.ts` sem primeiro adicionar Vitest.
- Não criar pastas `src/modules/` — a estrutura é a do §2.
- Não criar `ProtectedRoute`, `GlobalErrorBoundary` ou `apiClient.ts` — não existem por design actual.

---

## 23. Git commit messages

Formato: `tipo: descrição curta em português`

```
feat:     # Nova funcionalidade
fix:      # Correção de bug
refactor: # Refatoração (sem nova feature nem bug fix)
docs:     # Só documentação
style:    # Formatação, sem lógica
chore:    # Dependências, configuração, CI
perf:     # Melhoria de performance
```

Exemplos:

```bash
git commit -m "feat: adicionar página de gestão de ausências"
git commit -m "fix: corrigir redirect após login admin"
git commit -m "refactor: extrair lógica de permissões para hook"
git commit -m "chore: migrar de npm para pnpm"
git commit -m "perf: lazy-load página de Marketing"
```

Commit com corpo para mudanças maiores:

```bash
git commit -m "feat: implementar AuthContext centralizado

- Criar contexto com user, session, signOut
- Integrar AuthProvider em App.tsx
- Refatorar Login.tsx para usar useAuth()"
```

---

## 24. Checklist antes de commit

```
OBRIGATÓRIO:
[ ] pnpm type-check        → sem erros TypeScript
[ ] pnpm lint              → sem errors ESLint (warnings tolerados)
[ ] pnpm format:check      → código formatado
[ ] pnpm build             → build passa
[ ] Sem console.log soltos (preferir console.warn / console.error com contexto)
[ ] Sem credenciais, tokens ou secrets no código
[ ] Variáveis de ambiente via import.meta.env.VITE_*
[ ] Service-role key nunca no client
[ ] @ts-ignore substituído por @ts-expect-error com motivo

BOM PRATICAR:
[ ] Props tipadas com interface
[ ] Hooks com queryKey consistente (`[domínio, filtros?]`)
[ ] Mutations invalidam as queries afectadas
[ ] 3 estados explícitos em listas (loading, empty, populated)
[ ] Error states tratados com toast variant=destructive
[ ] Componente ≤ ~150 linhas
[ ] Página apenas compõe — sem queries directas
[ ] Path aliases @/ em vez de paths relativos longos
[ ] Vocabulário PT-PT consistente (motorista, viatura, empresa, ...)
[ ] Sem novos Contexts (a menos que justificado)
[ ] RLS verificado para tabelas afectadas
```

---

_Última actualização: 2026-05-14 · Projeto: WeGest (Década Ousada)_
