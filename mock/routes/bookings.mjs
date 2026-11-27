import {
  findUserByToken,
  findBooking,
  listBookingsFor,
  canViewBooking,
  createBookingFromConversation,
  updateBooking,
  setFinalLink
} from '../data/store.mjs';

function publicBooking(booking) {
  const { hasDeposit, hasFinalPayment, ...publicFields } = booking;
  return publicFields;
}

const STATUS_BY_CODE = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409
};

/**
 * Register booking routes (serving Steps G6, G7 and G10; contract 05-bookings.md)
 * @param {import('../server.mjs').Router} router
 */
export function register(router) {
  // Order of checks on every route:
  // 401 (no or unknown token) -> 403 (role, or a booking the user may not open)
  // -> 404 -> 400 with fields -> 409 -> success.

  // Returns the signed-in user when their role is one of `roles`; otherwise answers
  // 401 or 403 itself and returns null.
  function authorize(req, res, roles, deniedMessage) {
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

    if (!roles.includes(user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: deniedMessage
        }
      });
      return null;
    }

    return user;
  }

  // Answers with a store error (BAD_REQUEST, NOT_FOUND or CONFLICT) in the One Error Shape
  function sendError(res, error) {
    return res.status(STATUS_BY_CODE[error.code] || 500).json({ error });
  }

  // A body that is not a JSON object (for example broken JSON) counts as empty
  function bodyOf(req) {
    return req.body && typeof req.body === 'object' ? req.body : {};
  }

  // POST /api/bookings
  router.post('/api/bookings', async (req, res) => {
    if (!authorize(req, res, ['admin'], 'Access denied. Admin role required')) return;

    const { conversationId } = bodyOf(req);
    if (typeof conversationId !== 'string' || !conversationId.trim()) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid booking payload',
          fields: {
            conversationId: 'Conversation id is required'
          }
        }
      });
    }

    const result = createBookingFromConversation(conversationId.trim());
    if (result.error) return sendError(res, result.error);

    return res.status(201).json({ booking: publicBooking(result.booking) });
  });

  // GET /api/bookings
  router.get('/api/bookings', async (req, res) => {
    const user = authorize(req, res, ['customer', 'admin'], 'Access denied. Customer or admin role required');
    if (!user) return;

    return res.status(200).json({ bookings: listBookingsFor(user) });
  });

  // GET /api/bookings/:id
  router.get('/api/bookings/:id', async (req, res) => {
    const user = authorize(
      req,
      res,
      ['customer', 'admin', 'staff'],
      'Access denied. Customer, admin or staff role required'
    );
    if (!user) return;

    const booking = findBooking(req.params.id);
    if (!booking) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Booking ${req.params.id} not found`
        }
      });
    }

    if (!canViewBooking(user, booking)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message:
            user.role === 'customer'
              ? 'Access denied. This booking belongs to another customer'
              : 'Access denied. This booking is not assigned to you'
        }
      });
    }

    return res.status(200).json({ booking: publicBooking(booking) });
  });

  // PATCH /api/bookings/:id  (reschedule or cancel; a clash changes nothing)
  router.patch('/api/bookings/:id', async (req, res) => {
    if (!authorize(req, res, ['admin'], 'Access denied. Admin role required')) return;

    const result = updateBooking(req.params.id, bodyOf(req));
    if (result.error) return sendError(res, result.error);

    return res.status(200).json({ booking: publicBooking(result.booking) });
  });

  // POST /api/bookings/:id/final-link
  router.post('/api/bookings/:id/final-link', async (req, res) => {
    if (!authorize(req, res, ['admin'], 'Access denied. Admin role required')) return;

    const result = setFinalLink(req.params.id, bodyOf(req).url);
    if (result.error) return sendError(res, result.error);

    return res.status(200).json({ booking: result.booking });
  });
}
