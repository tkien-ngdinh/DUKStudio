import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read pristine seed data from JSON
const seedRaw = fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8');

// In-memory state
let state = JSON.parse(seedRaw);

/**
 * Reset all mock state to pristine seed data
 */
export function resetStore() {
  state = JSON.parse(seedRaw);
  return state;
}

/**
 * Retrieve reference to full state store
 */
export function getStore() {
  return state;
}

/**
 * Account name used in tokens and as user name at sign-in: the user id without "u-"
 */
function accountName(user) {
  return user.id.replace(/^u-/, '');
}

/**
 * Find user by e-mail or user name; the password must match exactly
 */
export function findUserByCredentials(login, password) {
  if (!login || !password) return null;
  const wanted = String(login).trim().toLowerCase();
  return (
    state.users.find(
      (u) =>
        ((u.email && u.email.toLowerCase() === wanted) || accountName(u) === wanted) &&
        u.password === password
    ) || null
  );
}

/**
 * Resolve user from the stable token format token-<account name> (exact match only)
 */
export function findUserByToken(token) {
  if (!token) return null;
  const clean = String(token).replace(/^Bearer\s+/i, '').trim();
  const match = clean.match(/^token-(.+)$/);
  if (!match) return null;
  return state.users.find((u) => accountName(u) === match[1]) || null;
}

/**
 * Retrieve jobs assigned to a staff member (or all if omitted)
 */
export function getJobs(staffId) {
  state.jobs = state.jobs || [];
  const list = staffId ? state.jobs.filter((j) => j.staffId === staffId) : state.jobs;
  return list.map((j) => ({
    id: j.id,
    bookingId: j.bookingId,
    role: j.role,
    service: j.service,
    customerName: j.customerName,
    date: j.date,
    time: j.time,
    location: j.location,
    status: j.status,
    previewsCount: j.previewsCount || (j.previews ? j.previews.length : 0)
  }));
}

/**
 * Find job by id
 */
export function findJobById(id) {
  state.jobs = state.jobs || [];
  return state.jobs.find((j) => j.id === id) || null;
}

/**
 * Update job status or fields
 */
export function updateJob(id, updates) {
  const job = findJobById(id);
  if (!job) return null;
  Object.assign(job, updates);
  return job;
}

/**
 * Next preview id, unique across all jobs (prev-01, prev-02, ...)
 */
export function nextPreviewId() {
  const total = (state.jobs || []).reduce((n, j) => n + (j.previews ? j.previews.length : 0), 0);
  return `prev-${String(total + 1).padStart(2, '0')}`;
}

/**
 * Add preview photo to job, and to the job's booking so the customer gallery (G9) shows it
 */
export function addJobPreview(jobId, preview) {
  const job = findJobById(jobId);
  if (!job) return null;
  job.previews = job.previews || [];
  job.previews.push(preview);
  job.previewsCount = (job.previewsCount || 0) + 1;

  const booking = (state.bookings || []).find((b) => b.id === job.bookingId);
  if (booking) {
    booking.previews = booking.previews || [];
    booking.previews.push({
      id: preview.id,
      url: preview.url,
      alt: `Ảnh xem trước ${preview.filename} (${booking.id})`
    });
  }
  return preview;
}

/**
 * List administrator accounts
 */
export function getAdminAccounts() {
  return (state.users || [])
    .filter((u) => u.role === 'admin')
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt || '2026-10-01T08:00:00Z'
    }));
}

/**
 * Create administrator account
 */
export function createAdminAccount({ name, email, password }) {
  const existing = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) return { error: 'DUPLICATE_EMAIL' };
  const baseId = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '');
  const id = `u-${baseId}`;
  const newAccount = {
    id,
    name,
    email,
    password,
    role: 'admin',
    createdAt: new Date().toISOString()
  };
  state.users.push(newAccount);
  return {
    account: {
      id: newAccount.id,
      name: newAccount.name,
      email: newAccount.email,
      role: newAccount.role,
      createdAt: newAccount.createdAt
    }
  };
}

/**
 * Get studio settings
 */
export function getSettings() {
  return state.settings || { openingHours: '08:00 - 19:00', reminderHoursBefore: 24 };
}

/**
 * Update studio settings
 */
export function updateSettings(updates) {
  state.settings = state.settings || {};
  Object.assign(state.settings, updates);
  return state.settings;
}

