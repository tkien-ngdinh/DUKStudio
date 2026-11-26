import { createContext, useCallback, useContext, useEffect, useState } from 'react';
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

  const clearAuth = useCallback((noticeMessage = '') => {
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

    setIsInitializing(true);
    setSessionError('');
    try {
      const data = await verifyTokenOnce(stored.token);
      if (data?.user) {
        setUser(data.user);
        setToken(stored.token);
        setStoredSession({ token: stored.token, user: data.user });
      }
    } catch (err) {
      if (err?.status === 401) {
        clearAuth('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
      } else {
        setSessionError(err?.message || 'Không thể xác thực phiên đăng nhập.');
      }
    } finally {
      setIsInitializing(false);
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
