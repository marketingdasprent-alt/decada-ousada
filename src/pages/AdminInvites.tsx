
import React, { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { PromoteAdminForm } from '@/components/admin/PromoteAdminForm';
import { InviteGenerationForm } from '@/components/admin/InviteGenerationForm';
import { GeneratedInviteDisplay } from '@/components/admin/GeneratedInviteDisplay';
import { AdminLoadingState } from '@/components/admin/AdminLoadingState';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

const AdminInvites = () => {
  const [generatedLink, setGeneratedLink] = useState('');
  const { isAdmin, loading: adminLoading } = usePermissions();

  if (adminLoading) {
    return <AdminLoadingState message="Verificando permissões..." />;
  }

  if (!isAdmin) {
    return <AdminAccessDenied />;
  }

  const handleInviteGenerated = (link: string) => {
    setGeneratedLink(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-900/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <PromoteAdminForm />
          
          <InviteGenerationForm onInviteGenerated={handleInviteGenerated} />

          {generatedLink && (
            <GeneratedInviteDisplay inviteLink={generatedLink} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminInvites;
