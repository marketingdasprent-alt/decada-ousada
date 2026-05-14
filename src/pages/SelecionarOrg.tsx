import React from 'react';
import { Building2 } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthMobileShell } from '@/components/auth/AuthMobileShell';

const SelecionarOrg = () => {
  const { orgs, switchOrg } = useTenant();

  return (
    <AuthMobileShell
      title="Selecionar Empresa"
      description="Pertence a várias empresas. Escolha onde pretende trabalhar."
      logoAlt="WeGest"
      headerIcon={<Building2 className="auth-icon-accent" />}
    >
      <div className="space-y-3">
        {orgs.map((org) => (
          <Card
            key={org.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => switchOrg(org.id)}
          >
            <CardHeader className="py-4 px-5">
              <div className="flex items-center gap-3">
                {org.logo_url ? (
                  <img src={org.logo_url} alt={org.nome} className="h-10 w-10 rounded-lg object-contain" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-base">{org.nome}</CardTitle>
                  <CardDescription className="text-xs">{org.codigo}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </AuthMobileShell>
  );
};

export default SelecionarOrg;
