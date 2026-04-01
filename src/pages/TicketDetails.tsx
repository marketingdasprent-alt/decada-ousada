import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  ArrowLeft,
  Wrench,
  Car,
  User,
  Calendar,
  Clock,
  Send,
  Paperclip,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Image,
  FileText,
  X,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Ticket {
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
}

interface Mensagem {
  id: string;
  mensagem: string;
  tipo: string;
  created_at: string;
  autor: {
    id: string;
    nome: string;
  } | null;
  anexos?: Anexo[];
}

interface Anexo {
  id: string;
  nome_ficheiro: string;
  ficheiro_url: string;
  tipo_ficheiro: string | null;
  tamanho: number | null;
  created_at: string;
  mensagem_id: string | null;
}

interface Viatura {
  id: string;
  matricula: string;
  marca: string;
  modelo: string;
}

interface Motorista {
  id: string;
  nome: string;
  telefone: string | null;
}

interface Categoria {
  id: string;
  nome: string;
  cor: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  aberto: { label: 'Aberto', color: 'bg-blue-500', icon: <AlertCircle className="h-4 w-4" /> },
  em_andamento: { label: 'Em Andamento', color: 'bg-yellow-500', icon: <Clock className="h-4 w-4" /> },
  aguardando: { label: 'Aguardando', color: 'bg-orange-500', icon: <Clock className="h-4 w-4" /> },
  resolvido: { label: 'Resolvido', color: 'bg-green-500', icon: <CheckCircle2 className="h-4 w-4" /> },
  fechado: { label: 'Fechado', color: 'bg-gray-500', icon: <CheckCircle2 className="h-4 w-4" /> },
};

