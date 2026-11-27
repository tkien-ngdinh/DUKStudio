import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  apiFetch,
  clearStoredSession,
  getStoredSession,
  setStoredSession,
  setUnauthorizedHandler
} from '../api/client.js';

const AuthContext = createContext(null);

// Deduplicate concurrent /api/auth/me calls across React 18 StrictMode double-mounts
const inflightVerifyByToken = new Map();

function verifyTokenOnce(token) {
  if (inflightVerifyByToken.has(token)) {
    return inflightVerifyByToken.get(token);
  }
  const promise = apiFetch('/api/auth/me', { token }).finally(() => {
    inflightVerifyByToken.delete(token);
  });
  inflightVerifyByToken.set(token, promise);
  return promise;
}

/**
 * Resolve default landing route for each authenticated role
 */
export function getHomePathForRole(role) {
  switch (role) {
    case 'customer':
      return '/my-bookings';
    case 'admin':
      return '/admin/conversations';
    case 'staff':
      return '/staff/jobs';
    case 'superadmin':
      return '/superadmin/settings';
    default:
      return '/';
  }
}

export function AuthProvider({ children }) {
  const initial = getStoredSession();
  const [user, setUser] = useState(initial?.user || null);
  const [token, setToken] = useState(initial?.token || null);
  const [isInitializing, setIsInitializing] = useState(Boolean(initial?.token));
  const [sessionError, setSessionError] = useState('');
  const [authNotice, setAuthNotice] = useState('');

  // Epoch counter: incremented on every clearAuth() and login() call.
  // verifyCurrentSession() captures the epoch before its async await, then
  // discards the response if the epoch has since advanced (logout or new login
  // happened while the /api/auth/me request was in-flight).
  const authEpoch = useRef(0);

  const clearAuth = useCallback((noticeMessage = '') => {
    authEpoch.current += 1;   // invalidate any in-flight verifyCurrentSession
    clearStoredSession();
    setToken(null);
    setUser(null);
    setSessionError('');
    setAuthNotice(noticeMessage);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuth('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
    });
    return () => setUnauthorizedHandler(null);
  }, [clearAuth]);

  const verifyCurrentSession = useCallback(async () => {
    const stored = getStoredSession();
    if (!stored?.token) {
      setIsInitializing(false);
      setSessionError('');
      return;
    }

    // Capture epoch and token before the async boundary.
    // If either changes while we await, the response is stale and must be discarded.
    const epochAtStart = authEpoch.current;
    const tokenAtStart = stored.token;

    setIsInitializing(true);
    setSessionError('');
    try {
      const data = await verifyTokenOnce(stored.token);

      // Guard: abort if a logout or login happened while this request was in-flight
      if (authEpoch.current !== epochAtStart) return;
      const nowStored = getStoredSession();
      if (!nowStored || nowStored.token !== tokenAtStart) return;

      if (data?.user) {
        setUser(data.user);
        setToken(stored.token);
        setStoredSession({ token: stored.token, user: data.user });
      }
    } catch (err) {
      // Same epoch guard: only act on errors that belong to the current session
      if (authEpoch.current !== epochAtStart) return;
      if (err?.status === 401) {
        clearAuth('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
      } else {
        setSessionError(err?.message || 'Không thể xác thực phiên đăng nhập.');
      }
    } finally {
      // Only clear the spinner if we are still the active verification attempt
      if (authEpoch.current === epochAtStart) {
        setIsInitializing(false);
      }
    }
  }, [clearAuth]);

  useEffect(() => {
    verifyCurrentSession();
  }, [verifyCurrentSession]);

  const login = useCallback(async (email, password) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: { email, password }
    });
    authEpoch.current += 1;   // invalidate any in-flight verifyCurrentSession
    setStoredSession({ token: data.token, user: data.user });
    setToken(data.token);
    setUser(data.user);
    setSessionError('');
    setAuthNotice('');
    return data;
  }, []);

  const logout = useCallback(async () => {
    const currentToken = token;
    clearAuth('');
    if (currentToken) {
      try {
        await apiFetch('/api/auth/logout', {
          method: 'POST',
          token: currentToken
        });
      } catch {
        // Local session is already cleared; ignore network/mock-error failures on sign-out
      }
    }
  }, [token, clearAuth]);

  const clearNotice = useCallback(() => {
    setAuthNotice('');
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isInitializing,
    sessionError,
    authNotice,
    clearNotice,
    retrySession: verifyCurrentSession,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Shared authentication hook reading the single AuthContext
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
