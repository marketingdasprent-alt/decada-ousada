
import React from 'react';
import { Shield } from 'lucide-react';

interface AdminLoadingStateProps {
  message: string;
}

export const AdminLoadingState = ({ message }: AdminLoadingStateProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <Shield className="h-12 w-12 animate-pulse text-[#00C4B4] mx-auto mb-4" />
        <p className="text-white text-lg">{message}</p>
      </div>
    </div>
  );
};
