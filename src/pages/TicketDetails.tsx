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
  PlayCircle,
  Play,
  UserPlus,
  Users,
  Building2,
  Coins,
  Gauge,
  Fuel,
  Droplets,
  Sparkles,
} from 'lucide-react';
import { AssistenciaMultimediaUpload } from '@/components/assistencia/AssistenciaMultimediaUpload';
import { TicketMediaLightbox } from '@/components/assistencia/TicketMediaLightbox';
import { TicketGalleryDialog } from '@/components/assistencia/TicketGalleryDialog';
import { TicketSidebar } from '@/components/assistencia/ticket/TicketSidebar';
import { TicketClosureDialog } from '@/components/assistencia/ticket/TicketClosureDialog';
import { TicketSubstitutaModal } from '@/components/assistencia/ticket/TicketSubstitutaModal';
import { TicketLegendaDialog } from '@/components/assistencia/ticket/TicketLegendaDialog';
import { TicketHeader } from '@/components/assistencia/ticket/TicketHeader';
import {
  TicketAccessPanel,
  type TicketAccessPanelRef,
} from '@/components/assistencia/TicketAccessPanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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

import type {
  TicketRaw as Ticket,
  TicketMensagem as Mensagem,
  TicketAnexo as Anexo,
  TicketCategoria as Categoria,
} from '@/types/ticket';
import { statusConfig, prioridadeConfig } from '@/lib/ticketsConfig';

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
  const accessPanelRef = useRef<TicketAccessPanelRef>(null);
  const [showGalleryDialog, setShowGalleryDialog] = useState(false);
  const [editingLegenda, setEditingLegenda] = useState<{ id: string; legenda: string } | null>(
    null
  );
  const [updatingLegenda, setUpdatingLegenda] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const handleOpenEditMode = () => {
    if (!ticket) return;
    setClosureData({
      km_fim: ticket.km_fim?.toString() || '',
      combustivel_fim: ticket.combustivel_fim || 'meio',
      adblue_fim: 'Cheio',
      limpeza_fim: 'Limpa',
      valor_reparacao: ticket.valor_reparacao?.toString() || '',
      cobrar_motorista: ticket.cobrar_motorista,
      descricao_reparacao: ticket.descricao || '',
      numero_fatura: (ticket as any).numero_fatura || '',
    });
    setClosureDecisao(ticket.cobrar_motorista ? 'motorista' : 'empresa');
    setIsEditMode(true);
    setShowClosureForm(true);
  };

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
    const list = mediaList.filter(
      (a) =>
        a.tipo_ficheiro === 'foto' ||
        a.tipo_ficheiro === 'video' ||
        a.ficheiro_url?.match(/\.(jpg|jpeg|png|webp|mp4|webm|mov|ogg)$/i)
    );
    const newIndex = list.findIndex((a) => a.id === mediaList[index].id);
    if (newIndex === -1) return;

    setCurrentMediaList(list);
    setCurrentMediaIndex(newIndex);
    setLightboxOpen(true);
  };

  const nextMedia = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentMediaIndex((prev) => (prev + 1) % currentMediaList.length);
  };

  const prevMedia = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentMediaIndex((prev) => (prev - 1 + currentMediaList.length) % currentMediaList.length);
  };

  // closure states
  const [showClosureForm, setShowClosureForm] = useState(false);
  const [closureLoading, setClosureLoading] = useState(false);
  const [closureData, setClosureData] = useState({
    km_fim: '',
    combustivel_fim: 'meio',
    adblue_fim: 'Cheio',
    limpeza_fim: 'Limpa',
    valor_reparacao: '',
    cobrar_motorista: true,
    descricao_reparacao: '',
    numero_fatura: '',
  });
  const [faturaFile, setFaturaFile] = useState<File | null>(null);
  const [exitMediaFiles, setExitMediaFiles] = useState<
    { url: string; path: string; type: 'image' | 'video' }[]
  >([]);
  const faturaInputRef = useRef<HTMLInputElement>(null);

  // Substituta
  const [viaturaSubstituta, setViaturaSubstituta] = useState<Viatura | null>(null);
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [viaturasDisponiveis, setViaturasDisponiveis] = useState<Viatura[]>([]);
  const [substituteSearch, setSubstituteSearch] = useState('');
  const [assigningSubstitute, setAssigningSubstitute] = useState(false);

  // Decisões de fecho
  const [closureDecisao, setClosureDecisao] = useState<'motorista' | 'empresa' | 'aberto' | null>(
    'empresa'
  );
  const [closureSubstDecisao, setClosureSubstDecisao] = useState<'devolver' | 'definitivo' | null>(
    null
  );

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
            filter: `ticket_id=eq.${id}`,
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
            filter: `ticket_id=eq.${id}`,
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
    // Scroll mais agressivo para garantir que o ScrollArea renderizou
    const scrollTimeout = setTimeout(() => {
      scrollToBottom();
    }, 200);

    return () => clearTimeout(scrollTimeout);
  }, [mensagens, loading]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  const fetchTicketData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

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
        supabase
          .from('viaturas')
          .select('id, matricula, marca, modelo, km_atual')
          .eq('id', ticketData.viatura_id)
          .single(),
        ticketData.motorista_id
          ? supabase
              .from('motoristas_ativos')
              .select('id, nome, telefone')
              .eq('id', ticketData.motorista_id)
              .single()
          : supabase
              .from('motorista_viaturas')
              .select('motoristas_ativos!motorista_id(id, nome, telefone)')
              .eq('viatura_id', ticketData.viatura_id)
              .eq('status', 'ativo')
              .is('data_fim', null)
              .maybeSingle()
              .then(({ data }) => ({
                data: (data as any)?.motoristas_ativos || null,
                error: null,
              })),
        ticketData.categoria_id
          ? supabase
              .from('assistencia_categorias')
              .select('id, nome, cor')
              .eq('id', ticketData.categoria_id)
              .single()
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
      await fetchMensagensAndAnexos(ticketData.id);
      await accessPanelRef.current?.fetchAcessos(ticketData.id);
    } catch (error: any) {
      console.error('Erro ao carregar ticket:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes do ticket.',
        variant: 'destructive',
      });
      navigate('/assistencia');
    } finally {
      setLoading(false);
    }
  };

  const fetchMensagensAndAnexos = async (ticketIdOverride?: string) => {
    const targetId = ticketIdOverride || id;
    if (!targetId) return;

    try {
      const [mensagensRes, anexosRes] = await Promise.all([
        supabase
          .from('assistencia_mensagens')
          .select('id, mensagem, tipo, created_at, autor_id')
          .eq('ticket_id', targetId)
          .order('created_at', { ascending: true }),
        supabase
          .from('assistencia_anexos')
          .select('*')
          .eq('ticket_id', targetId)
          .order('created_at', { ascending: false }),
      ]);

      if (mensagensRes.error) console.error('Erro mensagens:', mensagensRes.error);
      if (anexosRes.error) console.error('Erro anexos:', anexosRes.error);

      // 1. Processar Anexos Primeiro
      const rawAnexos = anexosRes.data || [];
      const formattedAnexos = rawAnexos.map((a) => {
        let url = a.ficheiro_url;
        let bucket = 'assistencia-anexos';

        if (!url) {
          console.warn(`Anexo ${a.id} sem URL.`);
        } else if (url.startsWith('blob:')) {
          // Se for um blob URL, tentamos reconstruir com base nos padrões conhecidos
          if (a.nome_ficheiro) {
            // Padrão AssistenciaNova: assistencia/USER_ID/FILENAME
            const pathCheckin = `assistencia/${a.uploaded_by || 'unknown'}/${a.nome_ficheiro}`;
            const {
              data: { publicUrl },
            } = supabase.storage.from('assistencia-anexos').getPublicUrl(pathCheckin);
            url = publicUrl;
          }
        } else if (url.startsWith('http')) {
          // Detetar bucket a partir do URL completo
          const bucketMatch = url.match(
            /\/storage\/v1\/object\/(?:public|authenticated|sign)\/([^\/]+)\/(.+)$/
          );
          if (bucketMatch) {
            bucket = bucketMatch[1];
            const path = bucketMatch[2].split('?')[0];
            const {
              data: { publicUrl },
            } = supabase.storage.from(bucket).getPublicUrl(path);
            url = publicUrl;
          }
        } else {
          // Caminho relativo - se não começa com 'assistencia/', provavelmente é do bucket 'viaturas' (danos)
          if (!url.startsWith('assistencia/') && !url.includes('/')) {
            // Se for apenas um nome de arquivo sem pasta, pode ser o padrão antigo do ticket
            url = `${targetId}/${url}`;
          }

          if (!url.startsWith('assistencia/')) {
            bucket = 'viaturas';
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from(bucket).getPublicUrl(url);
          url = publicUrl;
        }

        let tipo = (a as any).tipo_inspecao;
        if (!tipo) {
          if (
            a.nome_ficheiro?.toLowerCase().includes('saida') ||
            a.nome_ficheiro?.toLowerCase().includes('checkout')
          ) {
            tipo = 'checkout';
          } else {
            tipo = 'checkin';
          }
        }
        return { ...a, ficheiro_url: url, tipo_inspecao: tipo };
      });

      setAnexos(formattedAnexos as Anexo[]);

      // 2. Processar Mensagens
      if (mensagensRes.data) {
        const autorIds = [...new Set(mensagensRes.data.map((m) => m.autor_id).filter(Boolean))];
        const { data: autores } = await supabase
          .from('profiles')
          .select('id, nome, cargo, grupo:cargo_id(nome)')
          .in('id', autorIds);

        const msgsComAutor = mensagensRes.data.map((m) => {
          let msgAnexos = formattedAnexos.filter((a) => a.mensagem_id === m.id);

          // Se for a mensagem de check-in inicial, incluir anexos de check-in órfãos
          if (
            m.mensagem.startsWith('Ticket criado com check-in completo') &&
            msgAnexos.length === 0
          ) {
            msgAnexos = formattedAnexos.filter(
              (a) => a.tipo_inspecao === 'checkin' && !a.mensagem_id
            );
          }

          // Se for a mensagem de checkout, incluir anexos de checkout órfãos
          if (m.mensagem.toLowerCase().startsWith('viatura reparada') && msgAnexos.length === 0) {
            msgAnexos = formattedAnexos.filter(
              (a) => a.tipo_inspecao === 'checkout' && !a.mensagem_id
            );
          }

          return {
            ...m,
            anexos: msgAnexos,
            autor: autores?.find((a) => a.id === m.autor_id) || null,
          };
        });

        setMensagens(msgsComAutor as any);
      }
    } catch (error) {
      console.error('Erro ao atualizar mensagens e anexos:', error);
    }
  };

  const handleUpdateLegenda = async () => {
    if (!editingLegenda) return;

    setUpdatingLegenda(true);
    try {
      const { error } = await supabase
        .from('assistencia_anexos')
        .update({ legenda: editingLegenda.legenda })
        .eq('id', editingLegenda.id);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Legenda atualizada.' });
      setEditingLegenda(null);
      fetchMensagensAndAnexos();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setUpdatingLegenda(false);
    }
  };

  const handleSendMessage = async () => {
    if (!novaMensagem.trim() && selectedFiles.length === 0) return;

    try {
      setSending(true);

      // Criar mensagem primeiro (mesmo que só tenha ficheiros)
      const textoMensagem =
        novaMensagem.trim() || (selectedFiles.length > 0 ? 'Enviou ficheiro(s)' : '');
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

          const {
            data: { publicUrl },
          } = supabase.storage.from('assistencia-anexos').getPublicUrl(fileName);

          await supabase.from('assistencia_anexos').insert({
            ticket_id: id,
            mensagem_id: mensagemInserida.id,
            nome_ficheiro: file.name,
            ficheiro_url: fileName,
            tipo_ficheiro: file.type,
            tamanho: file.size,
            uploaded_by: user?.id,
          });
        }
        setUploading(false);
      }

      // Enviar webhook ticket_resposta
      if (mensagemInserida) {
        const [{ data: ticketCompleto }, { data: autorProfile }, { data: criadorProfile }] =
          await Promise.all([
            supabase
              .from('assistencia_tickets')
              .select(
                `
              *,
              viatura:viaturas(id, matricula, marca, modelo, cor, ano),
              motorista:motoristas_ativos(id, nome, email, telefone, codigo),
              categoria:assistencia_categorias(id, nome, cor)
            `
              )
              .eq('id', id)
              .single(),
            supabase.from('profiles').select('nome, cargo').eq('id', user?.id).single(),
            supabase.from('profiles').select('nome, cargo').eq('id', ticket?.criado_por).single(),
          ]);

        supabase.functions
          .invoke('send-webhook', {
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
          })
          .catch((err) => console.error('Erro ao enviar webhook ticket_resposta:', err));
      }

      setNovaMensagem('');
      setSelectedFiles([]);
      fetchTicketData(true);

      toast({
        title: 'Sucesso',
        description: 'Mensagem enviada com sucesso.',
      });
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem.',
        variant: 'destructive',
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
      setIsEditMode(false);
      setClosureData((prev) => ({
        ...prev,
        km_fim: viatura?.km_atual?.toString() || '',
        cobrar_motorista: !!motorista,
      }));
      setShowClosureForm(true);
      return;
    }

    try {
      const updates: any = { status: newStatus };

      const { error } = await supabase.from('assistencia_tickets').update(updates).eq('id', id);

      if (error) throw error;

      // Log status change
      await supabase.from('assistencia_mensagens').insert({
        ticket_id: id,
        autor_id: user?.id,
        mensagem: `Estado alterado para: ${statusConfig[newStatus]?.label || newStatus}`,
        tipo: 'status_change',
      });

      toast({
        title: 'Sucesso',
        description: 'Estado do ticket atualizado.',
      });

      fetchTicketData();
    } catch (error: any) {
      console.error('Erro ao atualizar estado:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o estado.',
        variant: 'destructive',
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

      await supabase.from('viaturas').update({ status: 'manutencao' }).eq('id', viatura.id);

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
      await supabase
        .from('assistencia_tickets')
        .update({ viatura_substituta_id: viaturaId })
        .eq('id', ticket.id);
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
      toast({
        title: 'Erro',
        description: 'Informe a quilometragem final.',
        variant: 'destructive',
      });
      return;
    }
    if (ticket.km_inicio != null && parseInt(closureData.km_fim) < ticket.km_inicio) {
      toast({
        title: 'Erro',
        description: `A KM final (${closureData.km_fim}) não pode ser inferior à KM inicial (${ticket.km_inicio}).`,
        variant: 'destructive',
      });
      return;
    }
    if (!closureDecisao) {
      toast({
        title: 'Erro',
        description: 'Indique a responsabilidade financeira da reparação.',
        variant: 'destructive',
      });
      return;
    }
    if (ticket?.viatura_substituta_id && !closureSubstDecisao) {
      toast({
        title: 'Erro',
        description: 'Indique o destino da viatura substituta.',
        variant: 'destructive',
      });
      return;
    }
    // Media files are now optional as per user request

    try {
      setClosureLoading(true);
      const valor = closureData.valor_reparacao ? parseFloat(closureData.valor_reparacao) : 0;
      const kmFim = parseInt(closureData.km_fim);

      let reparacaoId = (ticket as any).reparacao_id;

      // 1. Criar ou Atualizar a Reparação
      if (isEditMode && reparacaoId) {
        const { error: repError } = await supabase
          .from('viatura_reparacoes')
          .update({
            descricao: closureData.descricao_reparacao || ticket.titulo,
            custo: valor,
            km_entrada: ticket.km_inicio,
            registado_por: user?.id,
            motorista_responsavel_id: motorista?.id || null,
            cobrar_motorista: closureDecisao === 'motorista',
            status_financeiro: closureDecisao,
          })
          .eq('id', reparacaoId);
        if (repError) throw repError;
      } else {
        const { data: novoReparacao, error: repError } = await supabase
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
            cobrar_motorista: closureDecisao === 'motorista',
            valor_a_cobrar: closureDecisao === 'motorista' ? valor : null,
            data_inicio_cobranca:
              closureDecisao === 'motorista' ? new Date().toISOString().split('T')[0] : null,
            status_financeiro: closureDecisao,
          })
          .select()
          .single();

        if (repError) throw repError;
        reparacaoId = novoReparacao?.id;
      }

      // 2. Upload da fatura
      let faturaUrl: string | null = (ticket as any).fatura_url || null;
      if (faturaFile) {
        const fileExt = faturaFile.name.split('.').pop();
        const fileName = `faturas/${id}/${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('assistencia-anexos')
          .upload(fileName, faturaFile);
        if (uploadErr) throw uploadErr;

        const {
          data: { publicUrl },
        } = supabase.storage.from('assistencia-anexos').getPublicUrl(fileName);

        faturaUrl = publicUrl;
      }

      // 3. Salvar Anexos de Saída (apenas se novos ficheiros foram selecionados)
      if (exitMediaFiles.length > 0) {
        const anexosSaida = exitMediaFiles.map((file) => ({
          ticket_id: id,
          tipo_ficheiro: file.type === 'image' ? 'foto' : 'video',
          ficheiro_url: file.path,
          nome_ficheiro: file.path.split('/').pop() || 'anexo_saida',
          uploaded_by: user?.id,
          tipo_inspecao: 'checkout',
        }));
        await supabase.from('assistencia_anexos').insert(anexosSaida);

        // TAMBÉM salvar como "Dano" da viatura para histórico centralizado (Check-out)
        const { data: novoDano, error: danoError } = await supabase
          .from('viatura_danos')
          .insert({
            viatura_id: viatura.id,
            motorista_id: motorista?.id || null,
            ticket_id: id,
            descricao: `Check-out de Assistência #${String(ticket.numero).padStart(4, '0')}`,
            localizacao: 'outro',
            estado: 'reparado', // No checkout assumimos que foi resolvido ou registado o estado final
            data_registo: new Date().toISOString().split('T')[0],
            registado_por: user?.id,
            observacoes: `Registado automaticamente no fecho da assistência: ${ticket.titulo}`,
          })
          .select()
          .single();

        if (!danoError && novoDano) {
          const fotosDano = exitMediaFiles
            .filter((f) => f.type === 'image')
            .map((file) => ({
              dano_id: novoDano.id,
              ficheiro_url: file.path,
              nome_ficheiro: file.path.split('/').pop() || 'foto_checkout',
              uploaded_by: user?.id,
            }));

          if (fotosDano.length > 0) {
            await supabase.from('viatura_dano_fotos').insert(fotosDano);
          }
        }
      }

      // 4. Lançamento Financeiro
      if (reparacaoId) {
        if (isEditMode) {
          // Tentar atualizar lançamento existente
          const { data: existingFin } = await supabase
            .from('motorista_financeiro')
            .select('id')
            .eq('reparacao_id', reparacaoId)
            .maybeSingle();

          if (existingFin && closureDecisao === 'motorista' && valor > 0) {
            await supabase
              .from('motorista_financeiro')
              .update({
                valor: valor,
                descricao: `Reparação Viatura: ${viatura.matricula} - ${closureData.descricao_reparacao || ticket.titulo}`,
                referencia: faturaUrl
                  ? `Ticket #${ticket.numero} | ${faturaUrl}`
                  : `Ticket #${ticket.numero}`,
              })
              .eq('id', existingFin.id);
          } else if (!existingFin && closureDecisao === 'motorista' && valor > 0) {
            // Se não existia mas agora é motorista, criar
            await supabase.from('motorista_financeiro').insert({
              motorista_id: motorista?.id,
              tipo: 'debito',
              categoria: 'reparacao',
              descricao: `Reparação Viatura: ${viatura.matricula} - ${closureData.descricao_reparacao || ticket.titulo}`,
              valor: valor,
              data_movimento: new Date().toISOString().split('T')[0],
              status: 'pendente',
              reparacao_id: reparacaoId,
              referencia: faturaUrl
                ? `Ticket #${ticket.numero} | ${faturaUrl}`
                : `Ticket #${ticket.numero}`,
            });
          } else if (existingFin && closureDecisao !== 'motorista') {
            // Se existia mas agora não é motorista, remover ou zerar? Remover é melhor se for erro.
            await supabase.from('motorista_financeiro').delete().eq('id', existingFin.id);
          }
        } else if (closureDecisao === 'motorista' && motorista?.id && valor > 0) {
          const refBase = `Ticket #${ticket.numero}`;
          await supabase.from('motorista_financeiro').insert({
            motorista_id: motorista.id,
            tipo: 'debito',
            categoria: 'reparacao',
            descricao: `Reparação Viatura: ${viatura.matricula} - ${closureData.descricao_reparacao || ticket.titulo}`,
            valor: valor,
            data_movimento: new Date().toISOString().split('T')[0],
            status: 'pendente',
            reparacao_id: reparacaoId,
            referencia: faturaUrl ? `${refBase} | ${faturaUrl}` : refBase,
          });
        }
      }

      // 5. Atualizar o Ticket
      const ticketUpdates: any = {
        km_fim: kmFim,
        combustivel_fim: closureData.combustivel_fim,
        valor_reparacao: valor,
        cobrar_motorista: closureDecisao === 'motorista',
        numero_fatura: closureData.numero_fatura.trim() || null,
        fatura_url: faturaUrl,
        reparacao_id: reparacaoId,
      };

      if (!isEditMode) {
        ticketUpdates.status = 'resolvido';
        ticketUpdates.data_resolucao = new Date().toISOString();
      }

      const { error: ticketUpdateError } = await supabase
        .from('assistencia_tickets')
        .update(ticketUpdates)
        .eq('id', id);
      if (ticketUpdateError) throw ticketUpdateError;

      // 6. Atualizar Viatura original (apenas se não for edit ou se for reassociar)
      if (!isEditMode) {
        const viaturaOriginalStatus = motorista?.id ? 'em_uso' : 'disponivel';
        await supabase
          .from('viaturas')
          .update({ status: viaturaOriginalStatus, km_atual: kmFim })
          .eq('id', viatura.id);

        // 7a. Reassociar motorista
        if (motorista?.id) {
          const { data: existingAssoc } = await supabase
            .from('motorista_viaturas')
            .select('id')
            .eq('motorista_id', motorista.id)
            .eq('viatura_id', viatura.id)
            .eq('status', 'ativo')
            .is('data_fim', null)
            .maybeSingle();

          if (!existingAssoc) {
            await supabase.from('motorista_viaturas').insert({
              motorista_id: motorista.id,
              viatura_id: viatura.id,
              data_inicio: new Date().toISOString().split('T')[0],
              status: 'ativo',
              tipo: 'normal',
            });
          }
        }

        // 7b. Tratar viatura substituta
        if (ticket?.viatura_substituta_id && motorista?.id) {
          if (closureSubstDecisao === 'devolver') {
            await supabase
              .from('motorista_viaturas')
              .update({ data_fim: new Date().toISOString().split('T')[0], status: 'encerrado' })
              .eq('viatura_id', ticket.viatura_substituta_id)
              .eq('motorista_id', motorista.id)
              .eq('tipo', 'substituta')
              .is('data_fim', null);
            await supabase
              .from('viaturas')
              .update({ status: 'disponivel' })
              .eq('id', ticket.viatura_substituta_id);
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

        // 8. Log status change
        const checkoutMessage =
          `Viatura reparada com check-out completo - ` +
          `KM Final: ${kmFim} - ` +
          `Combustível: ${closureData.combustivel_fim} - ` +
          `Valor Total: ${valor}€ - ` +
          `Responsabilidade: ${closureDecisao === 'motorista' ? 'Motorista' : 'Empresa'}` +
          (closureData.descricao_reparacao
            ? ` - Descrição: ${closureData.descricao_reparacao}`
            : '');

        await supabase.from('assistencia_mensagens').insert({
          ticket_id: id,
          autor_id: user?.id,
          mensagem: checkoutMessage,
          tipo: 'status_change',
        });
      }

      toast({
        title: isEditMode ? 'Atualizado' : 'Sucesso',
        description: isEditMode
          ? 'Detalhes da reparação atualizados.'
          : 'Viatura reparada e assistência concluída.',
      });

      setShowClosureForm(false);
      setFaturaFile(null);
      setClosureDecisao('empresa');
      setClosureSubstDecisao(null);
      // 9. Notificar gestores se não houver fatura
      if (!isEditMode && !faturaUrl && !faturaFile) {
        console.log('Ticket concluído sem fatura. Notificando gestores...');
        supabase.functions
          .invoke('send-assistance-notification', {
            body: { ticket_id: id, tipo: 'falta_fatura' },
          })
          .catch((err) => console.error('Erro ao enviar notificação de falta de fatura:', err));
      }

      fetchTicketData();
    } catch (error: any) {
      console.error('Erro ao concluir reparação:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível concluir a reparação.',
        variant: 'destructive',
      });
    } finally {
      setClosureLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
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

  const renderMessageContent = (msg: Mensagem) => {
    const text = msg.mensagem;
    if (text.startsWith('Ticket criado com check-in completo')) {
      const parts = text.split(' - ');
      const data: Record<string, string> = {};

      parts.forEach((part) => {
        if (part.includes(': ')) {
          const [key, ...val] = part.split(': ');
          data[key.trim()] = val.join(': ').trim();
        }
      });

      return (
        <div className="bg-background/40 backdrop-blur-sm border border-primary/20 rounded-xl p-4 my-2 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-primary/10 pb-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm text-primary uppercase tracking-wider">
              Check-in de Entrada Efetuado
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Gauge className="h-3 w-3 text-blue-500" /> KM Inicial
              </span>
              <p className="text-sm font-mono font-bold">{data['KM Inicial'] || '---'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Fuel className="h-3 w-3 text-orange-500" /> Combustível
              </span>
              <p className="text-sm font-bold">{data['Combustível'] || '---'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Droplets className="h-3 w-3 text-cyan-500" /> AdBlue
              </span>
              <p className="text-sm font-bold capitalize">{data['AdBlue'] || '---'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-yellow-500" /> Limpeza
              </span>
              <p className="text-sm font-bold capitalize">{data['Limpeza'] || '---'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Wallet className="h-3 w-3 text-green-500" /> Orçamento
              </span>
              <p className="text-sm font-bold">{data['Orçamento Estimado'] || '---'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Image className="h-3 w-3 text-purple-500" /> Media
              </span>
              <p className="text-sm font-bold">{data['Média']?.split(' ')[0] || '0'} ficheiros</p>
            </div>
          </div>
        </div>
      );
    }

    // Suporte para formato antigo de Checkout
    if (text.startsWith('Viatura Reparada. Valor:')) {
      return (
        <div className="bg-background/40 backdrop-blur-sm border border-green-500/20 rounded-xl p-4 my-2 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-green-500/10 pb-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="font-bold text-sm text-green-600 uppercase tracking-wider">
              Check-out de Saída Efetuado
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Gauge className="h-3 w-3 text-blue-500" /> KM Final
              </span>
              <p className="text-sm font-mono font-bold">{ticket?.km_fim || '---'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Fuel className="h-3 w-3 text-orange-500" /> Combustível
              </span>
              <p className="text-sm font-bold capitalize">{ticket?.combustivel_fim || '---'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Droplets className="h-3 w-3 text-cyan-500" /> AdBlue
              </span>
              <p className="text-sm font-bold capitalize">---</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-yellow-500" /> Limpeza
              </span>
              <p className="text-sm font-bold capitalize">---</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Wallet className="h-3 w-3 text-green-500" /> Valor Total
              </span>
              <p className="text-sm font-bold">
                {ticket?.valor_reparacao ? ticket.valor_reparacao + '€' : '---'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Image className="h-3 w-3 text-purple-500" /> Media
              </span>
              <p className="text-sm font-bold">{msg.anexos?.length || 0} ficheiros</p>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-green-500/10">
            <p className="text-[10px] text-muted-foreground italic">{text}</p>
          </div>
        </div>
      );
    }

    if (text.startsWith('Viatura reparada com check-out completo')) {
      const parts = text.split(' - ');
      const data: Record<string, string> = {};

      parts.forEach((part) => {
        if (part.includes(': ')) {
          const [key, ...val] = part.split(': ');
          data[key.trim()] = val.join(': ').trim();
        }
      });

      return (
        <div className="bg-background/40 backdrop-blur-sm border border-green-500/20 rounded-xl p-4 my-2 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-green-500/10 pb-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="font-bold text-sm text-green-600 uppercase tracking-wider">
              Check-out de Saída Efetuado
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Gauge className="h-3 w-3 text-blue-500" /> KM Final
              </span>
              <p className="text-sm font-mono font-bold">
                {data['KM Final'] || ticket?.km_fim || '---'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Fuel className="h-3 w-3 text-orange-500" /> Combustível
              </span>
              <p className="text-sm font-bold capitalize">
                {data['Combustível'] || ticket?.combustivel_fim || '---'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Droplets className="h-3 w-3 text-cyan-500" /> AdBlue
              </span>
              <p className="text-sm font-bold capitalize">{data['AdBlue'] || '---'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-yellow-500" /> Limpeza
              </span>
              <p className="text-sm font-bold capitalize">{data['Limpeza'] || '---'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Wallet className="h-3 w-3 text-green-500" /> Valor Total
              </span>
              <p className="text-sm font-bold">
                {data['Valor Total'] ||
                  (ticket?.valor_reparacao ? ticket.valor_reparacao + '€' : '---')}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                <Image className="h-3 w-3 text-purple-500" /> Media
              </span>
              <p className="text-sm font-bold">{data['Média'] || '0 ficheiros'}</p>
            </div>
          </div>

          {(data['Descrição'] || ticket?.descricao) && (
            <div className="mt-4 pt-2 border-t border-green-500/10">
              <span className="text-[10px] uppercase text-muted-foreground font-bold block mb-1">
                Resumo da Reparação
              </span>
              <p className="text-xs italic text-muted-foreground">
                "{data['Descrição'] || ticket?.descricao}"
              </p>
            </div>
          )}
        </div>
      );
    }

    return <p className="text-sm whitespace-pre-wrap">{text}</p>;
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
  const hasExplicitAccess = acessos.some((a) => a.id === user?.id);

  // Qualquer pessoa com acesso (Dono, Manager, Admin ou Acesso Explícito)
  const hasAccess = isTicketOwner || isAssistanceManager || isAdmin || hasExplicitAccess;

  const canReply = hasAccess;
  const canManageAccess = hasAccess; // Agora qualquer pessoa com acesso pode convidar outros
  const canChangeStatus = isAssistanceManager || isAdmin; // Manter a alteração de estado para gestores/admin

  return (
    <div className="flex flex-col p-4 md:p-6 gap-6 bg-background lg:h-[calc(100vh-64px)] lg:overflow-hidden">
      <TicketHeader
        ticket={ticket}
        categoria={categoria}
        acessos={acessos}
        canChangeStatus={canChangeStatus}
        canManageAccess={canManageAccess}
        onBack={() => navigate(isFromMeusTickets ? '/meus-tickets' : '/assistencia')}
        onOpenAccesses={() => accessPanelRef.current?.openAllDialog()}
        onAddAccess={() => accessPanelRef.current?.openAddDialog()}
        onOpenEditMode={handleOpenEditMode}
        onStatusChange={handleStatusChange}
      />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:flex-1 lg:min-h-0">
        {/* Main Content (Chat) */}
        <div className="lg:col-span-3 flex flex-col lg:min-h-0">
          {/* Messages */}
          <Card className="flex flex-col lg:flex-1 border-none shadow-md lg:overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b bg-muted/30 py-3 shrink-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Conversação em Tempo Real
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex flex-col flex-1 lg:min-h-0">
              <div className="overflow-y-auto h-[55vh] lg:h-auto lg:max-h-none lg:flex-1 p-4">
                {mensagens.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 italic">
                    Ainda não há mensagens neste ticket.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {mensagens.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.tipo === 'status_change' &&
                          !msg.mensagem.startsWith('Ticket criado') &&
                          !msg.mensagem.toLowerCase().startsWith('viatura reparada')
                            ? 'bg-muted/50 text-center text-sm'
                            : msg.autor?.id === user?.id
                              ? 'bg-primary/10 ml-4 sm:ml-8'
                              : 'bg-muted mr-4 sm:mr-8'
                        }`}
                      >
                        {msg.tipo !== 'status_change' && (
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-sm">
                              {msg.autor?.nome || 'Sistema'}
                            </span>
                            {(msg.autor?.cargo || getAutorRole(msg.autor?.id)) && (
                              <Badge
                                variant="outline"
                                className={
                                  (msg.autor?.cargo || getAutorRole(msg.autor?.id)) === 'Gestor' ||
                                  (msg.autor?.cargo || '').includes('Gestor')
                                    ? 'border-blue-500 text-blue-500 text-xs py-0 px-1.5'
                                    : 'border-green-500 text-green-500 text-xs py-0 px-1.5'
                                }
                              >
                                {msg.autor?.grupo?.nome ||
                                  msg.autor?.cargo ||
                                  getAutorRole(msg.autor?.id)}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(msg.created_at), 'dd/MM/yyyy HH:mm', { locale: pt })}
                            </span>
                          </div>
                        )}
                        {msg.tipo !== 'anexo' && (
                          <div className={msg.tipo === 'status_change' ? 'italic' : ''}>
                            {renderMessageContent(msg)}
                          </div>
                        )}

                        {/* Anexos inline na conversação */}
                        {msg.anexos && msg.anexos.length > 0 && (
                          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-w-3xl">
                            {msg.anexos.map((anexo) => {
                              const isImage =
                                anexo.tipo_ficheiro?.startsWith('image/') ||
                                anexo.tipo_ficheiro === 'foto' ||
                                anexo.ficheiro_url?.match(/\.(jpg|jpeg|png|webp)$/i);
                              return (
                                <div
                                  key={anexo.id}
                                  className="flex flex-col bg-background rounded border overflow-hidden"
                                >
                                  {isImage && (
                                    <div
                                      className="relative cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() =>
                                        openLightbox(
                                          msg.anexos || [],
                                          (msg.anexos || []).indexOf(anexo)
                                        )
                                      }
                                    >
                                      <img
                                        src={anexo.ficheiro_url}
                                        alt={anexo.nome_ficheiro}
                                        className="w-full aspect-square object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src =
                                            'https://placehold.co/400x300?text=Imagem+Indispon%C3%ADvel';
                                        }}
                                      />
                                      {anexo.legenda && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 backdrop-blur-sm italic">
                                          "{anexo.legenda}"
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {!isImage &&
                                    (anexo.tipo_ficheiro === 'video' ||
                                      anexo.ficheiro_url?.match(/\.(mp4|webm|mov|ogg)$/i)) && (
                                      <div
                                        className="relative cursor-pointer hover:opacity-90 transition-opacity bg-black flex items-center justify-center aspect-square"
                                        onClick={() =>
                                          openLightbox(
                                            msg.anexos || [],
                                            (msg.anexos || []).indexOf(anexo)
                                          )
                                        }
                                      >
                                        <video
                                          src={anexo.ficheiro_url}
                                          className="w-full h-full object-cover opacity-60"
                                          preload="metadata"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <Play className="h-10 w-10 text-white opacity-90 drop-shadow-md" />
                                        </div>
                                      </div>
                                    )}

                                  {!isImage &&
                                    anexo.tipo_ficheiro !== 'video' &&
                                    !anexo.ficheiro_url?.match(/\.(mp4|webm|mov|ogg)$/i) && (
                                      <div className="flex items-center gap-2 p-2">
                                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="flex-1 text-xs truncate">
                                          {anexo.nome_ficheiro}
                                        </span>
                                      </div>
                                    )}

                                  {/* Ações compactas */}
                                  <div className="flex items-center justify-end gap-1 px-1 pb-1 pt-0.5">
                                    <a
                                      href={anexo.ficheiro_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 hover:bg-muted rounded"
                                      title="Ver"
                                    >
                                      <Eye className="h-3 w-3 text-muted-foreground" />
                                    </a>
                                    <a
                                      href={anexo.ficheiro_url}
                                      download={anexo.nome_ficheiro}
                                      className="p-1 hover:bg-muted rounded"
                                      title="Descarregar"
                                    >
                                      <Download className="h-3 w-3 text-muted-foreground" />
                                    </a>
                                    {(isAdmin || hasAccessToResource('assistencia_tickets')) && (
                                      <button
                                        onClick={() =>
                                          setEditingLegenda({
                                            id: anexo.id,
                                            legenda: anexo.legenda || '',
                                          })
                                        }
                                        className="p-1 hover:bg-muted rounded text-primary"
                                        title="Editar Legenda"
                                      >
                                        <Wrench className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <Separator />

              {/* Message input area */}
              <div className="bg-muted/30 border-t p-4 space-y-3">
                {/* Selected files preview */}
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-background border shadow-sm px-2 py-1.5 rounded-md text-xs animate-in zoom-in-95"
                      >
                        {getFileIcon(file.type)}
                        <span className="max-w-[150px] truncate font-medium">{file.name}</span>
                        <button
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => removeSelectedFile(index)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input and Buttons */}
                {canReply ? (
                  <div className="flex items-end gap-3 bg-background border rounded-xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <div className="flex flex-col gap-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        onChange={handleFileSelect}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sending}
                        title="Anexar ficheiros"
                      >
                        <Paperclip className="h-5 w-5" />
                      </Button>
                    </div>

                    <Textarea
                      placeholder="Escreva uma mensagem..."
                      value={novaMensagem}
                      onChange={(e) => setNovaMensagem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (novaMensagem.trim() || selectedFiles.length > 0) {
                            handleSendMessage();
                          }
                        }
                      }}
                      className="flex-1 min-h-[44px] max-h-[200px] border-none shadow-none focus-visible:ring-0 resize-none py-2.5 px-0 text-sm"
                      disabled={sending}
                    />

                    <Button
                      size="icon"
                      className="h-10 w-10 rounded-full shrink-0 shadow-md transition-all active:scale-95"
                      onClick={handleSendMessage}
                      disabled={sending || (!novaMensagem.trim() && selectedFiles.length === 0)}
                    >
                      {sending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-2 px-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 text-sm italic">
                    Não tens permissão para responder a este ticket.
                  </div>
                )}

                <p className="hidden sm:block text-[10px] text-muted-foreground text-center">
                  Prime{' '}
                  <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border bg-muted px-1 font-mono text-[9px] font-medium opacity-100">
                    Enter
                  </kbd>{' '}
                  para enviar,{' '}
                  <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border bg-muted px-1 font-mono text-[9px] font-medium opacity-100">
                    Shift + Enter
                  </kbd>{' '}
                  para nova linha.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <TicketSidebar
          ticket={ticket}
          anexos={anexos}
          viatura={viatura}
          motorista={motorista}
          criador={criador}
          onOpenGallery={() => setShowGalleryDialog(true)}
        />
      </div>

      <TicketAccessPanel
        ref={accessPanelRef}
        ticketId={id!}
        criadoPor={ticket.criado_por}
        canManageAccess={canManageAccess}
        onAcessosChange={setAcessos}
      />

      {/* Modal de seleção de viatura substituta */}
      <TicketSubstitutaModal
        open={showSubstituteModal}
        onOpenChange={setShowSubstituteModal}
        viaturasDisponiveis={viaturasDisponiveis}
        search={substituteSearch}
        onSearchChange={setSubstituteSearch}
        assigning={assigningSubstitute}
        onSelect={handleAtribuirSubstituta}
      />
      <TicketMediaLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        mediaList={currentMediaList}
        currentIndex={currentMediaIndex}
        onNext={nextMedia}
        onPrev={prevMedia}
        onDownload={downloadMedia}
      />

      {/* Modal Editar Legenda */}
      <TicketLegendaDialog
        open={!!editingLegenda}
        legenda={editingLegenda?.legenda || ''}
        saving={updatingLegenda}
        onLegendaChange={(legenda) =>
          setEditingLegenda((prev) => (prev ? { ...prev, legenda } : null))
        }
        onSave={handleUpdateLegenda}
        onClose={() => setEditingLegenda(null)}
      />

      {/* Modal Concluir / Editar Reparação */}
      <TicketClosureDialog
        open={showClosureForm}
        isEditMode={isEditMode}
        closureLoading={closureLoading}
        closureData={closureData}
        closureDecisao={closureDecisao}
        closureSubstDecisao={closureSubstDecisao}
        ticket={ticket}
        viatura={viatura}
        viaturaSubstituta={viaturaSubstituta}
        faturaFile={faturaFile}
        onClosureDataChange={(data) => setClosureData((prev) => ({ ...prev, ...data }))}
        onDecisaoChange={setClosureDecisao}
        onSubstDecisaoChange={setClosureSubstDecisao}
        onFaturaChange={setFaturaFile}
        onExitMediaChange={setExitMediaFiles}
        onSubmit={handleViaturaReparada}
        onClose={() => {
          setShowClosureForm(false);
          setIsEditMode(false);
          setClosureDecisao('empresa');
          setClosureSubstDecisao(null);
        }}
      />

      <TicketGalleryDialog
        open={showGalleryDialog}
        onOpenChange={setShowGalleryDialog}
        anexos={anexos}
        ticketNumero={ticket.numero}
        onOpenLightbox={openLightbox}
      />
    </div>
  );
};

export default TicketDetails;