const prioridadeConfig: Record<string, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'bg-gray-400' },
  media: { label: 'Média', color: 'bg-blue-400' },
  alta: { label: 'Alta', color: 'bg-orange-500' },
  urgente: { label: 'Urgente', color: 'bg-red-500' },
};

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isFromMeusTickets = location.pathname.startsWith('/meus-tickets');
  const { user } = useAuth();
  const { isAdmin, hasAccessToResource } = usePermissions();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [viatura, setViatura] = useState<Viatura | null>(null);
  const [motorista, setMotorista] = useState<Motorista | null>(null);
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [criador, setCriador] = useState<{ nome: string } | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Permission logic is calculated after ticket loads in the return section

  useEffect(() => {
    if (id) {
      fetchTicketData();
    }
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTicketData = async () => {
    try {
      setLoading(true);

      // Fetch ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('assistencia_tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (ticketError) throw ticketError;
      setTicket(ticketData);

      // Fetch related data in parallel
      const [viaturaRes, motoristaRes, categoriaRes, criadorRes, mensagensRes, anexosRes] = await Promise.all([
        supabase.from('viaturas').select('id, matricula, marca, modelo').eq('id', ticketData.viatura_id).single(),
        ticketData.motorista_id 
          ? supabase.from('motoristas_ativos').select('id, nome, telefone').eq('id', ticketData.motorista_id).single()
          : Promise.resolve({ data: null, error: null }),
        ticketData.categoria_id
          ? supabase.from('assistencia_categorias').select('id, nome, cor').eq('id', ticketData.categoria_id).single()
          : Promise.resolve({ data: null, error: null }),
        ticketData.criado_por
          ? supabase.from('profiles').select('id, nome').eq('id', ticketData.criado_por).single()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from('assistencia_mensagens')
          .select('id, mensagem, tipo, created_at, autor_id')
          .eq('ticket_id', id)
          .order('created_at', { ascending: true }),
        supabase
          .from('assistencia_anexos')
          .select('id, nome_ficheiro, ficheiro_url, tipo_ficheiro, tamanho, created_at, mensagem_id')
          .eq('ticket_id', id)
          .order('created_at', { ascending: false }),
      ]);

      if (viaturaRes.data) setViatura(viaturaRes.data as Viatura);
      if (motoristaRes.data) setMotorista(motoristaRes.data as Motorista);
      if (categoriaRes.data) setCategoria(categoriaRes.data as Categoria);
      if (criadorRes.data) setCriador(criadorRes.data as { nome: string });
      
      // Fetch authors for messages
      const mensagensData = mensagensRes.data || [];
      const todosAnexos = (anexosRes.data || []) as Anexo[];
      const autorIds = [...new Set(mensagensData.map((m: any) => m.autor_id).filter(Boolean))] as string[];
      
      let autoresMap = new Map<string, { id: string; nome: string }>();
      if (autorIds.length > 0) {
        const { data: autoresData } = await supabase.from('profiles').select('id, nome').in('id', autorIds);
        autoresMap = new Map((autoresData || []).map(a => [a.id, a]));
      }
      
      // Mapear anexos às mensagens correspondentes
      const enrichedMensagens = mensagensData.map((msg: any) => ({
        ...msg,
        autor: msg.autor_id ? autoresMap.get(msg.autor_id) || null : null,
        anexos: todosAnexos.filter(a => a.mensagem_id === msg.id),
      }));
      
      setMensagens(enrichedMensagens as Mensagem[]);
      // Manter apenas anexos sem mensagem_id para sidebar (anexos antigos)
      setAnexos(todosAnexos.filter(a => !a.mensagem_id));

    } catch (error: any) {
      console.error('Erro ao carregar ticket:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes do ticket.",
        variant: "destructive",
      });
      navigate(isFromMeusTickets ? '/meus-tickets' : '/assistencia');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!novaMensagem.trim() && selectedFiles.length === 0) return;

    try {
      setSending(true);

      // Criar mensagem primeiro (mesmo que só tenha ficheiros)
      const textoMensagem = novaMensagem.trim() || (selectedFiles.length > 0 ? 'Enviou ficheiro(s)' : '');
      const tipoMensagem = novaMensagem.trim() ? 'mensagem' : 'anexo';
      
      const { data: mensagemInserida, error: msgError } = await supabase
        .from('assistencia_mensagens')
        .insert({
          ticket_id: id,
          autor_id: user?.id,
          mensagem: textoMensagem,
          tipo: tipoMensagem,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Upload files e associar à mensagem criada
      if (selectedFiles.length > 0 && mensagemInserida) {
        setUploading(true);
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('assistencia-anexos')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('assistencia-anexos')
            .getPublicUrl(fileName);

          await supabase.from('assistencia_anexos').insert({
            ticket_id: id,
            mensagem_id: mensagemInserida.id,
            nome_ficheiro: file.name,
            ficheiro_url: publicUrl,
            tipo_ficheiro: file.type,
            tamanho: file.size,
            uploaded_by: user?.id,
          });
        }
        setUploading(false);
      }

      // Enviar webhook ticket_resposta
      if (mensagemInserida) {
        const [{ data: ticketCompleto }, { data: autorProfile }, { data: criadorProfile }] = await Promise.all([
          supabase
            .from('assistencia_tickets')
            .select(`
              *,
              viatura:viaturas(id, matricula, marca, modelo, cor, ano),
              motorista:motoristas_ativos(id, nome, email, telefone, codigo),
              categoria:assistencia_categorias(id, nome, cor)
            `)
            .eq('id', id)
            .single(),
          supabase
            .from('profiles')
            .select('nome, cargo')
            .eq('id', user?.id)
            .single(),
          supabase
            .from('profiles')
            .select('nome, cargo')
            .eq('id', ticket?.criado_por)
            .single(),
        ]);

        supabase.functions.invoke('send-webhook', {
          body: {
            evento: 'ticket_criado',
            dados: {
              acao: 'resposta',
              ticket: ticketCompleto,
              mensagem: {
                id: mensagemInserida.id,
                texto: mensagemInserida.mensagem,
                created_at: mensagemInserida.created_at,
                tem_anexos: selectedFiles.length > 0,
              },
              criado_por: {
                id: ticket?.criado_por,
                nome: criadorProfile?.nome || null,
                cargo: criadorProfile?.cargo || null,
              },
              respondido_por: {
                id: user?.id,
                email: user?.email,
                nome: autorProfile?.nome || null,
                cargo: autorProfile?.cargo || null,
                tipo: ticket?.criado_por === user?.id ? 'Gestor' : 'Assistência',
              },
            },
          },
        }).catch(err => console.error('Erro ao enviar webhook ticket_resposta:', err));
      }

      setNovaMensagem('');
      setSelectedFiles([]);
      fetchTicketData();

      toast({
        title: "Sucesso",
        description: "Mensagem enviada com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'resolvido') {
        updates.data_resolucao = new Date().toISOString();
      }

      const { error } = await supabase
        .from('assistencia_tickets')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Log status change
      await supabase.from('assistencia_mensagens').insert({
        ticket_id: id,
        autor_id: user?.id,
        mensagem: `Estado alterado para: ${statusConfig[newStatus]?.label || newStatus}`,
        tipo: 'status_change',
      });

      toast({
        title: "Sucesso",
        description: "Estado do ticket atualizado.",
      });

      fetchTicketData();
    } catch (error: any) {
      console.error('Erro ao atualizar estado:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o estado.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string | null) => {
    if (type?.startsWith('image/')) return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  // Determinar papel do autor da mensagem
  const getAutorRole = (autorId: string | undefined) => {
    if (!autorId || !ticket) return null;
    if (autorId === ticket.criado_por) return 'Gestor';
    if (autorId === ticket.atribuido_a) return 'Assistência';
    // Se não é o criador nem o atribuído, mas tem permissão de assistência, é Assistência
    if (isAssistanceManager || isAdmin) return 'Assistência';
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Ticket não encontrado</h2>
        <Button variant="outline" onClick={() => navigate('/assistencia')}>
          Voltar
        </Button>
      </div>
    );
  }

  const isTicketOwner = ticket.criado_por === user?.id;
  const isAssistanceManager = hasAccessToResource('assistencia_tickets');
  const canReply = isTicketOwner || isAssistanceManager || isAdmin;
  const canChangeStatus = isAssistanceManager || isAdmin;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(isFromMeusTickets ? '/meus-tickets' : '/assistencia')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span className="font-mono">#{String(ticket.numero).padStart(4, '0')}</span>
            {categoria && (
              <Badge variant="outline" style={{ borderColor: categoria.cor, color: categoria.cor }}>
                {categoria.nome}
              </Badge>
            )}
            <Badge className={prioridadeConfig[ticket.prioridade]?.color}>
              {prioridadeConfig[ticket.prioridade]?.label}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">{ticket.titulo}</h1>
        </div>
        
        {canChangeStatus && (
          <Select value={ticket.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="aguardando">Aguardando</SelectItem>
              <SelectItem value="resolvido">Resolvido</SelectItem>
              <SelectItem value="fechado">Fechado</SelectItem>
            </SelectContent>
          </Select>
        )}
        
        <Badge className={`${statusConfig[ticket.status]?.color} flex items-center gap-1`}>
          {statusConfig[ticket.status]?.icon}
          {statusConfig[ticket.status]?.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {ticket.descricao && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{ticket.descricao}</p>
              </CardContent>
            </Card>
          )}

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-[400px] pr-4">
                {mensagens.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Ainda não há mensagens neste ticket.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {mensagens.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.tipo === 'status_change'
                            ? 'bg-muted/50 text-center text-sm'
                            : msg.autor?.id === user?.id
                            ? 'bg-primary/10 ml-8'
                            : 'bg-muted mr-8'
                        }`}
                      >
                        {msg.tipo !== 'status_change' && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {msg.autor?.nome || 'Sistema'}
                            </span>
                            {getAutorRole(msg.autor?.id) && (
                              <Badge 
                                variant="outline" 
                                className={
                                  getAutorRole(msg.autor?.id) === 'Gestor' 
                                    ? 'border-blue-500 text-blue-500 text-xs py-0 px-1.5' 
                                    : 'border-green-500 text-green-500 text-xs py-0 px-1.5'
                                }
                              >
                                {getAutorRole(msg.autor?.id)}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                            </span>
                          </div>
                        )}
                        {msg.tipo !== 'anexo' && (
                          <p className={msg.tipo === 'status_change' ? 'italic' : ''}>
                            {msg.mensagem}
                          </p>
                        )}
                        
                        {/* Anexos inline na conversação */}
                        {msg.anexos && msg.anexos.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.anexos.map(anexo => (
                              <div 
                                key={anexo.id} 
                                className="flex items-center gap-2 p-2 bg-background rounded border"
                              >
                                {anexo.tipo_ficheiro?.startsWith('image/') ? (
                                  <Image className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="flex-1 text-sm truncate">{anexo.nome_ficheiro}</span>
                                <a
                                  href={anexo.ficheiro_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-muted rounded"
                                  title="Ver"
                                >
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                </a>
                                <a
                                  href={anexo.ficheiro_url}
                                  download={anexo.nome_ficheiro}
                                  className="p-1 hover:bg-muted rounded"
                                  title="Descarregar"
                                >
                                  <Download className="h-4 w-4 text-muted-foreground" />
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <Separator />

              {/* Selected files preview */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-lg">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 bg-background px-2 py-1 rounded text-sm">
                      {getFileIcon(file.type)}
                      <span className="max-w-[150px] truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={() => removeSelectedFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Message input - only show if user can reply */}
              {canReply ? (
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Escreva uma mensagem..."
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    className="flex-1 min-h-[80px]"
                    disabled={sending}
                  />
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      multiple
                      onChange={handleFileSelect}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={sending || (!novaMensagem.trim() && selectedFiles.length === 0)}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Aguarde a resposta da equipa de assistência
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Viatura */}
              {viatura && (
                <div>
                  <Label className="text-muted-foreground">Viatura</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Car className="h-4 w-4" />
                    <span>{viatura.matricula}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {viatura.marca} {viatura.modelo}
                  </p>
                </div>
              )}

              {/* Motorista */}
              {motorista && (
                <div>
                  <Label className="text-muted-foreground">Motorista</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4" />
                    <span>{motorista.nome}</span>
                  </div>
                  {motorista.telefone && (
                    <p className="text-sm text-muted-foreground">{motorista.telefone}</p>
                  )}
                </div>
              )}

              <Separator />

              {/* Dates */}
              <div>
                <Label className="text-muted-foreground">Criado em</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}</span>
                </div>
                {criador && (
                  <p className="text-sm text-muted-foreground">por {criador.nome}</p>
                )}
              </div>

              {ticket.data_estimada && (
                <div>
                  <Label className="text-muted-foreground">Previsão</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4" />
                    <span>{format(new Date(ticket.data_estimada), "dd/MM/yyyy", { locale: pt })}</span>
                  </div>
                </div>
              )}

              {ticket.data_resolucao && (
                <div>
                  <Label className="text-muted-foreground">Resolvido em</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>{format(new Date(ticket.data_resolucao), "dd/MM/yyyy HH:mm", { locale: pt })}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexos ({anexos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {anexos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sem anexos
                </p>
              ) : (
                <div className="space-y-2">
                  {anexos.map((anexo) => (
                    <a
                      key={anexo.id}
                      href={anexo.ficheiro_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      {getFileIcon(anexo.tipo_ficheiro)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{anexo.nome_ficheiro}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(anexo.created_at), "dd/MM/yyyy", { locale: pt })}
                        </p>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TicketDetails;
