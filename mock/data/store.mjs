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
 * Find user by email or username (supports demo account shortcuts)
 */
export function findUserByCredentials(login, password) {
  return state.users.find(
    (u) =>
      (u.email === login || u.id === login || u.id === `u-${login}`) &&
      (!password || u.password === password || password === `${login}-demo` || password.includes('demo'))
  );
}

/**
 * Resolve user from stable token format token-<userId> or token-<name>
 */
export function findUserByToken(token) {
  if (!token) return null;
  const clean = token.replace(/^Bearer\s+/i, '').trim();
  const match = clean.match(/^token-(.+)$/);
  if (!match) return null;
  const nameOrId = match[1];
  return (
    state.users.find(
      (u) => u.id === nameOrId || u.id === `u-${nameOrId}` || u.email.startsWith(nameOrId)
    ) || null
  );
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
 * Add preview photo to job
 */
export function addJobPreview(jobId, preview) {
  const job = findJobById(jobId);
  if (!job) return null;
  job.previews = job.previews || [];
  job.previews.push(preview);
  job.previewsCount = job.previews.length;
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

