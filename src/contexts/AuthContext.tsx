import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api } from '../utils/api'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  username: string
  profilePictureUrl?: string
  isVerified: boolean
  preferences?: Record<string, any>
  privacySettings?: Record<string, any>
}

interface AuthContextType {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateUser: (data: Partial<User>) => Promise<void>
  refreshToken: () => Promise<void>
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  username: string
  phone?: string
  dateOfBirth?: string
  gender?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('accessToken')
  )
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user && !!accessToken

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')
      
      if (token && refreshToken) {
        try {
          const response = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          })
          
          setUser(response.data.user)
          setAccessToken(token)
        } catch (error) {
          console.error('Auth initialization error:', error)
          // Try to refresh token
          await refreshTokens()
        }
      }
      
      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { user, accessToken, refreshToken } = response.data

      setUser(user)
      setAccessToken(accessToken)
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed')
    }
  }

  const register = async (data: RegisterData) => {
    try {
      const response = await api.post('/auth/register', data)
      const { user, accessToken, refreshToken } = response.data

      setUser(user)
      setAccessToken(accessToken)
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed')
    }
  }

  const logout = () => {
    setUser(null)
    setAccessToken(null)
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  const updateUser = async (data: Partial<User>) => {
    try {
      const response = await api.put('/users/profile', data, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      
      setUser(response.data.user)
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Profile update failed')
    }
  }

  const refreshTokens = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        throw new Error('No refresh token available')
      }

      const response = await api.post('/auth/refresh', { refreshToken })
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data

      setAccessToken(newAccessToken)
      localStorage.setItem('accessToken', newAccessToken)
      localStorage.setItem('refreshToken', newRefreshToken)

      // Get updated user data
      const userResponse = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${newAccessToken}` }
      })
      
      setUser(userResponse.data.user)
    } catch (error) {
      console.error('Token refresh failed:', error)
      logout()
    }
  }

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    refreshToken: refreshTokens
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}