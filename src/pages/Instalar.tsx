import { useState, useEffect } from "react";
import { Download, Smartphone, Share, MoreVertical, Plus, ArrowDown, CheckCircle2, Zap, Wifi, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useThemedLogo } from "@/hooks/useThemedLogo";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Instalar() {
  const logoSrc = useThemedLogo();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const benefits = [
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Acesso Rápido",
      description: "Abra a app diretamente do ecrã inicial"
    },
    {
      icon: <Wifi className="h-5 w-5" />,
      title: "Funciona Offline",
      description: "Aceda aos dados mesmo sem internet"
    },
    {
      icon: <Bell className="h-5 w-5" />,
      title: "Notificações",
      description: "Receba alertas importantes em tempo real"
    }
  ];

  if (isInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">App Instalada!</CardTitle>
            <CardDescription>
              A aplicação Década Ousada já está instalada no seu dispositivo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.location.href = "/"}>
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background px-6 pt-12 pb-8 text-center">
        <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-card border shadow-lg flex items-center justify-center">
          <img 
            src={logoSrc} 
            alt="Década Ousada" 
            className="w-14 h-14 object-contain"
          />
        </div>
        <h1 className="text-3xl font-bold mb-2">Instalar App</h1>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Adicione a Década Ousada ao seu ecrã inicial para acesso rápido
        </p>
      </div>

      <div className="px-6 pb-12 space-y-8">
        {/* Benefits */}
        <div className="grid gap-4">
          {benefits.map((benefit, index) => (
            <Card key={index} className="border-0 shadow-sm bg-card/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="font-medium">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Install Button (Android/Desktop with prompt) */}
        {deferredPrompt && (
          <Button 
            size="lg" 
            className="w-full h-14 text-lg gap-2"
            onClick={handleInstallClick}
          >
            <Download className="h-5 w-5" />
            Instalar Aplicação
          </Button>
        )}

        {/* iOS Instructions */}
        {isIOS && !deferredPrompt && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Instruções para iPhone/iPad</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-start">
                <Badge variant="outline" className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center p-0">
                  1
                </Badge>
                <div className="flex items-center gap-2">
                  <span>Toque no botão</span>
                  <Share className="h-5 w-5 text-primary" />
                  <span>Partilhar</span>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <Badge variant="outline" className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center p-0">
                  2
                </Badge>
                <div>
                  <span>Deslize para baixo e selecione </span>
                  <span className="font-medium">"Adicionar ao Ecrã principal"</span>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <Badge variant="outline" className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center p-0">
                  3
                </Badge>
                <div>
                  <span>Toque em </span>
                  <span className="font-medium">"Adicionar"</span>
                  <span> no canto superior direito</span>
                </div>
              </div>

              <div className="mt-4 p-4 bg-muted rounded-lg text-center">
                <ArrowDown className="h-6 w-6 mx-auto mb-2 text-muted-foreground animate-bounce" />
                <p className="text-sm text-muted-foreground">
                  Procure o ícone <Share className="inline h-4 w-4" /> na barra inferior do Safari
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Instructions (fallback) */}
        {isAndroid && !deferredPrompt && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Instruções para Android</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-start">
                <Badge variant="outline" className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center p-0">
                  1
                </Badge>
                <div className="flex items-center gap-2">
                  <span>Toque no menu</span>
                  <MoreVertical className="h-5 w-5 text-primary" />
                  <span>do navegador</span>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <Badge variant="outline" className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center p-0">
                  2
                </Badge>
                <div className="flex items-center gap-2">
                  <span>Selecione </span>
                  <Plus className="h-4 w-4" />
                  <span className="font-medium">"Adicionar ao ecrã inicial"</span>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <Badge variant="outline" className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center p-0">
                  3
                </Badge>
                <div>
                  <span>Confirme tocando em </span>
                  <span className="font-medium">"Adicionar"</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop Instructions */}
        {!isMobile && !deferredPrompt && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instalar no Computador</CardTitle>
              <CardDescription>
                Use o Chrome, Edge ou outro navegador compatível
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-start">
                <Badge variant="outline" className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center p-0">
                  1
                </Badge>
                <div>
                  Procure o ícone <Download className="inline h-4 w-4" /> na barra de endereço
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <Badge variant="outline" className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center p-0">
                  2
                </Badge>
                <div>
                  <span>Clique em </span>
                  <span className="font-medium">"Instalar"</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back button */}
        <div className="text-center pt-4">
          <Button variant="ghost" onClick={() => window.location.href = "/"}>
            Voltar ao site
          </Button>
        </div>
      </div>
    </div>
  );
}
