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
  RefreshCw,
  ParkingSquare,
  Search,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Play,
  UserPlus,
  Users,
} from 'lucide-react';
import { AssistenciaMultimediaUpload } from '@/components/assistencia/AssistenciaMultimediaUpload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  km_inicio: number | null;
  km_fim: number | null;
  combustivel_inicio: string | null;
  combustivel_fim: string | null;
  valor_reparacao: number | null;
  cobrar_motorista: boolean;
  viatura_substituta_id: string | null;
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
  km_atual?: number | null;
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
  aberto:       { label: 'Aberto',            color: 'bg-blue-500',   icon: <AlertCircle className="h-4 w-4" /> },
  em_andamento: { label: 'Em Manutenção',     color: 'bg-yellow-500', icon: <Clock className="h-4 w-4" /> },
  aguardando:   { label: 'Aguardando Peças',  color: 'bg-orange-500', icon: <Clock className="h-4 w-4" /> },
  resolvido:    { label: 'Concluído',         color: 'bg-green-500',  icon: <CheckCircle2 className="h-4 w-4" /> },
  fechado:      { label: 'Fechado',           color: 'bg-gray-500',   icon: <CheckCircle2 className="h-4 w-4" /> },
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [currentMediaList, setCurrentMediaList] = useState<any[]>([]);
  const [acessos, setAcessos] = useState<any[]>([]);
  const [showAddAccessDialog, setShowAddAccessDialog] = useState(false);
  const [showAllAccessDialog, setShowAllAccessDialog] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [addingUser, setAddingUser] = useState(false);
  
  const downloadMedia = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      window.open(url, '_blank');
    }
  };

  const openLightbox = (mediaList: any[], index: number) => {
    const list = mediaList.filter(a => 
      a.tipo_ficheiro === 'foto' || 
      a.tipo_ficheiro === 'video' ||
      a.ficheiro_url?.match(/\.(jpg|jpeg|png|webp|mp4|webm|mov|ogg)$/i)
    );
    const newIndex = list.findIndex(a => a.id === mediaList[index].id);
    if (newIndex === -1) return;
    
    setCurrentMediaList(list);
    setCurrentMediaIndex(newIndex);
    setLightboxOpen(true);
  };

  const nextMedia = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentMediaIndex(prev => (prev + 1) % currentMediaList.length);
  };

  const prevMedia = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentMediaIndex(prev => (prev - 1 + currentMediaList.length) % currentMediaList.length);
  };

  // closure states
  const [showClosureForm, setShowClosureForm] = useState(false);
  const [closureLoading, setClosureLoading] = useState(false);
  const [closureData, setClosureData] = useState({
    km_fim: '',
    combustivel_fim: 'meio',
    valor_reparacao: '',
    cobrar_motorista: true,
    descricao_reparacao: '',
    numero_fatura: '',
  });
  const [faturaFile, setFaturaFile] = useState<File | null>(null);
  const [exitMediaFiles, setExitMediaFiles] = useState<{ url: string; path: string; type: 'image' | 'video' }[]>([]);
  const faturaInputRef = useRef<HTMLInputElement>(null);

  // Substituta
  const [viaturaSubstituta, setViaturaSubstituta] = useState<Viatura | null>(null);
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [viaturasDisponiveis, setViaturasDisponiveis] = useState<Viatura[]>([]);
  const [substituteSearch, setSubstituteSearch] = useState('');
  const [assigningSubstitute, setAssigningSubstitute] = useState(false);

  // Decisões de fecho
  const [closureDecisao, setClosureDecisao] = useState<'parque' | 'reassociar' | null>(null);
  const [closureSubstDecisao, setClosureSubstDecisao] = useState<'devolver' | 'definitivo' | null>(null);

  // Permission logic is calculated after ticket loads in the return section

  useEffect(() => {
    if (id) {
      fetchTicketData();
      
      // Subscrever em Tempo Real (WhatsApp style)
      const channel = supabase
        .channel(`ticket-${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'assistencia_mensagens',
            filter: `ticket_id=eq.${id}`
          },
          () => {
            console.log('Nova mensagem detetada! Atualizando...');
            fetchMensagensAndAnexos();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'assistencia_anexos',
            filter: `ticket_id=eq.${id}`
          },
          () => {
            console.log('Novo anexo detetado! Atualizando...');
            fetchMensagensAndAnexos();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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
      const [viaturaRes, motoristaRes, categoriaRes, criadorRes] = await Promise.all([
        supabase.from('viaturas').select('id, matricula, marca, modelo, km_atual').eq('id', ticketData.viatura_id).single(),
        ticketData.motorista_id
          ? supabase.from('motoristas_ativos').select('id, nome, telefone').eq('id', ticketData.motorista_id).single()
          : supabase.from('motorista_viaturas')
              .select('motoristas_ativos!motorista_id(id, nome, telefone)')
              .eq('viatura_id', ticketData.viatura_id)
              .eq('status', 'ativo')
              .is('data_fim', null)
              .maybeSingle()
              .then(({ data }) => ({ data: (data as any)?.motoristas_ativos || null, error: null })),
        ticketData.categoria_id
          ? supabase.from('assistencia_categorias').select('id, nome, cor').eq('id', ticketData.categoria_id).single()
          : Promise.resolve({ data: null, error: null }),
        ticketData.criado_por
          ? supabase.from('profiles').select('id, nome').eq('id', ticketData.criado_por).single()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (viaturaRes.data) setViatura(viaturaRes.data as Viatura);
      if (motoristaRes.data) setMotorista(motoristaRes.data as Motorista);
      if (categoriaRes.data) setCategoria(categoriaRes.data as Categoria);
      if (criadorRes.data) setCriador(criadorRes.data);
      
      // Separar a lógica de mensagens para poder atualizar em tempo real
      await fetchMensagensAndAnexos();
      await fetchAcessos();

    } catch (error: any) {
      console.error('Erro ao carregar ticket:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes do ticket.",
        variant: "destructive",
      });
      navigate('/assistencia');
    } finally {
      setLoading(false);
    }
  };

  const fetchMensagensAndAnexos = async () => {
    if (!id) return;
    
    try {
      const [mensagensRes, anexosRes] = await Promise.all([
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

      if (mensagensRes.data) {
        // Buscar autores para as mensagens
        const autorIds = [...new Set(mensagensRes.data.map(m => m.autor_id).filter(Boolean))];
        const { data: autores } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', autorIds);

        const msgsComAutor = mensagensRes.data.map(m => ({
          ...m,
          autor: autores?.find(a => a.id === m.autor_id) || null
        }));
        
        setMensagens(msgsComAutor as any);
      }
      
      if (anexosRes.data) setAnexos(anexosRes.data as Anexo[]);
    } catch (error) {
      console.error('Erro ao atualizar mensagens:', error);
    }
  };

  const fetchAcessos = async () => {
    if (!id) return;
    try {
      // 1. Buscar quem tem acesso na tabela de junção
      const { data: accessData, error: accessError } = await supabase
        .from('assistencia_ticket_acessos')
        .select(`
          profile_id,
          profiles:profile_id (id, nome, cargo, is_admin)
        `)
        .eq('ticket_id', id);

      // 2. Buscar também o criador (que tem sempre acesso)
      const { data: ticketData } = await supabase
        .from('assistencia_tickets')
        .select('criado_por')
        .eq('id', id)
        .single();

      let peopleMap = new Map();
      
      // Adicionar criador
      if (ticketData?.criado_por) {
        const { data: creatorProf } = await supabase.from('profiles').select('id, nome, cargo, is_admin').eq('id', ticketData.criado_por).single();
        if (creatorProf) peopleMap.set(creatorProf.id, creatorProf);
      }

      // Adicionar pessoas da tabela de acessos
      if (accessData) {
        accessData.forEach((item: any) => {
          if (item.profiles) peopleMap.set(item.profiles.id, item.profiles);
        });
      }

      setAcessos(Array.from(peopleMap.values()));
    } catch (error) {
      console.error('Erro ao buscar acessos:', error);
      // Fallback para não quebrar a UI se a tabela não existir
      fetchAcessosFallback();
    }
  };

  const fetchAcessosFallback = async () => {
    if (!id) return;
    const { data: ticketData } = await supabase.from('assistencia_tickets').select('criado_por, atribuido_a').eq('id', id).single();
    if (ticketData) {
      const ids = [ticketData.criado_por, ticketData.atribuido_a].filter(Boolean) as string[];
      const { data: profs } = await supabase.from('profiles').select('id, nome, cargo, is_admin').in('id', ids);
      setAcessos(profs || []);
    }
  };

  const fetchAllProfiles = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, is_admin, cargo, created_at')
        .or('is_admin.eq.true,cargo.neq.null')
        .not('cargo', 'ilike', '%motorista%')
        .not('cargo', 'ilike', '%condutor%')
        .order('nome')
        .limit(100);
      
      const seenNames = new Set();
      const filtered = (data || []).filter(p => {
        if (!p.nome) return false;
        const isStaff = p.is_admin || (p.cargo && p.cargo.length > 2);
        if (!isStaff) return false;
        
        if (seenNames.has(p.nome)) return false;
        seenNames.add(p.nome);
        return true;
      });
      
      setAllProfiles(filtered);
    } catch (error) {
      console.error('Erro ao buscar perfis:', error);
    }
  };

  const handleAddAccess = async (profileId: string) => {
    try {
      setAddingUser(true);
      
      // 1. Tentar inserir na tabela de acessos
      const { error } = await supabase
        .from('assistencia_ticket_acessos')
        .insert({
          ticket_id: id,
          profile_id: profileId
        });

      if (error) {
        console.error('Erro ao adicionar acesso:', error);
        // Se a tabela não existir (42P01), fazemos o fallback para o atribuido_a (campo antigo)
        if (error.code === '42P01') {
          console.log('Tabela assistencia_ticket_acessos não existe. Usando fallback...');
          const { error: fallbackError } = await supabase
            .from('assistencia_tickets')
            .update({ atribuido_a: profileId })
            .eq('id', id);
          
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }
      
      toast({ title: 'Acesso concedido', description: 'O utilizador foi adicionado ao ticket.' });
      setShowAddAccessDialog(false);
      fetchAcessos();
    } catch (error: any) {
      if (error.code === '23505') {
        toast({ title: 'Aviso', description: 'Este utilizador já tem acesso ao ticket.' });
      } else {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      }
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveAccess = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('assistencia_ticket_acessos')
        .delete()
        .eq('ticket_id', id)
        .eq('profile_id', profileId);

      if (error) throw error;
      
      toast({ title: 'Acesso removido' });
      fetchAcessos();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
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
    if (!id || !ticket) return;

    // Se o novo status for 'resolvido', abrir o formulário de conclusão em vez de atualizar direto
    if (newStatus === 'resolvido') {
      setClosureData(prev => ({
        ...prev,
        km_fim: viatura?.km_atual?.toString() || '',
        cobrar_motorista: !!motorista,
      }));
      setShowClosureForm(true);
      return;
    }

    try {
      const updates: any = { status: newStatus };
      
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
  
  const handleAceitarTicket = async () => {
    if (!ticket || !viatura) return;
    try {
      await supabase
        .from('assistencia_tickets')
        .update({ status: 'em_andamento' })
        .eq('id', ticket.id);
      
      await supabase
        .from('viaturas')
        .update({ status: 'manutencao' })
        .eq('id', viatura.id);
        
      await supabase.from('assistencia_mensagens').insert({
        ticket_id: ticket.id,
        autor_id: user?.id,
        mensagem: 'Ticket aceite. Viatura colocada em manutenção.',
        tipo: 'status_change',
      });
      toast({ title: 'Ticket aceite', description: 'Viatura colocada em manutenção.' });
      fetchTicketData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const fetchViaturasDisponiveis = async () => {
    const { data } = await supabase
      .from('viaturas')
      .select('id, matricula, marca, modelo, km_atual')
      .eq('status', 'disponivel')
      .order('matricula');
    setViaturasDisponiveis(data || []);
  };

  const handleAtribuirSubstituta = async (viaturaId: string) => {
    if (!ticket || !motorista) return;
    try {
      setAssigningSubstitute(true);
      await supabase.from('motorista_viaturas').insert({
        motorista_id: motorista.id,
        viatura_id: viaturaId,
        data_inicio: new Date().toISOString().split('T')[0],
        status: 'ativo',
        tipo: 'substituta',
      });
      await supabase.from('viaturas').update({ status: 'em_uso' }).eq('id', viaturaId);
      await supabase.from('assistencia_tickets').update({ viatura_substituta_id: viaturaId }).eq('id', ticket.id);
      await supabase.from('assistencia_mensagens').insert({
        ticket_id: ticket.id,
        autor_id: user?.id,
        mensagem: `Viatura substituta atribuída ao motorista durante a reparação.`,
        tipo: 'status_change',
      });
      setShowSubstituteModal(false);
      toast({ title: 'Viatura substituta atribuída.' });
      fetchTicketData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setAssigningSubstitute(false);
    }
  };

  const handleViaturaReparada = async () => {
    if (!ticket || !viatura) return;
    
    if (!closureData.km_fim) {
      toast({ title: "Erro", description: "Informe a quilometragem final.", variant: "destructive" });
      return;
    }
    if (!closureData.valor_reparacao) {
      toast({ title: "Erro", description: "Informe o valor da reparação.", variant: "destructive" });
      return;
    }
    if (!closureDecisao) {
      toast({ title: "Erro", description: "Indique o destino da viatura reparada.", variant: "destructive" });
      return;
    }
    if (ticket?.viatura_substituta_id && !closureSubstDecisao) {
      toast({ title: "Erro", description: "Indique o destino da viatura substituta.", variant: "destructive" });
      return;
    }
    if (exitMediaFiles.length < 5) {
      toast({ title: "Fotos Obrigatórias", description: "É necessário carregar pelo menos 4 fotos e 1 vídeo para a saída.", variant: "destructive" });
      return;
    }

    try {
      setClosureLoading(true);
      const valor = parseFloat(closureData.valor_reparacao);
      const kmFim = parseInt(closureData.km_fim);
      
      // 1. Criar registo em viatura_reparacoes para histórico
      const { error: repError } = await supabase
        .from('viatura_reparacoes')
        .insert({
          viatura_id: viatura.id,
          descricao: closureData.descricao_reparacao || ticket.titulo,
          custo: valor,
          data_entrada: ticket.created_at,
          data_saida: new Date().toISOString(),
          km_entrada: ticket.km_inicio,
          registado_por: user?.id,
          motorista_responsavel_id: motorista?.id || null,
          cobrar_motorista: closureData.cobrar_motorista,
          valor_a_cobrar: closureData.cobrar_motorista ? valor : null,
          data_inicio_cobranca: closureData.cobrar_motorista ? new Date().toISOString().split('T')[0] : null,
        });

      if (repError) throw repError;

      // 2. Upload da fatura (antes do financeiro para incluir URL na referência)
      let faturaUrl: string | null = null;
      if (faturaFile) {
        const fileExt = faturaFile.name.split('.').pop();
        const fileName = `faturas/${id}/${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('assistencia-anexos')
          .upload(fileName, faturaFile);
        if (uploadErr) throw uploadErr;
        
        const { data: { publicUrl } } = supabase.storage
          .from('assistencia-anexos')
          .getPublicUrl(fileName);
        
        faturaUrl = publicUrl;
      }

      // 3. Salvar Anexos de Saída (Fotos e Vídeos)
      if (exitMediaFiles.length > 0) {
        const anexosSaida = exitMediaFiles.map(file => ({
          ticket_id: id,
          tipo_ficheiro: file.type === 'image' ? 'foto' : 'video',
          ficheiro_url: file.url,
          nome_ficheiro: file.path.split('/').pop() || 'anexo_saida',
          uploaded_by: user?.id
        }));

        await supabase.from('assistencia_anexos').insert(anexosSaida);

        // 3.1 Registar Check-out em Danos
        const { data: checkoutDano, error: cError } = await supabase
          .from('viatura_danos')
          .insert({
            viatura_id: viatura.id,
            motorista_id: motorista?.id || null,
            ticket_id: id,
            descricao: `Check-out de Assistência #${String(ticket.numero).padStart(4, '0')}`,
            localizacao: 'outro',
            estado: 'reparado',
            data_registo: new Date().toISOString().split('T')[0],
            registado_por: user?.id,
            observacoes: `Saída de assistência concluída: ${closureData.descricao_reparacao || ticket.titulo}`,
          })
          .select()
          .single();

        if (cError) {
          console.error('Erro ao criar dano no checkout:', cError);
        }

        if (!cError && checkoutDano) {
          const fotosCheckout = exitMediaFiles
            .filter(f => f.type === 'image')
            .map(file => ({
              dano_id: checkoutDano.id,
              ficheiro_url: file.url,
              nome_ficheiro: file.path.split('/').pop() || 'foto_checkout',
              uploaded_by: user?.id
            }));
          
          if (fotosCheckout.length > 0) {
            await supabase.from('viatura_dano_fotos').insert(fotosCheckout);
          }
        }
      }

      // 3. Se cobrar_motorista, criar lançamento pendente na conta do motorista
      if (closureData.cobrar_motorista && motorista?.id) {
        const refBase = `Ticket #${ticket.numero}`;
        const { error: finError } = await supabase.from('motorista_financeiro').insert({
          motorista_id: motorista.id,
          tipo: 'debito',
          categoria: 'reparacao',
          descricao: `Reparação Viatura: ${viatura.matricula} - ${closureData.descricao_reparacao || ticket.titulo}`,
          valor: valor,
          data_movimento: new Date().toISOString().split('T')[0],
          status: 'pendente',
          referencia: faturaUrl ? `${refBase} | ${faturaUrl}` : refBase,
        });
        if (finError) throw finError;
      }

      // 5. Atualizar o Ticket
      const { error: ticketUpdateError } = await supabase
        .from('assistencia_tickets')
        .update({
          status: 'resolvido',
          data_resolucao: new Date().toISOString(),
          km_fim: kmFim,
          combustivel_fim: closureData.combustivel_fim,
          valor_reparacao: valor,
          cobrar_motorista: closureData.cobrar_motorista,
          numero_fatura: closureData.numero_fatura.trim() || null,
          fatura_url: faturaUrl,
        })
        .eq('id', id);
      if (ticketUpdateError) throw ticketUpdateError;

      // 6. Atualizar Viatura original (KM + status conforme decisão)
      const viaturaOriginalStatus = closureDecisao === 'reassociar' ? 'em_uso' : 'disponivel';
      await supabase
        .from('viaturas')
        .update({ status: viaturaOriginalStatus, km_atual: kmFim })
        .eq('id', viatura.id);

      // 7a. Se reassociar: criar nova entrada em motorista_viaturas para viatura original
      if (closureDecisao === 'reassociar' && motorista?.id) {
        await supabase.from('motorista_viaturas').insert({
          motorista_id: motorista.id,
          viatura_id: viatura.id,
          data_inicio: new Date().toISOString().split('T')[0],
          status: 'ativo',
          tipo: 'normal',
        });
      }

      // 7b. Tratar viatura substituta (se existia)
      if (ticket?.viatura_substituta_id && motorista?.id) {
        if (closureSubstDecisao === 'devolver') {
          await supabase
            .from('motorista_viaturas')
            .update({ data_fim: new Date().toISOString().split('T')[0], status: 'encerrado' })
            .eq('viatura_id', ticket.viatura_substituta_id)
            .eq('motorista_id', motorista.id)
            .eq('tipo', 'substituta')
            .is('data_fim', null);
          await supabase.from('viaturas').update({ status: 'disponivel' }).eq('id', ticket.viatura_substituta_id);
        } else if (closureSubstDecisao === 'definitivo') {
          await supabase
            .from('motorista_viaturas')
            .update({ tipo: 'normal' })
            .eq('viatura_id', ticket.viatura_substituta_id)
            .eq('motorista_id', motorista.id)
            .eq('tipo', 'substituta')
            .is('data_fim', null);
        }
      }

      // 7. Log status change
      await supabase.from('assistencia_mensagens').insert({
        ticket_id: id,
        autor_id: user?.id,
        mensagem: `Viatura Reparada. Valor: ${valor}€. Viatura voltou a estar disponível. ` + 
                 (closureData.cobrar_motorista ? `(Débito de ${valor}€ lançado ao motorista ${motorista?.nome} - Aguarda acordo)` : "(Sem cobrança ao motorista)"),
        tipo: 'status_change',
      });

      toast({
        title: "Sucesso",
        description: "Viatura reparada e assistência concluída.",
      });

      setShowClosureForm(false);
      setFaturaFile(null);
      setClosureDecisao(null);
      setClosureSubstDecisao(null);
      fetchTicketData();
    } catch (error: any) {
      console.error('Erro ao concluir reparação:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível concluir a reparação.",
        variant: "destructive",
      });
    } finally {
      setClosureLoading(false);
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
            <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
              #{String(ticket.numero).padStart(4, '0')}
            </span>
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
        
        {canChangeStatus && !['resolvido', 'fechado'].includes(ticket.status) && (
          <Select value={ticket.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="em_andamento">Em Manutenção</SelectItem>
              <SelectItem value="aguardando">Peças/Aguardar</SelectItem>
              <SelectItem value="resolvido" className="text-green-600 font-bold">✓ Concluir</SelectItem>
            </SelectContent>
          </Select>
        )}
        
        <Badge className={`${statusConfig[ticket.status]?.color} flex items-center gap-1 h-9 px-4`}>
          {statusConfig[ticket.status]?.icon}
          {statusConfig[ticket.status]?.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content (Chat) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Description */}
          {ticket.descricao && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Descrição do Problema</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{ticket.descricao}</p>
              </CardContent>
            </Card>
          )}

          {/* Messages */}
          <Card className="flex flex-col">
            <CardHeader className="border-b py-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Conversação em Tempo Real
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex flex-col">
              <ScrollArea className="h-[500px] p-4">
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
              
              {/* Closure Form - NEW */}
              {showClosureForm && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      Concluir Reparação (Viatura Reparada)
                    </h3>
                    <Button variant="ghost" size="icon" onClick={() => setShowClosureForm(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>KM Final *</Label>
                      <Input 
                        type="number" 
                        placeholder="Quilometragem atual"
                        value={closureData.km_fim}
                        onChange={(e) => setClosureData(prev => ({ ...prev, km_fim: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Combustível Final</Label>
                      <Select 
                        value={closureData.combustivel_fim}
                        onValueChange={(val) => setClosureData(prev => ({ ...prev, combustivel_fim: val }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vazio">Vazio</SelectItem>
                          <SelectItem value="reserva">Reserva</SelectItem>
                          <SelectItem value="1/4">1/4</SelectItem>
                          <SelectItem value="meio">1/2 (Meio)</SelectItem>
                          <SelectItem value="3/4">3/4</SelectItem>
                          <SelectItem value="cheio">Cheio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Total (€) *</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={closureData.valor_reparacao}
                        onChange={(e) => setClosureData(prev => ({ ...prev, valor_reparacao: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Resumo da Reparação</Label>
                    <Textarea 
                      placeholder="O que foi reparado..."
                      value={closureData.descricao_reparacao}
                      onChange={(e) => setClosureData(prev => ({ ...prev, descricao_reparacao: e.target.value }))}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nº Fatura</Label>
                      <Input
                        placeholder="Ex: FT 2026/123"
                        value={closureData.numero_fatura}
                        onChange={(e) => setClosureData(prev => ({ ...prev, numero_fatura: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Anexar Fatura</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => faturaInputRef.current?.click()}
                          className="flex-1"
                        >
                          <Paperclip className="h-4 w-4 mr-2" />
                          {faturaFile ? faturaFile.name : 'Selecionar ficheiro'}
                        </Button>
                        {faturaFile && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => setFaturaFile(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        <input
                          ref={faturaInputRef}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => setFaturaFile(e.target.files?.[0] || null)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="cobrar"
                      checked={closureData.cobrar_motorista}
                      onChange={(e) => setClosureData(prev => ({ ...prev, cobrar_motorista: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="cobrar" className="cursor-pointer">
                      Cobrar valor ao motorista ({motorista?.nome || 'Nenhum motorista associado'})
                    </Label>
                  </div>

                  {/* Multimédia de Saída */}
                  <div className="space-y-4 border-t pt-4">
                    <Label className="text-base font-bold flex items-center gap-2">
                      <Image className="h-5 w-5 text-blue-500" />
                      Multimédia de Saída (Obrigatório)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Registe o estado da viatura no momento da entrega (Mínimo 4 fotos e 1 vídeo).
                    </p>
                    <AssistenciaMultimediaUpload 
                      onFilesChange={setExitMediaFiles}
                    />
                  </div>
                  
                  {/* Decisão: viatura reparada */}
                  <div className="space-y-2">
                    <Label className="font-semibold">O que fazer com a viatura reparada ({viatura?.matricula})?</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setClosureDecisao('parque')}
                        className={`rounded-lg border-2 p-3 text-left transition-all ${closureDecisao === 'parque' ? 'border-blue-500 bg-blue-500/10' : 'border-border hover:border-primary/40'}`}
                      >
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <ParkingSquare className="h-4 w-4" /> Disponível no parque
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Fica disponível sem motorista associado</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setClosureDecisao('reassociar')}
                        className={`rounded-lg border-2 p-3 text-left transition-all ${closureDecisao === 'reassociar' ? 'border-green-500 bg-green-500/10' : 'border-border hover:border-primary/40'}`}
                      >
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <RefreshCw className="h-4 w-4" /> Reassociar ao motorista
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {motorista ? motorista.nome : 'Nenhum motorista'} volta a esta viatura
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Decisão: viatura substituta (só se existia) */}
                  {ticket?.viatura_substituta_id && viaturaSubstituta && (
                    <div className="space-y-2">
                      <Label className="font-semibold">O que fazer com a viatura substituta ({viaturaSubstituta.matricula})?</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setClosureSubstDecisao('devolver')}
                          className={`rounded-lg border-2 p-3 text-left transition-all ${closureSubstDecisao === 'devolver' ? 'border-blue-500 bg-blue-500/10' : 'border-border hover:border-primary/40'}`}
                        >
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <ParkingSquare className="h-4 w-4" /> Devolver ao parque
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Encerra associação temporária, fica disponível</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setClosureSubstDecisao('definitivo')}
                          className={`rounded-lg border-2 p-3 text-left transition-all ${closureSubstDecisao === 'definitivo' ? 'border-green-500 bg-green-500/10' : 'border-border hover:border-primary/40'}`}
                        >
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <RefreshCw className="h-4 w-4" /> Manter com o motorista
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Passa a associação definitiva, continua em uso</p>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => { setShowClosureForm(false); setClosureDecisao(null); setClosureSubstDecisao(null); }}>Cancelar</Button>
                    <Button onClick={handleViaturaReparada} disabled={closureLoading}>
                      {closureLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Concluir Reparação
                    </Button>
                  </div>
                </div>
              )}

              {/* Message input area */}
              {!showClosureForm && (
                <>
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
              {canReply && (
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
              )}
            </>
          )}
        </CardContent>
      </Card>
        </div>

        {/* Sidebar (Fixo) */}
        <div className="space-y-6">
          {/* Access Section */}
          <Card>
            <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="h-4 w-4" /> Acesso
              </CardTitle>
              {canChangeStatus && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-primary"
                  onClick={() => {
                    fetchAllProfiles();
                    setShowAddAccessDialog(true);
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {acessos.slice(0, 2).map(user => (
                <div key={user.id} className="flex items-center gap-2 text-sm group">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {user.nome?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{user.nome}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">{getAutorRole(user.id) || (user.cargo || 'Staff')}</p>
                  </div>
                  {canChangeStatus && user.id !== ticket?.criado_por && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => handleRemoveAccess(user.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              
              {acessos.length > 2 && (
                <Button 
                  variant="link" 
                  className="text-xs p-0 h-auto w-full text-center text-primary"
                  onClick={() => setShowAllAccessDialog(true)}
                >
                  Ver todos os {acessos.length}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {/* Viatura */}
              {viatura && (
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold">Viatura</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Car className="h-4 w-4 text-blue-500" />
                    <span className="font-mono font-bold text-sm">{viatura.matricula}</span>
                  </div>
                </div>
              )}

              {/* Motorista */}
              {motorista && (
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold">Motorista</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">{motorista.nome}</span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Dates */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold">Criado em</Label>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                  {criador && (
                    <p className="text-[10px] text-muted-foreground mt-1 ml-5">por {criador.nome}</p>
                  )}
                </div>

                {ticket.data_estimada && (
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold">Previsão</Label>
                    <div className="flex items-center gap-2 mt-1 text-xs text-amber-600">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(ticket.data_estimada), "dd/MM/yyyy")}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gallery Card */}
          <Card>
            <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Image className="h-4 w-4" /> Galeria
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-primary"
                onClick={() => document.getElementById('sidebar-file-upload')?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-2">
                {anexos.filter(a => a.tipo_ficheiro === 'foto' || a.ficheiro_url?.match(/\.(jpg|jpeg|png|webp)$/i)).slice(0, 9).map((anexo, idx) => (
                  <div 
                    key={anexo.id} 
                    className="aspect-square rounded border overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => openLightbox(anexos, anexos.indexOf(anexo))}
                  >
                    <img src={anexo.ficheiro_url} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              {anexos.length > 9 && (
                <Button variant="link" className="text-xs p-0 h-auto mt-2 w-full text-center" onClick={() => {}}>
                  Ver todos os {anexos.length} anexos
                </Button>
              )}
              {anexos.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-2 italic">Sem ficheiros multimédia</p>
              )}
              <input 
                id="sidebar-file-upload" 
                type="file" 
                multiple 
                className="hidden" 
                onChange={handleFileSelect}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Adicionar Acesso */}
      <Dialog open={showAddAccessDialog} onOpenChange={setShowAddAccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conceder Acesso ao Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar utilizador..." 
                className="pl-9"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {allProfiles
                  .filter(p => p.nome?.toLowerCase().includes(searchUser.toLowerCase()))
                  .map(profile => (
                    <button
                      key={profile.id}
                      onClick={() => handleAddAccess(profile.id)}
                      disabled={addingUser}
                      className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs">
                          {profile.nome?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{profile.nome}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-2">
                            <span>{profile.is_admin ? 'Administrador' : (profile.cargo || 'Sem Cargo')}</span>
                            {profile.created_at && (
                              <span className="opacity-50 font-normal">Criado em: {new Date(profile.created_at).toLocaleDateString()}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {addingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal Ver Todos os Acessos */}
      <Dialog open={showAllAccessDialog} onOpenChange={setShowAllAccessDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pessoas com Acesso</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {acessos.map(user => (
                <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                    {user.nome?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user.nome}</p>
                    <p className="text-xs text-muted-foreground uppercase">{user.cargo || 'Colaborador'}</p>
                  </div>
                  {canChangeStatus && user.id !== ticket?.criado_por && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemoveAccess(user.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de seleção de viatura substituta */}
      <Dialog open={showSubstituteModal} onOpenChange={setShowSubstituteModal}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" /> Atribuir Viatura Substituta
            </DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background"
              placeholder="Pesquisar matrícula ou modelo..."
              value={substituteSearch}
              onChange={(e) => setSubstituteSearch(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto flex-1 space-y-2">
            {viaturasDisponiveis
              .filter(v =>
                v.matricula.toLowerCase().includes(substituteSearch.toLowerCase()) ||
                v.marca.toLowerCase().includes(substituteSearch.toLowerCase()) ||
                v.modelo.toLowerCase().includes(substituteSearch.toLowerCase())
              )
              .map(v => (
                <button
                  key={v.id}
                  onClick={() => handleAtribuirSubstituta(v.id)}
                  disabled={assigningSubstitute}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors text-left"
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Car className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-sm">{v.matricula}</p>
                    <p className="text-xs text-muted-foreground">{v.marca} {v.modelo}</p>
                  </div>
                  {assigningSubstitute && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
                </button>
              ))}
            {viaturasDisponiveis.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">Sem viaturas disponíveis.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Lightbox Galeria */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 bg-black/95 border-none flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20 rounded-full"
              onClick={() => downloadMedia(currentMediaList[currentMediaIndex]?.ficheiro_url, currentMediaList[currentMediaIndex]?.nome_ficheiro)}
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20 rounded-full"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-12">
            {currentMediaList.length > 1 && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute left-2 sm:left-6 z-40 text-white hover:bg-white/20 rounded-full h-12 w-12"
                  onClick={prevMedia}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-2 sm:right-6 z-40 text-white hover:bg-white/20 rounded-full h-12 w-12"
                  onClick={nextMedia}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            <div className="max-w-full max-h-full flex flex-col items-center gap-4">
              {currentMediaList[currentMediaIndex]?.tipo_ficheiro === 'video' || currentMediaList[currentMediaIndex]?.ficheiro_url?.match(/\.(mp4|webm|mov|ogg)$/i) ? (
                <video 
                  src={currentMediaList[currentMediaIndex]?.ficheiro_url} 
                  controls 
                  autoPlay 
                  className="max-w-full max-h-[75vh] rounded-lg shadow-2xl"
                />
              ) : (
                <img 
                  src={currentMediaList[currentMediaIndex]?.ficheiro_url} 
                  alt="Preview" 
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
                />
              )}
              
              <div className="text-white text-center space-y-1">
                <p className="text-sm font-semibold truncate max-w-md">
                  {currentMediaList[currentMediaIndex]?.nome_ficheiro}
                </p>
                <p className="text-xs text-white/60">
                  {currentMediaIndex + 1} de {currentMediaList.length}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketDetails;
