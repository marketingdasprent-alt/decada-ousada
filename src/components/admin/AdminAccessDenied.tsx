
import React from 'react';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export const AdminAccessDenied = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito</h2>
        <p className="text-gray-400 mb-4">
          Apenas administradores podem acessar esta página.
        </p>
        <Button 
          onClick={() => window.location.href = '/crm'}
          className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold"
        >
          Voltar ao CRM
        </Button>
      </div>
    </div>
  );
};
