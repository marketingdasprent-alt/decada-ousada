import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, LogOut, CheckCircle2, FileText, Calendar } from 'lucide-react';
import { Candidatura } from '@/pages/motorista/PainelMotorista';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface CandidaturaAprovadaProps {
  candidatura: Candidatura;
}

export const CandidaturaAprovada: React.FC<CandidaturaAprovadaProps> = ({
  candidatura,
}) => {
  const { signOut } = useAuth();

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
        {/* Success Card */}
        <Card className="bg-card/95 backdrop-blur border-border border-green-500/20">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-xl text-green-500">Candidatura Aprovada!</CardTitle>
            <CardDescription>
              Parabéns! A sua candidatura foi aprovada e já faz parte da frota Rota Líquida.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {candidatura.data_decisao && (
              <p className="text-center text-sm text-muted-foreground">
                Aprovada a {format(new Date(candidatura.data_decisao), "dd 'de' MMMM 'de' yyyy", { locale: pt })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="bg-card/95 backdrop-blur border-border">
          <CardHeader>
            <CardTitle className="text-lg">Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Assinatura do Contrato</h4>
                <p className="text-sm text-muted-foreground">
                  A nossa equipa irá contactá-lo para agendar a assinatura do contrato de prestação de serviços.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Formação Inicial</h4>
                <p className="text-sm text-muted-foreground">
                  Após a assinatura, receberá informações sobre a formação inicial e entrega da viatura.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Car className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Início de Atividade</h4>
                <p className="text-sm text-muted-foreground">
                  Quando estiver tudo pronto, poderá iniciar a sua atividade como motorista TVDE connosco.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-card/95 backdrop-blur border-border">
          <CardHeader>
            <CardTitle className="text-lg">Os Seus Dados</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
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
            <div className="col-span-2">
              <p className="text-muted-foreground">Morada</p>
              <p className="font-medium">{candidatura.morada}, {candidatura.cidade}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <p className="text-center text-sm text-muted-foreground">
          Questões? Contacte-nos:{' '}
          <a href="mailto:suporte@rotaliquida.pt" className="text-primary hover:underline">
            suporte@rotaliquida.pt
          </a>
        </p>
      </div>
    </div>
  );
};
