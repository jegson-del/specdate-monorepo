import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AlertProvider } from './components/AlertProvider'
import AdminMediaModerationPage from './pages/AdminMediaModerationPage'
import AdminModerationCasesPage from './pages/AdminModerationCasesPage'
import AdminModerationPage from './pages/AdminModerationPage'
import AdminPage from './pages/AdminPage'
import AdminProvidersPage from './pages/AdminProvidersPage'
import AdminRiskPage from './pages/AdminRiskPage'
import AdminSupportPage from './pages/AdminSupportPage'
import AdminUsersPage from './pages/AdminUsersPage'
import {
  consumerHealthDataPrivacyPolicy,
  cookiePolicy,
  privacyPolicy,
  privacyRequest,
  safeDatingAdvice,
  termsOfUse,
  trustAndSafety,
} from './data/legalPages'
import GetStartedPage from './pages/GetStartedPage'
import HomePage from './pages/HomePage'
import LegalArticlePage from './pages/LegalArticlePage'
import ProvidersBrowsePage from './pages/ProvidersBrowsePage'
import ProviderPasswordSetupPage from './pages/ProviderPasswordSetupPage'
import ProviderRegistrationOtpPage, {
  ProviderRegistrationSuccessPage,
} from './pages/ProviderRegistrationOtpPage'
import ProviderRegisterPage from './pages/ProviderRegisterPage'

export default function App() {
  return (
    <AlertProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/get-started" element={<GetStartedPage />} />
          <Route path="/terms" element={<LegalArticlePage page={termsOfUse} />} />
          <Route path="/privacy" element={<LegalArticlePage page={privacyPolicy} />} />
          <Route path="/cookie-policy" element={<LegalArticlePage page={cookiePolicy} />} />
          <Route path="/trustandsafety" element={<LegalArticlePage page={trustAndSafety} />} />
          <Route
            path="/consumer-health-data-privacy-policy"
            element={<LegalArticlePage page={consumerHealthDataPrivacyPolicy} />}
          />
          <Route
            path="/safe-dating-advice"
            element={<LegalArticlePage page={safeDatingAdvice} />}
          />
          <Route
            path="/privacy-request"
            element={<LegalArticlePage page={privacyRequest} />}
          />
          <Route path="/providers" element={<ProvidersBrowsePage />} />
          <Route path="/register/provider" element={<ProviderRegisterPage />} />
          <Route path="/register/provider/verify" element={<ProviderRegistrationOtpPage />} />
          <Route path="/register/provider/success" element={<ProviderRegistrationSuccessPage />} />
          <Route path="/provider/setup-password" element={<ProviderPasswordSetupPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/providers" element={<AdminProvidersPage />} />
          <Route path="/admin/media-moderation" element={<AdminMediaModerationPage />} />
          <Route path="/admin/moderation/cases" element={<AdminModerationCasesPage />} />
          <Route path="/admin/moderation" element={<AdminModerationPage />} />
          <Route path="/admin/moderation/appeals" element={<AdminModerationPage />} />
          <Route path="/admin/risk" element={<AdminRiskPage />} />
          <Route path="/admin/support" element={<AdminSupportPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
        </Routes>
      </BrowserRouter>
    </AlertProvider>
  )
}
