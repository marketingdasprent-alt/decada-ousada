import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { usePageTracking } from '@/hooks/usePageTracking';
import { RECURSOS } from '@/utils/permissions';

import EntradaNativa from '@/pages/EntradaNativa';
import EntradaMotoristaNativa from '@/pages/motorista/EntradaMotoristaNativa';
import LoginMotorista from '@/pages/motorista/LoginMotorista';
import PainelMotorista from '@/pages/motorista/PainelMotorista';
import RegistoMotorista from '@/pages/motorista/RegistoMotorista';
import ResetPassword from '@/pages/ResetPassword';

// Colaborador
import Login from '@/pages/Login';
import CRMContatos from '@/pages/CRMContatos';
import LeadDetails from '@/pages/LeadDetails';
import Motoristas from '@/pages/Motoristas';
import MotoristaDetalhe from '@/pages/MotoristaDetalhe';
import Viaturas from '@/pages/Viaturas';
import ViaturaDetalhe from '@/pages/ViaturaDetalhe';
import Contratos from '@/pages/Contratos';
import Assistencia from '@/pages/Assistencia';
import AssistenciaNova from '@/pages/AssistenciaNova';
import TicketDetails from '@/pages/TicketDetails';
import MyAccount from '@/pages/MyAccount';
import MotoristaCandidaturas from '@/pages/MotoristaCandidaturas';
import Calendario from '@/pages/Calendario';
import Administrativo from '@/pages/Administrativo';
import Marketing from '@/pages/Marketing';
import Dashboard from '@/pages/Dashboard';
import MeusTickets from '@/pages/MeusTickets';
import AdminSettings from '@/pages/AdminSettings';
import AdminInvites from '@/pages/AdminInvites';
import AdminDocumentos from '@/pages/AdminDocumentos';

const NativeAppRoutes = () => {
  usePageTracking();

  return (
    <Routes>
      {/* Landing — seleção Motorista / Colaborador */}
      <Route path="/" element={<EntradaNativa />} />

      {/* Rotas de Motorista */}
      <Route path="/motorista" element={<EntradaMotoristaNativa />} />
      <Route path="/motorista/login" element={<LoginMotorista />} />
      <Route path="/motorista/registo" element={<RegistoMotorista />} />
      <Route
        path="/motorista/painel"
        element={
          <ProtectedRoute requiredResource={RECURSOS.MOTORISTA_PAINEL}>
            <PainelMotorista />
          </ProtectedRoute>
        }
      />

      {/* Rotas de Colaborador */}
      <Route path="/login" element={<LoginMotorista />} />
      <Route path="/equipa" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/crm"
        element={
          <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_CRM}>
            <DashboardLayout><CRMContatos /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/crm/lead/:id"
        element={
          <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_CRM}>
            <DashboardLayout><LeadDetails /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/motoristas"
        element={
          <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_GESTAO}>
            <DashboardLayout><Motoristas /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/motoristas/:id"
        element={
          <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_GESTAO}>
            <DashboardLayout><MotoristaDetalhe /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/motoristas/candidaturas"
        element={
          <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_GESTAO}>
            <DashboardLayout><MotoristaCandidaturas /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/viaturas"
        element={
          <ProtectedRoute requiredResource={RECURSOS.VIATURAS_VER}>
            <DashboardLayout><Viaturas /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/viaturas/:id"
        element={
          <ProtectedRoute requiredResource={RECURSOS.VIATURAS_VER}>
            <DashboardLayout><ViaturaDetalhe /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contratos"
        element={
          <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_CONTRATOS}>
            <DashboardLayout><Contratos /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistencia"
        element={
          <ProtectedRoute requiredResource={RECURSOS.ASSISTENCIA_TICKETS}>
            <DashboardLayout><Assistencia /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistencia/nova"
        element={
          <ProtectedRoute requiredResource={RECURSOS.ASSISTENCIA_TICKETS}>
            <DashboardLayout><AssistenciaNova /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistencia/:id"
        element={
          <ProtectedRoute requiredResource={RECURSOS.ASSISTENCIA_TICKETS}>
            <DashboardLayout><TicketDetails /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-account"
        element={
          <ProtectedRoute>
            <DashboardLayout><MyAccount /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendario"
        element={
          <ProtectedRoute requiredResource={RECURSOS.CALENDARIO_VER}>
            <DashboardLayout><Calendario /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/financeiro"
        element={
          <ProtectedRoute requiredResource={RECURSOS.FINANCEIRO_RECIBOS}>
            <DashboardLayout><Administrativo /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing"
        element={
          <ProtectedRoute requiredResource={RECURSOS.MARKETING_VER}>
            <DashboardLayout><Marketing /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_GESTAO}>
            <DashboardLayout><Dashboard /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/meus-tickets"
        element={
          <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_CRM}>
            <DashboardLayout><MeusTickets /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/meus-tickets/:id"
        element={
          <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_CRM}>
            <DashboardLayout><TicketDetails /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute requireAdmin={true} requiredResource={RECURSOS.ADMIN_CONFIGURACOES}>
            <DashboardLayout><AdminSettings /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/invites"
        element={
          <ProtectedRoute requireAdmin={true} requiredResource={RECURSOS.ADMIN_UTILIZADORES}>
            <DashboardLayout><AdminInvites /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/documentos"
        element={
          <ProtectedRoute requiredResource={RECURSOS.ADMIN_DOCUMENTOS}>
            <DashboardLayout><AdminDocumentos /></DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default NativeAppRoutes;
