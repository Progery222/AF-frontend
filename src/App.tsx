import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { ToastProvider } from '@/components/Toast'
import { AuthGate } from '@/components/AuthGate'
import { LoginPage } from '@/pages/Login'
import { DashboardPage } from '@/pages/Dashboard'
import { PhonesPage } from '@/pages/Phones'
import { StatusPage } from '@/pages/Status'
import { FeedPage } from '@/pages/Feed'
import { SocialPage } from '@/pages/Social'
import { ScreenPage } from '@/pages/Screen'
import { ContentPage } from '@/pages/Content'
import { VideoPage } from '@/pages/Video'
import { FSMPage } from '@/pages/FSM'
import { ScenariosPage } from '@/pages/Scenarios'
import { ControlsPage } from '@/pages/Controls'
import { AppsPage } from '@/pages/Apps'

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <AuthGate>
              <Layout>
                <AppRoutes />
              </Layout>
            </AuthGate>
          }
        />
      </Routes>
    </ToastProvider>
  )
}

function AppRoutes() {
  return (
    <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/phones" element={<PhonesPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/social" element={<SocialPage />} />
          <Route path="/screen" element={<ScreenPage />} />
          <Route path="/content" element={<ContentPage />} />
          <Route path="/video" element={<VideoPage />} />
          <Route path="/scenarios" element={<ScenariosPage />} />
          <Route path="/fsm" element={<FSMPage />} />
          <Route path="/controls" element={<ControlsPage />} />
          <Route path="/apps" element={<AppsPage />} />
          <Route path="/app" element={<Navigate to="/apps" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
  )
}
