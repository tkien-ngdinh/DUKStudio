import { findUserByToken, getDaySchedule, checkClash, isValidDate } from '../data/store.mjs';

/**
 * Register schedule and clash check routes (serving Steps G5 and G10; contract 04-schedule.md)
 * @param {import('../server.mjs').Router} router
 */
export function register(router) {
  // Order of checks for both routes: 401 (no or unknown token) -> 403 (not admin) -> 400 -> 200.
  // Returns the admin user, or answers 401 / 403 itself and returns null.
  function requireAdmin(req, res) {
    const user = findUserByToken(req.headers['authorization']);

    if (!user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Bearer token'
        }
      });
      return null;
    }

    if (user.role !== 'admin') {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Admin role required'
        }
      });
      return null;
    }

    return user;
  }

  // GET /api/schedule?date=YYYY-MM-DD
  router.get('/api/schedule', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const date = req.query && req.query.date;
    if (!isValidDate(date)) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid schedule query',
          fields: {
            date: 'Date is required in format YYYY-MM-DD'
          }
        }
      });
    }

    return res.status(200).json(getDaySchedule(date));
  });

  // POST /api/schedule/clash-check
  router.post('/api/schedule/clash-check', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    // An unparsable body arrives as a string; treat anything but an object as empty
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const result = checkClash({
      date: body.date,
      time: body.time,
      packageId: body.packageId,
      makeupArtistId: body.makeupArtistId,
      photographerId: body.photographerId,
      roomId: body.roomId,
      ignoreBookingId: body.ignoreBookingId
    });

    if (result.invalid) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid clash check payload',
          fields: result.invalid
        }
      });
    }

    return res.status(200).json(result);
  });
}
