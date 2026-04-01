import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { usePageTracking } from '@/hooks/usePageTracking';
import { RECURSOS } from '@/utils/permissions';
import ResetPassword from '@/pages/ResetPassword';
import EntradaMotoristaNativa from '@/pages/motorista/EntradaMotoristaNativa';
import LoginMotorista from '@/pages/motorista/LoginMotorista';
import PainelMotorista from '@/pages/motorista/PainelMotorista';
import RegistoMotorista from '@/pages/motorista/RegistoMotorista';

const NativeAppRoutes = () => {
  usePageTracking();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/motorista" replace />} />
      <Route path="/motorista" element={<EntradaMotoristaNativa />} />
      <Route path="/motorista/login" element={<LoginMotorista />} />
      <Route path="/motorista/registo" element={<RegistoMotorista />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/motorista/painel"
        element={
          <ProtectedRoute requiredResource={RECURSOS.MOTORISTA_PAINEL}>
            <PainelMotorista />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/motorista" replace />} />
    </Routes>
  );
};

export default NativeAppRoutes;
