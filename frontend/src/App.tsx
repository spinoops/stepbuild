import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import DashboardPage from '@/pages/DashboardPage'
import ProjectsPage from '@/pages/ProjectsPage'
import ClientsPage from '@/pages/ClientsPage'
import DailyReportsPage from '@/pages/DailyReportsPage'
import RegiePage from '@/pages/RegiePage'
import HoursControlPage from '@/pages/HoursControlPage'
import DocumentsPage from '@/pages/DocumentsPage'
import StatsPage from '@/pages/StatsPage'
import CatalogPage from '@/pages/CatalogPage'
import PriceListsPage from '@/pages/PriceListsPage'
import UsersPage from '@/pages/UsersPage'
import SettingsPage from '@/pages/SettingsPage'
import ProtectedRoute from '@/components/ProtectedRoute'
import RoleRoute from '@/components/RoleRoute'
import AppLayout from '@/components/AppLayout'
import PagePane from '@/components/PagePane'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Accessible à tous les rôles (l'ouvrier ne voit ni prix ni marges) */}
          <Route path="/dashboard" element={<PagePane><DashboardPage /></PagePane>} />
          <Route path="/projets" element={<ProjectsPage />} />
          <Route path="/rapports" element={<DailyReportsPage />} />

          {/* Gestion : admin + responsable */}
          <Route element={<RoleRoute roles={['admin', 'responsable']} />}>
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/regie" element={<RegiePage />} />
            <Route path="/controle-heures" element={<HoursControlPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/statistiques" element={<StatsPage />} />
            <Route path="/catalogue" element={<CatalogPage />} />
            <Route path="/listes-prix" element={<PriceListsPage />} />
          </Route>

          {/* Administration : admin uniquement */}
          <Route element={<RoleRoute roles={['admin']} />}>
            <Route path="/users" element={<PagePane><UsersPage /></PagePane>} />
            <Route path="/settings" element={<PagePane><SettingsPage /></PagePane>} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
