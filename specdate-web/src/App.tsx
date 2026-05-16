import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AlertProvider } from './components/AlertProvider'
import { CookieConsent } from './components/CookieConsent'
import AdminContactPage from './pages/AdminContactPage'
import AdminCreditFinancialsPage from './pages/AdminCreditFinancialsPage'
import AdminManagementPage from './pages/AdminManagementPage'
import AdminInvitePage from './pages/AdminInvitePage'
import AdminMediaModerationPage from './pages/AdminMediaModerationPage'
import AdminFinancialsPage from './pages/AdminFinancialsPage'
import AdminVoucherFinancialsPage from './pages/AdminVoucherFinancialsPage'
import AdminModerationCasesPage from './pages/AdminModerationCasesPage'
import AdminModerationPage from './pages/AdminModerationPage'
import AdminPage from './pages/AdminPage'
import AdminProviderInvitesPage from './pages/AdminProviderInvitesPage'
import AdminProvidersPage from './pages/AdminProvidersPage'
import AdminRiskPage from './pages/AdminRiskPage'
import AdminSupportPage from './pages/AdminSupportPage'
import AdminSuccessStoriesPage from './pages/AdminSuccessStoriesPage'
import AdminUsersPage from './pages/AdminUsersPage'
import ContactPage from './pages/ContactPage'
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
import ProviderDetailPage from './pages/ProviderDetailPage'
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
          <Route path="/contact" element={<ContactPage />} />
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
          <Route path="/providers/:providerId" element={<ProviderDetailPage />} />
          <Route path="/register/provider" element={<ProviderRegisterPage />} />
          <Route path="/register/provider/verify" element={<ProviderRegistrationOtpPage />} />
          <Route path="/register/provider/success" element={<ProviderRegistrationSuccessPage />} />
          <Route path="/provider/setup-password" element={<ProviderPasswordSetupPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/providers" element={<AdminProvidersPage />} />
          <Route path="/admin/provider-invites" element={<AdminProviderInvitesPage />} />
          <Route path="/admin/financials" element={<AdminFinancialsPage />} />
          <Route path="/admin/financials/vouchers" element={<AdminVoucherFinancialsPage />} />
          <Route path="/admin/financials/credits" element={<AdminCreditFinancialsPage />} />
          <Route path="/admin/media-moderation" element={<AdminMediaModerationPage />} />
          <Route path="/admin/moderation/cases" element={<AdminModerationCasesPage />} />
          <Route path="/admin/moderation" element={<AdminModerationPage />} />
          <Route path="/admin/moderation/appeals" element={<AdminModerationPage />} />
          <Route path="/admin/risk" element={<AdminRiskPage />} />
          <Route path="/admin/support" element={<AdminSupportPage />} />
          <Route path="/admin/contact" element={<AdminContactPage />} />
          <Route path="/admin/success-stories" element={<AdminSuccessStoriesPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/admin-management" element={<AdminManagementPage />} />
          <Route path="/admin/invite" element={<AdminInvitePage />} />
        </Routes>
        <CookieConsent />
      </BrowserRouter>
    </AlertProvider>
  )
}
