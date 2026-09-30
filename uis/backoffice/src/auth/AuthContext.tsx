import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, fetchMe, login as apiLogin, register as apiRegister, updateMyProfile } from "../lib/api";
import { clearToken, getToken, onTokenChange, onTokenChangeInOtherTab } from "../lib/token";
import type { Me, ProfileUpdate, SignUpPayload } from "../types/auth";

/**
 * After a successful sign-up: "authenticated" = logged in; "pending" = the API refuses to log the account in
 * yet (sign-ups wait for an admin); "created" = the automatic login failed for another reason (network…).
 */
export type RegisterResult = "authenticated" | "pending" | "created";

type Status = "loading" | "anonymous" | "authenticated";

interface AuthState {
  status: Status;
  user: Me | null;
  /** True after "Cerrar sesión" (not after a 401): the guard then sends to /login without a page to return to. */
  loggedOut: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: SignUpPayload) => Promise<RegisterResult>;
  /** Re-reads the session's user and profile from GET /auth/me. */
  refreshUser: () => Promise<void>;
  /** PUT /profiles/me, then the session's user carries the saved profile. */
  saveProfile: (update: ProfileUpdate) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(getToken() ? "loading" : "anonymous");
  const [user, setUser] = useState<Me | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);

  // Restore the session from the stored token (after a reload, or a login in another tab): the token is
  // only trusted once /auth/me accepts it.
  const restoreSession = useCallback((isCancelled: () => boolean = () => false) => {
    setStatus("loading");
    fetchMe()
      .then((me) => {
        if (isCancelled()) return;
        setUser(me);
        setStatus("authenticated");
      })
      .catch(() => {
        if (isCancelled()) return;
        clearToken();
        setUser(null);
        setStatus("anonymous");
      });
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    restoreSession(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [restoreSession]);

  // Another tab logged out (or cleared storage): drop the session here too. Another tab logged in (maybe as
  // someone else): load that session.
  useEffect(
    () =>
      onTokenChangeInOtherTab((token) => {
        if (token) restoreSession();
        else {
          setUser(null);
          setStatus("anonymous");
        }
      }),
    [restoreSession],
  );

  // The API client clears the token on a 401 (expired, account removed): drop the session too.
  useEffect(
    () =>
      onTokenChange(() => {
        if (!getToken()) {
          setUser(null);
          setStatus("anonymous");
        }
      }),
    [],
  );

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    setUser(await fetchMe());
    setStatus("authenticated");
    setLoggedOut(false);
  }, []);

  // Sign up, then log straight in with the same credentials. The API creates sign-ups inactive, so
  // that login answers 401 until an admin approves the account: that is "pending", not a failure.
  const register = useCallback(
    async (payload: SignUpPayload): Promise<RegisterResult> => {
      await apiRegister(payload);
      try {
        await login(payload.email, payload.password);
        return "authenticated";
      } catch (err) {
        // The account exists either way: never report this as a failed sign-up.
        return err instanceof ApiError && err.status === 401 ? "pending" : "created";
      }
    },
    [login],
  );

  const refreshUser = useCallback(async () => {
    setUser(await fetchMe());
  }, []);

  const saveProfile = useCallback(async (update: ProfileUpdate) => {
    const profile = await updateMyProfile(update);
    setUser((current) => (current ? { ...current, profile } : current));
  }, []);

  const logout = useCallback(() => {
    setLoggedOut(true);
    clearToken();
  }, []);

  const value = useMemo(
    () => ({ status, user, loggedOut, login, register, refreshUser, saveProfile, logout }),
    [status, user, loggedOut, login, register, refreshUser, saveProfile, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
