import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Dashboard from './pages/Dashboard'

// Mock user data for testing
// const mockUser = {
//   id: '1',
//   email: 'test@recovr.com',
//   firstName: 'Test',
//   lastName: 'User',
//   username: 'testuser',
//   isVerified: true
// };

// Simple test app to showcase our enhanced components
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 py-8">
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                RecovR - Enhanced Dashboard Test
              </h1>
              <p className="text-gray-600">
                Testing the improved Life Tree, Streak Counter, Daily Tasks, and Crisis Button
              </p>
            </div>
            
            {/* Mock authentication context */}
            <div className="auth-provider-mock">
              <Dashboard />
            </div>
          </div>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App