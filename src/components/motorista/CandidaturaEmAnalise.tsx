import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, LogOut, Clock, FileText, User, CheckCircle2 } from 'lucide-react';
import { Candidatura } from '@/pages/motorista/PainelMotorista';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface CandidaturaEmAnaliseProps {
  candidatura: Candidatura;
}

export const CandidaturaEmAnalise: React.FC<CandidaturaEmAnaliseProps> = ({
  candidatura,
}) => {
  const { signOut } = useAuth();

  const steps = [
    { id: 1, label: 'Registo', completed: true },
    { id: 2, label: 'Documentos enviados', completed: true },
    { id: 3, label: 'Em análise', completed: candidatura.status === 'em_analise', current: candidatura.status === 'submetido' },
    { id: 4, label: 'Decisão', completed: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 rota-liquida">
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
        {/* Status Card */}
        <Card className="bg-card/95 backdrop-blur border-border">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <CardTitle className="text-xl">Candidatura em Análise</CardTitle>
            <CardDescription>
              Os seus documentos estão a ser analisados pela nossa equipa. 
              Entraremos em contacto em breve.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {candidatura.data_submissao && (
              <p className="text-center text-sm text-muted-foreground">
                Submetida a {format(new Date(candidatura.data_submissao), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="bg-card/95 backdrop-blur border-border">
          <CardHeader>
            <CardTitle className="text-lg">Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-4 pb-6 last:pb-0">
                  <div className="relative flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.completed 
                        ? 'bg-green-500 text-white' 
                        : step.current 
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {step.completed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="text-sm font-medium">{step.id}</span>
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`absolute top-8 w-0.5 h-[calc(100%-8px)] ${
                        step.completed ? 'bg-green-500' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                  <div className="pt-1">
                    <p className={`font-medium ${
                      step.completed || step.current ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dados Submetidos */}
        <Card className="bg-card/95 backdrop-blur border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados Submetidos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nome</p>
                <p className="font-medium">{candidatura.nome}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{candidatura.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Telefone</p>
                <p className="font-medium">{candidatura.telefone || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">NIF</p>
                <p className="font-medium">{candidatura.nif || '-'}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-muted-foreground text-sm mb-2">Documentos enviados</p>
              <div className="flex flex-wrap gap-2">
                {candidatura.documento_ficheiro_url && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Documento ID
                  </Badge>
                )}
                {candidatura.carta_ficheiro_url && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Carta de Condução
                  </Badge>
                )}
                {candidatura.licenca_tvde_ficheiro_url && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Licença TVDE
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <p className="text-center text-sm text-muted-foreground">
          Se tiver alguma questão, contacte-nos através do email{' '}
          <a href="mailto:suporte@rotaliquida.pt" className="text-primary hover:underline">
            suporte@rotaliquida.pt
          </a>
        </p>
      </div>
    </div>
  );
};
