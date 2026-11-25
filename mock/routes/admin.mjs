import { findUserByToken, getAdminAccounts, createAdminAccount, getSettings, updateSettings } from '../data/store.mjs';

/**
 * Register administration and system settings routes (serving Step G11)
 * @param {import('../server.mjs').Router} router
 */
export function register(router) {
  // Middleware check helper for superadmin role
  function requireSuperadmin(req, res) {
    const authHeader = req.headers['authorization'];
    const user = findUserByToken(authHeader);

    if (!user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or expired authentication token'
        }
      });
      return null;
    }

    if (user.role !== 'superadmin') {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Superadmin role required'
        }
      });
      return null;
    }

    return user;
  }

  // GET /api/admin/accounts
  router.get('/api/admin/accounts', async (req, res) => {
    const user = requireSuperadmin(req, res);
    if (!user) return;

    const accounts = getAdminAccounts();
    return res.status(200).json({ accounts });
  });

  // POST /api/admin/accounts
  router.post('/api/admin/accounts', async (req, res) => {
    const user = requireSuperadmin(req, res);
    if (!user) return;

    const { name, email, password } = req.body || {};
    const fields = {};

    if (!name || !name.trim()) {
      fields.name = 'Admin name is required';
    }
    if (!email || !email.includes('@')) {
      fields.email = 'Valid email address is required';
    }
    if (!password || password.length < 6) {
      fields.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(fields).length > 0) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid administrator payload',
          fields
        }
      });
    }

    const result = createAdminAccount({ name: name.trim(), email: email.trim(), password });
    if (result.error === 'DUPLICATE_EMAIL') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'An administrator account with this email already exists'
        }
      });
    }

    return res.status(201).json({
      account: result.account
    });
  });

  // GET /api/admin/settings
  router.get('/api/admin/settings', async (req, res) => {
    const user = requireSuperadmin(req, res);
    if (!user) return;

    const settings = getSettings();
    return res.status(200).json({ settings });
  });

  // PUT /api/admin/settings
  router.put('/api/admin/settings', async (req, res) => {
    const user = requireSuperadmin(req, res);
    if (!user) return;

    const { openingHours, reminderHoursBefore } = req.body || {};
    const fields = {};

    if (!openingHours || typeof openingHours !== 'string' || !openingHours.trim()) {
      fields.openingHours = 'Opening hours string is required';
    }
    if (
      reminderHoursBefore === undefined ||
      typeof reminderHoursBefore !== 'number' ||
      reminderHoursBefore < 1
    ) {
      fields.reminderHoursBefore = 'Reminder hours must be a positive integer';
    }

    if (Object.keys(fields).length > 0) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid settings payload',
          fields
        }
      });
    }

    const updated = updateSettings({
      openingHours: openingHours.trim(),
      reminderHoursBefore
    });

    return res.status(200).json({
      settings: {
        openingHours: updated.openingHours,
        reminderHoursBefore: updated.reminderHoursBefore,
        updatedAt: '2026-11-24T18:00:00Z'
      }
    });
  });
}
