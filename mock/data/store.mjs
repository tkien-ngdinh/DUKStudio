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
