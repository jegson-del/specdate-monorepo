import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AlertProvider } from './components/AlertProvider'
import AdminModerationPage from './pages/AdminModerationPage'
import AdminPage from './pages/AdminPage'
import AdminProvidersPage from './pages/AdminProvidersPage'
import AdminSupportPage from './pages/AdminSupportPage'
import AdminUsersPage from './pages/AdminUsersPage'
import GetStartedPage from './pages/GetStartedPage'
import HomePage from './pages/HomePage'
import ProvidersBrowsePage from './pages/ProvidersBrowsePage'
import ProviderPasswordSetupPage from './pages/ProviderPasswordSetupPage'
import ProviderRegisterPage from './pages/ProviderRegisterPage'

export default function App() {
  return (
    <AlertProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/get-started" element={<GetStartedPage />} />
          <Route path="/providers" element={<ProvidersBrowsePage />} />
          <Route path="/register/provider" element={<ProviderRegisterPage />} />
          <Route path="/provider/setup-password" element={<ProviderPasswordSetupPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/providers" element={<AdminProvidersPage />} />
          <Route path="/admin/moderation" element={<AdminModerationPage />} />
          <Route path="/admin/support" element={<AdminSupportPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
        </Routes>
      </BrowserRouter>
    </AlertProvider>
  )
}
