import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Navbar } from './components/Navbar'
import { NotificationToast } from './components/NotificationToast'

// Pages
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProgramsPage } from './pages/ProgramsPage'
import { ProgramDetailsPage } from './pages/ProgramDetailsPage'
import { CheckInPage } from './pages/CheckInPage'
import { CommunityPage } from './pages/CommunityPage'
import { GroupDetailsPage } from './pages/GroupDetailsPage'
import { ProgressPage } from './pages/ProgressPage'
import { CrisisPage } from './pages/CrisisPage'
import { ContentBlockerPage } from './pages/ContentBlockerPage'
import { MessagingPage } from './pages/MessagingPage'
import { ModerationDashboardPage } from './pages/ModerationDashboardPage'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { PremiumPage } from './pages/PremiumPage'
import { NotFoundPage } from './pages/NotFoundPage'
import ChatbotPage from './pages/ChatbotPage'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="pb-16 md:pb-0">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/premium" element={<PremiumPage />} />
                
                {/* Protected Routes */}
                <Route path="/onboarding" element={
                  <ProtectedRoute>
                    <OnboardingPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/programs" element={
                  <ProtectedRoute>
                    <ProgramsPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/programs/:programId" element={
                  <ProtectedRoute>
                    <ProgramDetailsPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/checkin" element={
                  <ProtectedRoute>
                    <CheckInPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/community" element={
                  <ProtectedRoute>
                    <CommunityPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/groups/:groupId" element={
                  <ProtectedRoute>
                    <GroupDetailsPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/progress" element={
                  <ProtectedRoute>
                    <ProgressPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/crisis" element={
                  <ProtectedRoute>
                    <CrisisPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/blocker" element={
                  <ProtectedRoute>
                    <ContentBlockerPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/messaging" element={
                  <ProtectedRoute>
                    <MessagingPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/moderation" element={
                  <ProtectedRoute>
                    <ModerationDashboardPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } />
                
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/ai-companion" element={
                  <ProtectedRoute>
                    <ChatbotPage />
                  </ProtectedRoute>
                } />
                
                {/* 404 Route */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <NotificationToast />
          </div>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App