import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, LogOut, XCircle, RefreshCw } from 'lucide-react';
import { Candidatura } from '@/pages/motorista/PainelMotorista';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface CandidaturaRejeitadaProps {
  candidatura: Candidatura;
  onResubmit: () => void;
}

export const CandidaturaRejeitada: React.FC<CandidaturaRejeitadaProps> = ({
  candidatura,
  onResubmit,
}) => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [resubmitting, setResubmitting] = React.useState(false);

  const handleResubmit = async () => {
    setResubmitting(true);
    try {
      const { error } = await supabase
        .from('motorista_candidaturas')
        .update({
          status: 'rascunho',
          data_decisao: null,
          motivo_rejeicao: null,
          decidido_por: null,
        })
        .eq('id', candidatura.id);

      if (error) throw error;

      toast({
        title: 'Candidatura reaberta',
        description: 'Pode agora atualizar os seus dados e submeter novamente.',
      });

      onResubmit();
    } catch (error: any) {
      console.error('Erro ao reabrir candidatura:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível reabrir a candidatura.',
        variant: 'destructive',
      });
    } finally {
      setResubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background rota-liquida">
      {/* Header */}
      <div className="bg-card/50 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Área do Motorista</h1>
            </div>
          </div>
          
          <Button variant="ghost" size="icon" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Rejection Card */}
        <Card className="bg-card/95 backdrop-blur border-border border-destructive/20">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-xl text-destructive">Candidatura Não Aprovada</CardTitle>
            <CardDescription>
              Infelizmente, a sua candidatura não foi aprovada nesta fase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {candidatura.data_decisao && (
              <p className="text-center text-sm text-muted-foreground mb-4">
                Decisão tomada a {format(new Date(candidatura.data_decisao), "dd 'de' MMMM 'de' yyyy", { locale: pt })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Motivo */}
        {candidatura.motivo_rejeicao && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Motivo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{candidatura.motivo_rejeicao}</p>
            </CardContent>
          </Card>
        )}

        {/* Resubmit Option */}
        <Card className="bg-card/95 backdrop-blur border-border">
          <CardHeader>
            <CardTitle className="text-lg">Submeter Novamente</CardTitle>
            <CardDescription>
              Se desejar, pode atualizar os seus dados e documentos e submeter uma nova candidatura.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleResubmit} 
              disabled={resubmitting}
              className="w-full"
            >
              {resubmitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  A processar...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Editar e Resubmeter
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Contact */}
        <p className="text-center text-sm text-muted-foreground">
          Se tiver dúvidas sobre a decisão, contacte-nos:{' '}
          <a href="mailto:suporte@rotaliquida.pt" className="text-primary hover:underline">
            suporte@rotaliquida.pt
          </a>
        </p>
      </div>
    </div>
  );
};
