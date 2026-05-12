/** Shape retornado diretamente da tabela assistencia_tickets (sem joins) */
export interface TicketRaw {
  id: string;
  numero: number;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  status: string;
  created_at: string;
  updated_at: string;
  data_estimada: string | null;
  data_resolucao: string | null;
  viatura_id: string;
  motorista_id: string | null;
  categoria_id: string | null;
  criado_por: string | null;
  atribuido_a: string | null;
  km_inicio: number | null;
  km_fim: number | null;
  combustivel_inicio: string | null;
  combustivel_fim: string | null;
  valor_reparacao: number | null;
  cobrar_motorista: boolean;
  viatura_substituta_id: string | null;
}

/** Shape enriquecido com joins (usado nas listagens de Assistência) */
export interface TicketEnriched {
  id: string;
  numero: number;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  status: string;
  created_at: string;
  data_estimada: string | null;
  atribuido_a: string | null;
  viatura: {
    id: string;
    matricula: string;
    marca: string;
    modelo: string;
  } | null;
  motorista: {
    id: string;
    nome: string;
  } | null;
  categoria: {
    id: string;
    nome: string;
    cor: string;
  } | null;
  criador: {
    id: string;
    nome: string;
  } | null;
}

/** Shape mínimo para listagens do motorista (MeusTickets) */
export interface TicketListItem {
  id: string;
  numero: number;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  status: string;
  created_at: string;
  data_estimada: string | null;
  atribuido_a: string | null;
  viatura: {
    id: string;
    matricula: string;
    marca: string;
    modelo: string;
  } | null;
  categoria: {
    id: string;
    nome: string;
    cor: string;
  } | null;
}

export interface TicketCategoria {
  id: string;
  nome: string;
  cor: string;
}

export interface TicketAnexo {
  id: string;
  nome_ficheiro: string;
  ficheiro_url: string;
  tipo_ficheiro: string | null;
  tamanho: number | null;
  created_at: string;
  mensagem_id: string | null;
  tipo_inspecao?: string | null;
  legenda?: string | null;
}

export interface TicketMensagem {
  id: string;
  mensagem: string;
  tipo: string;
  created_at: string;
  autor: {
    id: string;
    nome: string;
    cargo?: string;
    grupo?: { nome: string };
  } | null;
  anexos?: TicketAnexo[];
}
