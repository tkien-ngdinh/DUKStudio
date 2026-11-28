import { apiFetch } from '../api/client.js';

/**
 * GET helper for the admin screens: while a GET for the same path is in flight, every caller
 * shares it. React StrictMode mounts a page twice in development; with this the mock log
 * still shows one request per thing loaded. Nothing is cached after the answer arrives.
 */
const inflight = new Map();

export function getOnce(path, { skipAuth = false } = {}) {
  const key = `${skipAuth ? 'public' : 'auth'} ${path}`;
  if (inflight.has(key)) return inflight.get(key);
  const promise = apiFetch(path, { skipAuth }).finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}
