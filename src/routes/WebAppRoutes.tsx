import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import ScrollToTop from '@/components/ScrollToTop';
import { usePageTracking } from '@/hooks/usePageTracking';
import { RECURSOS } from '@/utils/permissions';
import CRMContatos from '@/pages/CRMContatos';
import Motoristas from '@/pages/Motoristas';
import Viaturas from '@/pages/Viaturas';
import ViaturaDetalhe from '@/pages/ViaturaDetalhe';
import Contratos from '@/pages/Contratos';
import Formularios from '@/pages/Formularios';
import FormularioPublico from '@/pages/FormularioPublico';
import DasprentLeads from '@/pages/DasprentLeads';
import DasprentFuncionarios from '@/pages/DasprentFuncionarios';
import AdminInvites from '@/pages/AdminInvites';
import AdminSettings from '@/pages/AdminSettings';
import AdminDocumentos from '@/pages/AdminDocumentos';
import MotoristaCandidaturas from '@/pages/MotoristaCandidaturas';
import MyAccount from '@/pages/MyAccount';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ResetPassword from '@/pages/ResetPassword';
import Obrigado from '@/pages/Obrigado';
import NotFound from '@/pages/NotFound';
import LeadDetails from '@/pages/LeadDetails';
import Sobre from '@/pages/Sobre';
import Contactos from '@/pages/Contactos';
import FAQ from '@/pages/FAQ';
import Termos from '@/pages/Termos';
import Privacidade from '@/pages/Privacidade';
import RegistoMotorista from '@/pages/motorista/RegistoMotorista';
import LoginMotorista from '@/pages/motorista/LoginMotorista';
import PainelMotorista from '@/pages/motorista/PainelMotorista';
import Assistencia from '@/pages/Assistencia';
import AssistenciaNova from '@/pages/AssistenciaNova';
import TicketDetails from '@/pages/TicketDetails';
import Dashboard from '@/pages/Dashboard';
import MeusTickets from '@/pages/MeusTickets';
import Administrativo from '@/pages/Administrativo';
import Instalar from '@/pages/Instalar';
import Calendario from '@/pages/Calendario';
import Marketing from '@/pages/Marketing';
import MotoristaDetalhe from '@/pages/MotoristaDetalhe';
import Index from '@/pages/Index';

const WebAppRoutes = () => {
  usePageTracking();

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/sobre" element={<Sobre />} />
        <Route path="/contactos" element={<Contactos />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/termos" element={<Termos />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/formulario/:id" element={<FormularioPublico />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/obrigado" element={<Obrigado />} />
        <Route path="/motorista" element={<Navigate to="/motorista/login" replace />} />
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
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_GESTAO}>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm"
          element={
            <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_CRM}>
              <DashboardLayout>
                <CRMContatos />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/lead/:id"
          element={
            <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_CRM}>
              <DashboardLayout>
                <LeadDetails />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contatos"
          element={
            <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_CONTACTOS}>
              <DashboardLayout>
                <CRMContatos />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contratos"
          element={
            <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_CONTRATOS}>
              <DashboardLayout>
                <Contratos />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/motoristas"
          element={
            <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_GESTAO}>
              <DashboardLayout>
                <Motoristas />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/motoristas/:id"
          element={
            <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_GESTAO}>
              <DashboardLayout>
                <MotoristaDetalhe />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/viaturas"
          element={
            <ProtectedRoute requiredResource={RECURSOS.VIATURAS_VER}>
              <DashboardLayout>
                <Viaturas />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/viaturas/:id"
          element={
            <ProtectedRoute requiredResource={RECURSOS.VIATURAS_VER}>
              <DashboardLayout>
                <ViaturaDetalhe />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/motoristas/candidaturas"
          element={
            <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_GESTAO}>
              <DashboardLayout>
                <MotoristaCandidaturas />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dasprent-leads"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DasprentLeads />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dasprent-funcionarios"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DasprentFuncionarios />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/invites"
          element={
            <ProtectedRoute requireAdmin={true} requiredResource={RECURSOS.ADMIN_UTILIZADORES}>
              <DashboardLayout>
                <AdminInvites />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requireAdmin={true} requiredResource={RECURSOS.ADMIN_CONFIGURACOES}>
              <DashboardLayout>
                <AdminSettings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/documentos"
          element={
            <ProtectedRoute requiredResource={RECURSOS.ADMIN_DOCUMENTOS}>
              <DashboardLayout>
                <AdminDocumentos />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/formularios"
          element={
            <ProtectedRoute requiredResource={RECURSOS.ADMIN_FORMULARIOS}>
              <DashboardLayout>
                <Formularios />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/meus-tickets"
          element={
            <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_CRM}>
              <DashboardLayout>
                <MeusTickets />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/meus-tickets/:id"
          element={
            <ProtectedRoute requiredResource={RECURSOS.MOTORISTAS_CRM}>
              <DashboardLayout>
                <TicketDetails />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assistencia/nova"
          element={
            <ProtectedRoute requiredResource={RECURSOS.ASSISTENCIA_TICKETS}>
              <DashboardLayout>
                <AssistenciaNova />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assistencia"
          element={
            <ProtectedRoute requiredResource={RECURSOS.ASSISTENCIA_TICKETS}>
              <DashboardLayout>
                <Assistencia />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assistencia/:id"
          element={
            <ProtectedRoute requiredResource={RECURSOS.ASSISTENCIA_TICKETS}>
              <DashboardLayout>
                <TicketDetails />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/administrativo"
          element={
            <ProtectedRoute requiredResource={RECURSOS.FINANCEIRO_RECIBOS}>
              <DashboardLayout>
                <Administrativo />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro"
          element={
            <ProtectedRoute requiredResource={RECURSOS.FINANCEIRO_RECIBOS}>
              <DashboardLayout>
                <Administrativo />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendario"
          element={
            <ProtectedRoute requiredResource={RECURSOS.CALENDARIO_VER}>
              <DashboardLayout>
                <Calendario />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketing"
          element={
            <ProtectedRoute requiredResource={RECURSOS.MARKETING_VER}>
              <DashboardLayout>
                <Marketing />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-account"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <MyAccount />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/instalar" element={<Instalar />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default WebAppRoutes;
