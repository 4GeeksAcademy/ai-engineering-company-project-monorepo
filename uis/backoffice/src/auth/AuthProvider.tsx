import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ApiError,
  clearToken,
  fetchCurrentUser,
  getStoredToken,
  loginUser,
  storeToken,
  toUserFacingMessage,
  type AuthResponse,
  type PublicUser,
  type TokenResponse,
} from "../lib/api";
import {
  bindStaffSession,
  endStaffSession,
  flowAbandon,
  flowComplete,
  flowDrop,
  flowStart,
  trackAuthFormRejected,
  trackLoginFailed,
  trackLoginSucceeded,
  trackUiLatency,
} from "../telemetry/events";

type AuthContextValue = {
  token: string | null;
  user: PublicUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionError: string | null;
  retrySession: () => void;
  signIn: (authResponse: TokenResponse | AuthResponse) => Promise<void>;
  submitLogin: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: PublicUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionNonce, setSessionNonce] = useState(0);

  useEffect(() => {
    const savedToken = getStoredToken();
    setToken(savedToken);
    if (!savedToken) {
      setUser(null);
      setSessionError(null);
      setIsLoading(false);
      return;
    }

    const started = performance.now();
    let cancelled = false;
    flowStart("session_restore", "auth_me");
    setIsLoading(true);
    setSessionError(null);

    fetchCurrentUser()
      .then((profile) => {
        const duration = performance.now() - started;
        if (cancelled) {
          trackUiLatency("session_check", "auth_me", "cancelled", duration);
          return;
        }
        setUser(profile);
        setSessionError(null);
        if (profile?.id != null) {
          bindStaffSession(String(profile.id));
        }
        flowComplete("session_restore", "restored");
        trackUiLatency("session_check", "auth_me", "success", duration);
      })
      .catch((error: unknown) => {
        const duration = performance.now() - started;
        if (cancelled) {
          trackUiLatency("session_check", "auth_me", "cancelled", duration);
          return;
        }
        flowAbandon("session_restore", "auth_me");
        if (error instanceof ApiError && error.status === 401) {
          setToken(null);
          setUser(null);
          setSessionError(null);
          return;
        }
        setUser(null);
        setSessionError(
          toUserFacingMessage(error, "We could not check your session. Confirm the API is running."),
        );
        trackUiLatency("session_check", "auth_me", "error", duration);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      const duration = performance.now() - started;
      if (duration < 30) {
        flowDrop("session_restore");
        return;
      }
      flowAbandon("session_restore", "left");
    };
  }, [sessionNonce]);

  const retrySession = useCallback(() => {
    setSessionNonce((value) => value + 1);
  }, []);

  const signIn = useCallback(async (authResponse: TokenResponse | AuthResponse) => {
    const accessToken = authResponse?.access_token;
    if (!accessToken) {
      throw new ApiError(toUserFacingMessage(null, "Sign-in did not return a session. Try again."));
    }
    storeToken(accessToken);
    setToken(accessToken);
    setSessionError(null);
    if ("user" in authResponse && authResponse?.user) {
      setUser(authResponse.user);
      if (authResponse.user.id != null) {
        bindStaffSession(String(authResponse.user.id));
      }
      return;
    }
    try {
      const profile = await fetchCurrentUser();
      setUser(profile);
      if (profile?.id != null) {
        bindStaffSession(String(profile.id));
      }
    } catch (error) {
      endStaffSession("rejected_session");
      clearToken();
      setToken(null);
      setUser(null);
      throw error;
    }
  }, []);

  const submitLogin = useCallback(
    async (email: string, password: string) => {
      let authResponse: AuthResponse;
      try {
        authResponse = await loginUser(email, password);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          trackLoginFailed();
        }
        throw error;
      }
      if (!authResponse?.access_token || authResponse.user?.id == null) {
        trackAuthFormRejected("login", "validation", "form");
        throw new ApiError(toUserFacingMessage(null, "Sign-in did not return a session. Try again."));
      }
      await signIn(authResponse);
      trackLoginSucceeded();
    },
    [signIn],
  );

  const logout = useCallback(() => {
    endStaffSession("logout");
    clearToken();
    window.location.replace("/login");
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      isLoading,
      sessionError,
      retrySession,
      signIn,
      submitLogin,
      logout,
      setUser,
    }),
    [token, user, isLoading, sessionError, retrySession, signIn, submitLogin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
