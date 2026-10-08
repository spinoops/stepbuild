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
import QuoteTemplatesPage from '@/pages/QuoteTemplatesPage'
import CollaboratorsPage from '@/pages/CollaboratorsPage'
import BreakdownTemplatesPage from '@/pages/BreakdownTemplatesPage'
import UsersPage from '@/pages/UsersPage'
import SettingsPage from '@/pages/SettingsPage'
import StockPage from '@/pages/StockPage'
import StockShell from '@/components/stock/StockShell'
import { useAuth } from '@/auth/AuthContext'
import { isStockOnly } from '@/lib/roles'
import ProtectedRoute from '@/components/ProtectedRoute'
import RoleRoute from '@/components/RoleRoute'
import AppLayout from '@/components/AppLayout'
import PagePane from '@/components/PagePane'

export default function App() {
  const { user } = useAuth()

  // Rôle stock seul : une coque réduite et une seule vue, quelle que soit l'adresse demandée.
  if (isStockOnly(user)) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<StockShell />}>
            <Route path="/stock" element={<StockPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/stock" replace />} />
      </Routes>
    )
  }

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
            <Route path="/modeles-devis" element={<QuoteTemplatesPage />} />
            <Route path="/collaborateurs" element={<CollaboratorsPage />} />
            <Route path="/sous-details-types" element={<BreakdownTemplatesPage />} />
            <Route path="/stock" element={<StockPage />} />
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
