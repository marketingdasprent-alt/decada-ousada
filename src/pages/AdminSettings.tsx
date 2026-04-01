import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { AdminLoadingState } from '@/components/admin/AdminLoadingState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersTab } from '@/components/admin/UsersTab';
import { GruposTab } from '@/components/admin/GruposTab';
import { DocumentosTab } from '@/components/admin/DocumentosTab';
import { FormulariosTab } from '@/components/admin/FormulariosTab';
import { CategoriasAssistenciaTab } from '@/components/admin/CategoriasAssistenciaTab';
import { IntegracoesTab } from '@/components/admin/IntegracoesTab';
const AdminSettings = () => {
  const { isAdmin, loading } = usePermissions();

  if (loading) {
    return <AdminLoadingState message="Verificando permissões..." />;
  }

  if (!isAdmin) {
    return <AdminAccessDenied />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent hidden dark:block" />
      <div className="absolute inset-0 bg-grid-foreground/[0.02] bg-[size:60px_60px] hidden dark:block" />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Configurações do Sistema</h1>
          <p className="text-muted-foreground">
            Gerir utilizadores, grupos, documentos, formulários e categorias
          </p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-card border border-border">
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Utilizadores
            </TabsTrigger>
            <TabsTrigger value="grupos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Grupos
            </TabsTrigger>
            <TabsTrigger value="documentos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Documentos
            </TabsTrigger>
            <TabsTrigger value="formularios" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Formulários
            </TabsTrigger>
            <TabsTrigger value="categorias" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Assistência
            </TabsTrigger>
            <TabsTrigger value="integracoes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Integrações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <UsersTab />
          </TabsContent>

          <TabsContent value="grupos" className="mt-6">
            <GruposTab />
          </TabsContent>

          <TabsContent value="documentos" className="mt-6">
            <DocumentosTab />
          </TabsContent>

          <TabsContent value="formularios" className="mt-6">
            <FormulariosTab />
          </TabsContent>

          <TabsContent value="categorias" className="mt-6">
            <CategoriasAssistenciaTab />
          </TabsContent>

          <TabsContent value="integracoes" className="mt-6">
            <IntegracoesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminSettings;
