import { findUserByCredentials, findUserByToken } from '../data/store.mjs';

/**
 * Register authentication routes
 * @param {import('../server.mjs').Router} router
 */
export function register(router) {
  // POST /api/auth/login
  router.post('/api/auth/login', async (req, res) => {
    const { email, username, password } = req.body || {};
    const login = (email || username || '').trim();

    if (!login || !password) {
      const fields = {};
      if (!login) fields.email = 'Email or username is required';
      if (!password) fields.password = 'Password is required';
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid login payload',
          fields
        }
      });
    }

    const user = findUserByCredentials(login, password);
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password'
        }
      });
    }

    // Stable token based on account id
    const baseName = user.id.replace(/^u-/, '');
    const token = `token-${baseName}`;

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  });

  // POST /api/auth/logout
  router.post('/api/auth/logout', async (req, res) => {
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });

  // GET /api/auth/me
  router.get('/api/auth/me', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const user = findUserByToken(authHeader);

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or expired authentication token'
        }
      });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  });
}
