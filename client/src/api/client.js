const AUTH_STORAGE_KEY = 'dukstudio_auth_session';

let unauthorizedHandler = null;

/**
 * Custom error matching DUKStudio's One Error Shape contract:
 * { error: { code, message, fields } }
 */
export class ApiError extends Error {
  constructor({ status, code, message, fields = {} }) {
    super(message || 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = code || 'UNKNOWN_ERROR';
    this.fields = fields && typeof fields === 'object' ? fields : {};
  }
}

/**
 * Register callback triggered whenever an authenticated request returns 401
 */
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = typeof fn === 'function' ? fn : null;
}

/**
 * Read stored { token, user } session from localStorage safely
 */
export function getStoredSession() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.token === 'string' && parsed.user) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist { token, user } session across reloads and direct route navigation
 */
export function setStoredSession(session) {
  try {
    if (!session || !session.token || !session.user) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: session.token, user: session.user })
    );
  } catch {
    // Ignore storage quota / privacy mode failures gracefully
  }
}

/**
 * Clear stored authentication session
 */
export function clearStoredSession() {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage removal errors
  }
}

/**
 * Fetch wrapper enforcing relative /api/... paths, Bearer auth header,
 * and standardized One Error Shape parsing.
 */
export async function apiFetch(path, options = {}) {
  const isValidRelativeApi =
    typeof path === 'string' &&
    (path === '/api' || path.startsWith('/api/') || path.startsWith('/api?'));
  if (!isValidRelativeApi) {
    throw new Error(`Relative /api path required; received "${String(path)}"`);
  }

  const {
    method = 'GET',
    body,
    headers: customHeaders = {},
    token: explicitToken,
    skipAuth = false,
    signal
  } = options;

  const headers = { ...customHeaders };
  const stored = getStoredSession();
  const activeToken = explicitToken ?? stored?.token;

  if (!skipAuth && activeToken && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${activeToken}`;
  }

  let payload = body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && body !== null && !isFormData && typeof body !== 'string') {
    payload = JSON.stringify(body);
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: payload,
      signal
    });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw err;
    }
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Không thể kết nối máy chủ API. Vui lòng kiểm tra mock server và thử lại.'
    });
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errShape = data?.error || {};
    const apiErr = new ApiError({
      status: response.status,
      code: errShape.code || `HTTP_${response.status}`,
      message: errShape.message || `Yêu cầu thất bại (HTTP ${response.status}).`,
      fields: errShape.fields || {}
    });

    if (
      response.status === 401 &&
      path !== '/api/auth/login' &&
      unauthorizedHandler &&
      (!activeToken || getStoredSession()?.token === activeToken)
    ) {
      unauthorizedHandler(apiErr);
    }

    throw apiErr;
  }

  return data;
}
