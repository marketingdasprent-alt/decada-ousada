export interface Contrato {
  id: string;
  numero_contrato?: number | null;
  motorista_nome: string;
  motorista_id: string;
  motorista_nif: string | null;
  motorista_morada: string | null;
  motorista_email: string | null;
  motorista_telefone: string | null;
  motorista_documento_tipo: string | null;
  motorista_documento_numero: string | null;
  empresa_id: string;
  data_inicio: string;
  data_assinatura: string;
  cidade_assinatura: string;
  versao: number;
  status: string;
  criado_em: string;
  duracao_meses: number;
  documento_url: string | null;
  template_id: string | null;
}
