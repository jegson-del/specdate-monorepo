import { BrowserRouter, Route, Routes } from 'react-router-dom'
import GetStartedPage from './pages/GetStartedPage'
import HomePage from './pages/HomePage'
import ProvidersBrowsePage from './pages/ProvidersBrowsePage'
import ProviderPasswordSetupPage from './pages/ProviderPasswordSetupPage'
import ProviderRegisterPage from './pages/ProviderRegisterPage'
import { AlertProvider } from './components/AlertProvider'

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
        </Routes>
      </BrowserRouter>
    </AlertProvider>
  )
}
