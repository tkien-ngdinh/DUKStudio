import { getStore, findUserByToken } from '../data/store.mjs';

/**
 * Register customer reminders routes (serving Step G7)
 * @param {import('../server.mjs').Router} router
 */
export function register(router) {
  router.get('/api/reminders', async (req, res) => {
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

    if (user.role !== 'customer') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Customer role required'
        }
      });
    }

    const store = getStore();
    const customerBookings = (store.bookings || []).filter((b) => b.customerId === user.id);
    const bookingIds = new Set(customerBookings.map((b) => b.id));

    const reminders = (store.reminders || []).filter((r) => bookingIds.has(r.bookingId));

    return res.status(200).json({
      reminders
    });
  });
}
