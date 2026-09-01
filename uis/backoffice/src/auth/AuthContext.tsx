import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  login as apiLogin,
  register as apiRegister,
  getMe,
  getProfile,
  updateProfile as apiUpdateProfile,
  type LoginPayload,
  type RegisterPayload,
  type ProfileResponse,
  type ProfileUpdatePayload,
  type UserResponse,
  type UserWithProfileResponse,
} from './authApi'

type AuthContextValue = {
  token: string | null
  user: UserResponse | null
  profile: ProfileResponse | null
  isAuthenticated: boolean
  isAuthLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
  updateProfile: (payload: ProfileUpdatePayload) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getStoredToken(): string | null {
  return localStorage.getItem('auth_token')
}

function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem('auth_token', token)
  } else {
    localStorage.removeItem('auth_token')
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken)
  const [user, setUser] = useState<UserResponse | null>(null)
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  const clearSession = useCallback(() => {
    setStoredToken(null)
    setToken(null)
    setUser(null)
    setProfile(null)
  }, [])

  // Listen for auth:expired events from api.ts
  useEffect(() => {
    function handleExpired() {
      clearSession()
    }
    window.addEventListener('auth:expired', handleExpired)
    return () => window.removeEventListener('auth:expired', handleExpired)
  }, [clearSession])

  // On mount, try to restore session from stored token
  useEffect(() => {
    const stored = getStoredToken()

    if (!stored) {
      setIsAuthLoading(false)
      return
    }

    getMe(stored)
      .then((data: UserWithProfileResponse) => {
        setUser(data)
        setProfile(data.profile)
      })
      .catch(() => {
        clearSession()
      })
      .finally(() => {
        setIsAuthLoading(false)
      })
  }, [clearSession])

  const login = useCallback(async (payload: LoginPayload) => {
    const result = await apiLogin(payload)
    setStoredToken(result.access_token)
    setToken(result.access_token)

    const data = await getMe(result.access_token)
    setUser(data)
    setProfile(data.profile)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    // Register creates user + optional profile on the backend
    const userData = await apiRegister(payload)

    // After registration, login to get a token
    const result = await apiLogin({
      email: payload.email,
      password: payload.password,
    })

    setStoredToken(result.access_token)
    setToken(result.access_token)
    setUser(userData)

    // After login, fetch user + profile from /auth/me
    const data = await getMe(result.access_token)
    setProfile(data.profile)
  }, [])

  const logout = useCallback(() => {
    clearSession()
  }, [clearSession])

  const refreshProfile = useCallback(async () => {
    if (!token) return
    const data = await getProfile(token)
    setProfile(data)
  }, [token])

  const updateProfile = useCallback(
    async (payload: ProfileUpdatePayload) => {
      if (!token) throw new Error('Not authenticated')
      const data = await apiUpdateProfile(token, payload)
      setProfile(data)
    },
    [token],
  )

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        profile,
        isAuthenticated: !!token && !!user,
        isAuthLoading,
        login,
        register,
        logout,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}